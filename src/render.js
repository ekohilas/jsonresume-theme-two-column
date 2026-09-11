import { buildDocument, displayUrl } from './model.js'
import { fontFaces } from './fonts.js'
import { style } from './generated/style.js'
import { icon } from './icons.js'

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c])

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const href = (url) => {
  if (!url) return null
  try {
    const parsed = new URL(String(url), 'https://example.invalid')
    if (!SAFE_SCHEMES.has(parsed.protocol)) return null
  } catch {
    return null
  }
  return escape(url)
}

/** The sliver of inline markdown people actually put in a resume.json. */
const inline = (value) =>
  escape(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')

const link = (url, content) => {
  const target = href(url)
  return target ? `<a href="${target}">${content}</a>` : content
}

const clean = (parts) => parts.filter(Boolean).join('\n')

/**
 * Body copy alternates between plain paragraphs (summaries) and en-dashed
 * ones (highlights); runs of the latter become a single list.
 */
const bodyHtml = (items) => {
  const html = []
  let bullets = []
  const flush = () => {
    if (!bullets.length) return
    html.push(
      `<ul class="highlights">${bullets
        .map((item) => `<li class="highlight">${inline(item.text)}</li>`)
        .join('')}</ul>`,
    )
    bullets = []
  }
  for (const item of items) {
    if (item.bullet) bullets.push(item)
    else {
      flush()
      html.push(`<p class="text">${inline(item.text)}</p>`)
    }
  }
  flush()
  return html.join('\n')
}

const roleHtml = (role) =>
  `<div class="role">
${clean([
  role.subheading &&
    `<p class="role__title">${link(role.url, inline(role.subheading))}</p>`,
  role.text.length && bodyHtml(role.text),
])}
</div>`

const entryHtml = (entry) => {
  const classes = ['entry', entry.align === 'right' && 'entry--right'].filter(Boolean)
  return `<article class="${classes.join(' ')}">
${clean([
  (entry.heading || entry.date) &&
    `<div class="entry__head">
<h3 class="entry__heading">${link(entry.url, inline(entry.heading))}</h3>
${entry.date ? `<span class="entry__date">${escape(entry.date)}</span>` : ''}
</div>`,
  ...entry.roles.map(roleHtml),
  entry.link &&
    `<p class="entry__link">${link(entry.link, escape(displayUrl(entry.link)))}</p>`,
])}
</article>`
}

const rowHtml = (row) =>
  `<div class="row"><dt class="row__label">${inline(row.label)}</dt>${
    row.value ? `<dd class="row__value">${inline(row.value)}</dd>` : ''
  }</div>`

const sectionHtml = (section) => `<section class="section section--${section.key}">
<h2 class="section__title"><span class="section__label">${escape(
  section.title,
)}</span></h2>
${
  section.rows.length
    ? `<dl class="rows">${section.rows.map(rowHtml).join('')}</dl>`
    : section.entries.map(entryHtml).join('\n')
}
</section>`

const contactHtml = (contact) =>
  `<li class="contact">${link(
    contact.url,
    `<span class="contact__text">${escape(contact.text)}</span>`,
  )}<span class="contact__icon">${icon(contact.icon)}</span></li>`

const mastheadHtml = (document) => `<header class="masthead">
${clean([
  (document.name || document.label) &&
    `<div class="identity">
${document.name ? `<h1 class="identity__name">${escape(document.name)}</h1>` : ''}
${document.label ? `<p class="identity__label">${escape(document.label)}</p>` : ''}
</div>`,
  document.contacts.length &&
    `<ul class="contacts">${document.contacts.map(contactHtml).join('')}</ul>`,
])}
</header>`

/** Colour overrides, keyed by the colour names the LaTeX theme defines. */
const colorsCss = (document) => {
  const declarations = Object.entries(document.colors)
    .filter(([, value]) => /^#[0-9a-f]{3,8}$/i.test(String(value)))
    .map(([name, value]) => `  --${name.replace(/[^a-z-]/gi, '')}-color: ${value};`)
  return declarations.length ? `:root {\n${declarations.join('\n')}\n}` : ''
}

/**
 * The LaTeX theme sets the details block in 11/12 and hangs it a little above the middle
 * of the 24mm band. Both only work for a handful of lines, so the size is
 * scaled down once the block would outgrow the band, and the offset is derived
 * from whatever room is left.
 */
const BAND = 68.03 // 24mm in points
const BAND_FILL = 60 // most of the band a details block may occupy

const contactsCss = ({ contacts }) => {
  const count = contacts.length
  if (!count) return ''
  const scale = Math.min(1, BAND_FILL / (count * 12))
  const leading = 12 * scale
  const top = Math.max(3, (BAND - count * leading) * 0.37)
  return `:root {
  --details-size: ${(11 * scale).toFixed(2)}pt;
  --details-leading: ${leading.toFixed(2)}pt;
  --details-top: ${top.toFixed(2)}pt;
}`
}

export const render = (resume) => {
  const document = buildDocument(resume)
  const title = document.name ? `${document.name} — Resume` : 'Resume'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
${fontFaces()}
${style}
${clean([colorsCss(document), contactsCss(document)])}
</style>
</head>
<body>
<div class="resume">
${mastheadHtml(document)}
<main class="columns">
${clean([
  document.summary && `<p class="lead">${inline(document.summary)}</p>`,
  ...document.sections.map(sectionHtml),
])}
</main>
</div>
</body>
</html>
`
}

export default { render }
