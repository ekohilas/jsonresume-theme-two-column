#!/usr/bin/env node
/**
 * Turns the stylesheet and the woff2 subsets into plain ES modules under
 * src/generated/.
 *
 * The theme used to read both straight off disk at render time, which is fine
 * under Node but not once a bundler gets hold of the package — the JSON Resume
 * registry imports themes into a Next.js build, where `./style.css` is claimed
 * by the CSS pipeline and the fonts never reach the output directory. Baking
 * them into JavaScript leaves nothing to resolve at runtime, so the theme
 * renders the same whether it is imported from node_modules, bundled by
 * webpack, or run from a checkout.
 *
 * `npm run build` runs this, and so does `prepare`, which npm invokes on
 * install, on a git-URL dependency and before publishing.
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'src', 'generated')

const banner = (source) =>
  `// Generated from ${source} by scripts/build-assets.mjs. Do not edit.\n`

const buildStyle = async () => {
  const css = await readFile(join(root, 'src', 'style.css'), 'utf8')
  // JSON.stringify, not a template literal: the stylesheet is full of CSS
  // escapes such as `content: '\2013\20'`, which a template literal would read
  // as JavaScript escapes.
  await writeFile(
    join(out, 'style.js'),
    `${banner('src/style.css')}export const style = ${JSON.stringify(css)}\n`,
  )
  return css.length
}

const buildFonts = async () => {
  const dir = join(root, 'fonts')
  const files = (await readdir(dir)).filter((name) => name.endsWith('.woff2')).sort()
  const entries = await Promise.all(
    files.map(async (name) => {
      const data = await readFile(join(dir, name))
      return `  ${JSON.stringify(name)}: ${JSON.stringify(data.toString('base64'))},`
    }),
  )
  await writeFile(
    join(out, 'fonts.js'),
    `${banner('fonts/*.woff2')}export const fontData = {\n${entries.join('\n')}\n}\n`,
  )
  return files
}

await mkdir(out, { recursive: true })
const [css, fonts] = await Promise.all([buildStyle(), buildFonts()])
console.log(`src/generated/style.js (${css} bytes of CSS)`)
console.log(`src/generated/fonts.js (${fonts.length} faces: ${fonts.join(', ')})`)
