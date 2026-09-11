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

test('meta.twoColumn.colors overrides the palette, and only with colours', () => {
  const html = render({
    basics: { name: 'A' },
    meta: { twoColumn: { colors: { section: '#205081', heading: 'url(evil)' } } },
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
  assert.ok(!/<link\b/.test(html), 'the document should pull in nothing external')
})
