/**
 * The render QA gate the JSON Resume registry holds every theme to.
 *
 * Mirrors apps/registry/lib/formatters/template/themeRenderQa.js and its
 * helpers in @jsonresume/theme-kit (jsonresume/jsonresume.org). The constants
 * below are copied from there; the package itself is not a dependency because
 * it peer-depends on @jsonresume/core, which pulls React, react-dom and
 * styled-components in for an SSR helper this theme has no use for.
 *
 * Only the fixture is taken from upstream, as @jsonresume/sample-data — that
 * is the part that cannot be restated without drifting. `assertSentinelsCover`
 * checks the sentinel table still accounts for every section the fixture
 * populates, so a section added upstream fails here rather than going untested.
 */
import assert from 'node:assert/strict'

// Section -> strings that appear in the fixture for exactly that section. A
// section counts as covered if ANY of its sentinels reaches the HTML, because
// themes legitimately draw different fields of the same entry.
export const SECTION_SENTINELS = {
  basics: ['Jane Developer', 'Full Stack Software Engineer'],
  work: ['Senior Software Engineer', 'microservices architecture serving'],
  volunteer: [
    'Code for America',
    'Volunteer Software Engineer',
    'benefits eligibility screener',
  ],
  education: [
    'University of California, Berkeley',
    'Bachelor of Science',
    'Computer Science',
  ],
  awards: ['Top Contributor Award', 'top contributor to open source'],
  certificates: [
    'AWS Certified Solutions Architect',
    'Amazon Web Services',
    'Certified Kubernetes Administrator',
  ],
  publications: ['Scaling Microservices Without Losing Your Mind', 'ACM Queue'],
  skills: ['PostgreSQL'],
  languages: ['Spanish', 'Professional working proficiency', 'Native speaker'],
  interests: ['Community Building', 'Web Performance'],
  references: [
    'Sarah Johnson, Founder at StartupXYZ',
    'exceptional engineer who consistently',
    'Working with Jane was a pleasure',
  ],
  projects: ['Open Source UI Library', '5,000+ GitHub stars'],
}

/** Sections the registry fails a theme for dropping. */
export const BASELINE_SECTIONS = ['basics', 'work', 'education', 'skills']

/** Raw render artifacts that must never reach the output. */
const ARTIFACTS = [
  ['[object Object]', (html) => html.includes('[object Object]')],
  ['undefined', (html) => /\bundefined\b/.test(html)],
  ['NaN', (html) => /\bNaN\b/.test(html)],
]

export const findArtifacts = (html) =>
  ARTIFACTS.filter(([, test]) => test(html)).map(([label]) => label)

export const sectionCoverage = (html) =>
  Object.fromEntries(
    Object.entries(SECTION_SENTINELS).map(([section, sentinels]) => [
      section,
      sentinels.some((sentinel) => html.includes(sentinel)),
    ]),
  )

/** Fails if the fixture has grown a section the table above says nothing about. */
export const assertSentinelsCover = (fixture) => {
  const sections = Object.keys(fixture).filter((key) => key !== 'meta')
  const unlisted = sections.filter((key) => !(key in SECTION_SENTINELS))
  assert.deepEqual(
    unlisted,
    [],
    `the fixture gained ${unlisted}; add sentinels so they are covered too`,
  )
}

/** The gate's own assertions. Returns the coverage map. */
export const assertThemeRender = (html, name = 'theme') => {
  assert.ok(
    typeof html === 'string' && html.length > 0,
    `theme "${name}" rendered empty HTML`,
  )

  const artifacts = findArtifacts(html)
  assert.deepEqual(artifacts, [], `theme "${name}" emitted raw artifacts: ${artifacts}`)

  const coverage = sectionCoverage(html)
  for (const section of BASELINE_SECTIONS) {
    assert.ok(coverage[section], `theme "${name}" missing BASELINE section "${section}"`)
  }
  return coverage
}
