import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completeResume, minimalResume } from '@jsonresume/sample-data'
import * as theme from '../index.js'
import {
  SECTION_SENTINELS,
  assertSentinelsCover,
  assertThemeRender,
} from './registry-gate.js'

/**
 * The registry loads a theme with `await import(specifier)` and then calls
 * `themeRenderer.render(resume)` straight away, so `render` has to sit on the
 * module namespace (or on its default export) and return a string rather than
 * a promise. See getTheme.js and format.js in jsonresume/jsonresume.org.
 */
test('exposes render the way the registry resolves it', () => {
  assert.equal(typeof theme.render, 'function')
  assert.equal(typeof theme.default.render, 'function')
  assert.equal(typeof theme.render(minimalResume), 'string')
})

test('passes the registry render QA gate on the complete resume', () => {
  assertSentinelsCover(completeResume)
  const coverage = assertThemeRender(theme.render(completeResume), 'two-column')

  // The gate only insists on basics/work/education/skills. This theme draws
  // every section the fixture populates, so hold it to that.
  const missing = Object.keys(SECTION_SENTINELS).filter((key) => !coverage[key])
  assert.deepEqual(missing, [], `sections missing from the render: ${missing}`)
})

test('renders a resume that only fills in the basics', () => {
  const html = theme.render(minimalResume)
  assert.match(html, /^<!doctype html>/)
  assert.ok(html.includes(minimalResume.basics.name))
})

test('renders an empty resume without throwing', () => {
  for (const resume of [{}, { basics: {} }, { work: [], skills: [] }]) {
    const html = theme.render(resume)
    assert.match(html, /^<!doctype html>/)
    assert.ok(!html.includes('undefined'), 'leaked an undefined into the output')
  }
})

test('survives the null-ish entries a hand-written resume.json produces', () => {
  const html = theme.render({
    basics: { name: 'A', profiles: [null, { network: 'GitHub' }] },
    work: [null, { name: 'B' }, {}],
    skills: [null, { name: 'C' }],
  })
  assert.ok(html.includes('>A<'))
  assert.ok(!html.includes('undefined') && !html.includes('null'))
})

/**
 * The registry imports themes into a Next.js build (themeConfig.js holds a
 * static specifier per theme so webpack can bundle them). A bundled module
 * cannot read its own package off disk: `./style.css` is claimed by Next's CSS
 * pipeline, and the woff2 subsets never reach the output directory. So the
 * stylesheet and the fonts are baked into src/generated/ at build time and
 * nothing under src/ is allowed to touch the filesystem.
 */
test('the shipped source reads nothing at runtime', async () => {
  const { readdir, readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true })
    const found = await Promise.all(
      entries.map((entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) return walk(path)
        return entry.name.endsWith('.js') ? [path] : []
      }),
    )
    return found.flat()
  }

  const sources = [
    new URL('../index.js', import.meta.url).pathname,
    ...(await walk(new URL('../src', import.meta.url).pathname)),
  ]

  for (const path of sources) {
    const source = await readFile(path, 'utf8')
    assert.ok(!/\bnode:fs\b|\brequire\(['"]fs['"]\)/.test(source), `${path} imports fs`)
    assert.ok(!/import\.meta\.url/.test(source), `${path} resolves a path at runtime`)
  }
})
