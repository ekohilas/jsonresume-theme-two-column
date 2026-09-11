import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../index.js'

test('escapes resume content into the document', () => {
  const html = render({ basics: { name: '<script>alert(1)</script>' } })
  assert.ok(!html.includes('<script>alert(1)</script>'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
})

test('drops hrefs that are not http, https, mailto or tel', () => {
  const html = render({
    work: [{ name: 'Acme', url: 'javascript:alert(1)', position: 'Engineer' }],
  })
  assert.ok(!html.includes('javascript:'))
  assert.ok(html.includes('Acme'))
})

test('keeps the hrefs that are', () => {
  const html = render({ work: [{ name: 'Acme', url: 'https://example.com' }] })
  assert.ok(html.includes('href="https://example.com"'))
})

test('renders the inline markdown a resume.json actually carries', () => {
  const html = render({
    work: [{ name: 'Acme', summary: 'Ran **all** of `it`, *mostly*.' }],
  })
  assert.ok(html.includes('<strong>all</strong>'))
  assert.ok(html.includes('<code>it</code>'))
  assert.ok(html.includes('<em>mostly</em>'))
})

test('markdown cannot smuggle markup past the escaper', () => {
  const html = render({ work: [{ name: 'A', summary: '**<img src=x onerror=1>**' }] })
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('<strong>&lt;img'))
})

test('meta["two-column"].colors overrides the palette, and only with colours', () => {
  const html = render({
    basics: { name: 'A' },
    meta: { 'two-column': { colors: { section: '#205081', heading: 'url(evil)' } } },
  })
  assert.ok(html.includes('--section-color: #205081;'))
  assert.ok(!html.includes('url(evil)'))
})

test('the masthead details block scales to the number of contact lines', () => {
  const sizeOf = (html) => /--details-size: ([\d.]+)pt/.exec(html)?.[1]
  const few = render({ basics: { name: 'A', email: 'a@b.c' } })
  const many = render({
    basics: {
      name: 'A',
      email: 'a@b.c',
      phone: '1',
      url: 'https://e.com',
      location: { city: 'Sydney' },
      profiles: Array.from({ length: 6 }, (_, i) => ({
        network: 'GitHub',
        url: `https://github.com/${i}`,
      })),
    },
  })
  assert.equal(sizeOf(few), '11.00')
  assert.ok(Number(sizeOf(many)) < 11, 'a crowded masthead should set smaller type')
})

test('inlines the fonts, so a render needs no network', () => {
  const html = render({ basics: { name: 'A' } })
  assert.equal(html.match(/@font-face/g).length, 5)
  assert.ok(html.includes('src: url(data:font/woff2;base64,'))
  assert.ok(!/<link\b|<script\b|<img\b/.test(html), 'nothing external without an image')
})

test('basics.image is set as a photo, to the left of the name', () => {
  const html = render({
    basics: { name: 'A', image: 'https://example.com/me.png' },
  })
  const masthead = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  assert.match(masthead, /<img class="photo" src="https:\/\/example\.com\/me\.png" alt="">/)
  // Source order decides which side of the name it lands on.
  assert.ok(masthead.indexOf('class="photo"') < masthead.indexOf('identity__name'))
})

test('a photo is the one thing that can reach the network, and only over http(s) or data:', () => {
  for (const image of ['https://e.com/a.png', 'http://e.com/a.png', 'data:image/png;base64,AAA']) {
    assert.match(render({ basics: { name: 'A', image } }), /<img class="photo"/)
  }
  for (const image of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd']) {
    assert.ok(
      !/<img/.test(render({ basics: { name: 'A', image } })),
      `${image} should not become a photo`,
    )
  }
})

test('basics.summary runs full width under the name and the contacts', () => {
  const html = render({
    basics: {
      name: 'A',
      label: 'B',
      email: 'a@b.c',
      summary: 'Ran **things**.',
    },
  })
  const masthead = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  assert.ok(masthead.includes('Ran <strong>things</strong>.'), 'it keeps its markdown')
  assert.ok(!html.includes('<p class="lead">'), 'it no longer leads the columns')

  // It is a row of the masthead, not part of .identity: it follows the whole
  // top row, contacts included, which is what puts it under both of them.
  const at = (c) => masthead.indexOf(c)
  assert.ok(at('masthead__top') < at('masthead__summary'))
  assert.ok(at('identity__name') < at('masthead__summary'))
  assert.ok(at('contacts') < at('masthead__summary'), 'it comes after the links')
  assert.ok(at('</div>') < at('masthead__summary'), 'the top row is closed first')
})

test('the photo sits in the top row, level with the name', () => {
  const html = render({
    basics: { name: 'A', image: 'https://e.com/p.png', summary: 'S.' },
  })
  // From the markup, not the inlined stylesheet, which also names these classes.
  const masthead = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  const top = masthead.slice(0, masthead.indexOf('masthead__summary'))
  assert.ok(top.includes('class="photo"'), 'the photo belongs to the top row')
  assert.ok(top.indexOf('class="photo"') < top.indexOf('identity__name'))
})

test('the masthead is untouched when there is no summary to hold', () => {
  const html = render({ basics: { name: 'A', label: 'B' } })
  const masthead = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  assert.ok(!masthead.includes('masthead__summary'))
  assert.match(masthead, /<div class="identity">/)
})
