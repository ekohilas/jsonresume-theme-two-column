#!/usr/bin/env node
/**
 * Renders a resume with this theme, for looking at while working on it.
 *
 *   npm run render                        -> preview/resume.html, sample resume
 *   npm run render -- path/to/resume.json -> preview/resume.html
 *   npm run render -- resume.json out.html
 *
 * The sample is @jsonresume/sample-data's complete resume: every section the
 * schema defines, which is also what the registry's QA gate renders.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '../index.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [source, target] = process.argv.slice(2)

const resume = source
  ? JSON.parse(await readFile(resolve(source), 'utf8'))
  : (await import('@jsonresume/sample-data')).completeResume

const output = resolve(target ?? join(root, 'preview', 'resume.html'))
await mkdir(dirname(output), { recursive: true })
await writeFile(output, render(resume))
console.log(`wrote ${output}`)
