#!/usr/bin/env node
/**
 * Packs the theme and renders a resume out of the tarball.
 *
 * src/generated/ is built by `prepare` rather than committed, and `files`
 * decides what reaches npm, so the failure mode this guards against is a
 * package that installs cleanly and then cannot render — no stylesheet, no
 * fonts, or a source file left out of `files` entirely. Checking the file list
 * would not catch the last one, so this installs the tarball and renders with
 * it, which is what a consumer does.
 */
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npm = (args, cwd) =>
  execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

/**
 * `npm pack` runs `prepare`, and the lifecycle script's own output lands on the
 * same stdout as the --json payload, so take the document rather than the whole
 * stream.
 */
const packJson = (args) => {
  const output = npm(['pack', '--json', ...args], root)
  const start = output.indexOf('[')
  if (start < 0) throw new Error(`npm pack printed no JSON:\n${output}`)
  return JSON.parse(output.slice(start))
}

const REQUIRED = [
  'index.js',
  'package.json',
  'README.md',
  'LICENSE',
  'src/render.js',
  'src/model.js',
  'src/icons.js',
  'src/fonts.js',
  'src/generated/style.js',
  'src/generated/fonts.js',
  'fonts/LICENSE-DejaVu.txt',
  'fonts/LICENSE-Oswald.txt',
]

const [{ files, filename }] = packJson(['--dry-run'])
const packed = new Set(files.map((file) => file.path))
const missing = REQUIRED.filter((path) => !packed.has(path))
if (missing.length) {
  console.error(`Missing from the tarball:\n  ${missing.join('\n  ')}`)
  process.exit(1)
}

const scratch = await mkdtemp(join(tmpdir(), 'two-column-pack-'))
try {
  const tarball = join(scratch, filename)
  packJson(['--pack-destination', scratch])
  await writeFile(join(scratch, 'package.json'), '{"name":"scratch","private":true}\n')
  npm(['install', '--no-audit', '--no-fund', tarball], scratch)

  const entry = join(scratch, 'node_modules', 'jsonresume-theme-two-column', 'index.js')
  const { render } = await import(pathToFileURL(entry).href)
  const html = render({
    basics: { name: 'Jane Developer', email: 'jane@example.com' },
    work: [{ name: 'Acme', position: 'Engineer', startDate: '2020' }],
  })

  const checks = {
    'a complete document': html.startsWith('<!doctype html>'),
    'the inlined fonts': html.includes('src: url(data:font/woff2;base64,'),
    'the stylesheet': html.includes('--section-color:'),
    'the resume itself': html.includes('Jane Developer') && html.includes('Acme'),
  }
  const absent = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([what]) => what)
  if (absent.length) {
    console.error(`The packed theme rendered without:\n  ${absent.join('\n  ')}`)
    process.exit(1)
  }

  console.log(`${filename}: ${files.length} files, renders from a clean install.`)
} finally {
  await rm(scratch, { recursive: true, force: true })
}
