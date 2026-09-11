import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDocument, displayUrl } from '../src/model.js'

const titles = (document) => document.sections.map((section) => section.title)
const section = (document, key) => document.sections.find((s) => s.key === key)

test('prints years only, whatever precision the dates carry', () => {
  const work = section(
    buildDocument({
      work: [
        { name: 'A', startDate: '2019-03-01', endDate: '2021-11' },
        { name: 'B', startDate: '2022-01-05', endDate: '2022-12-31' },
      ],
    }),
    'work',
  )
  assert.deepEqual(
    work.entries.map((entry) => entry.date),
    ['2019 - 2021', '2022'],
  )
})

test('an open period runs to Present, or to whatever meta says', () => {
  const open = { work: [{ name: 'A', startDate: '2024-01' }] }
  assert.equal(section(buildDocument(open), 'work').entries[0].date, '2024 - Present')

  const renamed = { ...open, meta: { 'two-column': { present: 'Now' } } }
  assert.equal(section(buildDocument(renamed), 'work').entries[0].date, '2024 - Now')

  const bare = { ...open, meta: { 'two-column': { present: '' } } }
  assert.equal(section(buildDocument(bare), 'work').entries[0].date, '2024')
})

test('adjacent roles at one employer collapse into a single entry', () => {
  const work = section(
    buildDocument({
      work: [
        { name: 'Acme', position: 'Engineer', startDate: '2020', endDate: '2022' },
        { name: 'Acme', position: 'Senior Engineer', startDate: '2022', endDate: '2024' },
        { name: 'Other', position: 'Engineer', startDate: '2018', endDate: '2020' },
      ],
    }),
    'work',
  )
  assert.equal(work.entries.length, 2)
  assert.deepEqual(
    work.entries[0].roles.map((role) => role.subheading),
    ['Engineer', 'Senior Engineer'],
  )
  assert.equal(work.entries[0].date, '2020 - 2024')
})

test('publications group by publisher wherever they appear', () => {
  const talks = section(
    buildDocument({
      publications: [
        { name: 'One', publisher: 'PyCon', releaseDate: '2019-08' },
        { name: 'Two', publisher: 'Other', releaseDate: '2020-01' },
        { name: 'Three', publisher: 'PyCon', releaseDate: '2023-08' },
      ],
    }),
    'publications',
  )
  assert.equal(talks.entries.length, 2)
  assert.equal(talks.entries[0].heading, 'PyCon')
  assert.equal(talks.entries[0].date, '2019 - 2023')
  assert.deepEqual(
    talks.entries[0].roles.map((role) => role.subheading),
    ['One', 'Three'],
  )
})

test('skills, languages and interests share one table', () => {
  const skills = section(
    buildDocument({
      skills: [{ name: 'Web', keywords: ['HTML', 'CSS'], level: 'Advanced' }],
      languages: [{ language: 'Greek', fluency: 'Native' }],
      interests: [{ name: 'Cycling', keywords: ['Touring'] }],
    }),
    'skills',
  )
  assert.deepEqual(skills.rows, [
    { label: 'HTML, CSS', value: 'Advanced' },
    { label: 'Greek', value: 'Native' },
    { label: 'Cycling', value: 'Touring' },
  ])
})

test('empty sections are dropped rather than drawn as a bare rule', () => {
  const document = buildDocument({ work: [], education: [{ institution: 'UNSW' }] })
  assert.deepEqual(titles(document), ['Education'])
})

test('meta["two-column"] overrides labels, order and contacts', () => {
  const resume = {
    basics: { email: 'a@b.c', phone: '+61 400 000 000', url: 'https://example.com' },
    work: [{ name: 'A' }],
    education: [{ institution: 'B' }],
    projects: [{ name: 'C' }],
    meta: {
      'two-column': {
        labels: { projects: 'Projects' },
        order: ['projects', 'work'],
        contacts: ['email'],
      },
    },
  }
  const document = buildDocument(resume)
  assert.deepEqual(titles(document), ['Projects', 'Work Experience'])
  assert.deepEqual(
    document.contacts.map((contact) => contact.text),
    ['a@b.c'],
  )
})

test('the old meta.twoColumn spelling is not read', () => {
  const document = buildDocument({
    work: [{ name: 'A' }],
    meta: { twoColumn: { labels: { work: 'Jobs' } } },
  })
  assert.deepEqual(titles(document), ['Work Experience'])
})

test('basics.image reaches the document, for the masthead photo', () => {
  const image = 'https://example.com/me.png'
  assert.equal(buildDocument({ basics: { image } }).image, image)
  assert.equal(buildDocument({ basics: {} }).image, '')
})

test('contacts carry a usable href', () => {
  const document = buildDocument({
    basics: {
      email: 'a@b.c',
      phone: '+61 400 000 000',
      url: 'https://example.com/',
      profiles: [{ network: 'GitHub', url: 'https://github.com/ekohilas' }],
      location: { city: 'Sydney', region: 'NSW' },
    },
  })
  assert.deepEqual(document.contacts, [
    { icon: 'email', text: 'a@b.c', url: 'mailto:a@b.c' },
    { icon: 'phone', text: '+61 400 000 000', url: 'tel:+61400000000' },
    { icon: 'website', text: 'example.com', url: 'https://example.com/' },
    { icon: 'GitHub', text: 'github.com/ekohilas', url: 'https://github.com/ekohilas' },
    { icon: 'location', text: 'Sydney, NSW' },
  ])
})

test('displayUrl strips the scheme, any www and a trailing slash', () => {
  assert.equal(displayUrl('https://www.example.com/a/'), 'example.com/a')
  assert.equal(displayUrl(undefined), '')
})
