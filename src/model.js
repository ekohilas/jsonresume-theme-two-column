/**
 * Turns a JSON Resume document into the flat shape the mdcv layout draws:
 * a masthead plus an ordered list of sections, each holding either `entries`
 * (heading / date / roles) or `rows` (a label-value table, used for skills).
 *
 * The vocabulary mirrors two-column-cv.sty: an entry has a `heading` (green),
 * a `date` (grey, flush right), one or more `subheading` lines (black) and
 * body `text` (grey).
 */

const DEFAULT_LABELS = {
  work: 'Work Experience',
  education: 'Education',
  volunteer: 'Volunteering',
  projects: 'Recent Personal Projects',
  publications: 'Conference Talks',
  skills: 'Skills & Interests',
  awards: 'Awards',
  certificates: 'Certificates',
  references: 'References',
}

const DEFAULT_ORDER = [
  'work',
  'education',
  'volunteer',
  'projects',
  'publications',
  'awards',
  'certificates',
  'skills',
  'references',
]

const DEFAULT_CONTACTS = ['email', 'phone', 'url', 'profiles', 'location']

const nonEmpty = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])

const joinParts = (parts, separator = ', ') => nonEmpty(parts).join(separator)

/** mdcv only ever prints years, whatever precision the source dates carry. */
const year = (date) => {
  const match = /^\s*(\d{4})/.exec(String(date ?? ''))
  return match ? match[1] : null
}

/**
 * Widest span covered by a set of periods — one job, or every talk given at
 * the same conference. A period that has started but not ended is open.
 */
const spanOf = (periods, present) => {
  const years = nonEmpty(periods.flatMap(({ start, end }) => [year(start), year(end)]))
  if (!years.length) return ''
  const open = periods.some(({ start, end }) => year(start) && !year(end))
  years.sort()
  const from = years[0]
  if (open) return present ? `${from} - ${present}` : from
  const to = years[years.length - 1]
  return from === to ? from : `${from} - ${to}`
}

const location = (place) =>
  place ? joinParts([place.city, place.region ?? place.countryCode]) : ''

/**
 * Collapses repeats of the same heading into a single entry holding several
 * roles — "PyCon Australia / Assistant Conference Director / Track Organiser".
 * `scope: 'adjacent'` only merges neighbours, so two separate stints at one
 * employer stay apart; `scope: 'all'` merges wherever they appear, which is
 * what the talks section wants.
 */
const groupByHeading = (entries, scope = 'adjacent') => {
  const groups = []
  const byHeading = new Map()
  for (const entry of entries) {
    const previous =
      scope === 'all' ? byHeading.get(entry.heading) : groups[groups.length - 1]
    if (entry.heading && previous && previous.heading === entry.heading) {
      previous.roles.push(...entry.roles)
      previous.periods.push(...entry.periods)
      previous.url ??= entry.url
      previous.link ??= entry.link
      continue
    }
    groups.push(entry)
    if (entry.heading) byHeading.set(entry.heading, entry)
  }
  return groups
}

const hasContent = (entry) =>
  Boolean(entry.heading) ||
  entry.roles.some((role) => role.subheading || role.text.length)

const finalise = (entries, present) =>
  entries
    .filter(hasContent)
    .map((entry) => ({ ...entry, date: spanOf(entry.periods, present) }))

const role = (subheading, text = [], url = null) => ({
  subheading: subheading || null,
  url,
  text: nonEmpty(text),
})

/** Summary first, then highlights as en-dashed paragraphs, as mdcv prints them. */
const body = (summary, highlights) => [
  ...(summary ? [{ text: summary }] : []),
  ...nonEmpty(highlights).map((highlight) => ({ text: highlight, bullet: true })),
]

const workSection = (work) =>
  groupByHeading(
    work.map((job) => ({
      heading: joinParts([job.name ?? job.company, job.location]),
      url: job.url,
      periods: [{ start: job.startDate, end: job.endDate }],
      roles: [role(job.position, body(job.summary, job.highlights), job.url)],
    })),
  )

const volunteerSection = (volunteer) =>
  groupByHeading(
    volunteer.map((post) => ({
      heading: post.organization,
      url: post.url,
      periods: [{ start: post.startDate, end: post.endDate }],
      roles: [role(post.position, body(post.summary, post.highlights), post.url)],
    })),
  )

const educationSection = (education) =>
  groupByHeading(
    education.map((school) => ({
      heading: school.institution,
      url: school.url,
      periods: [{ start: school.startDate, end: school.endDate }],
      roles: [
        role(
          joinParts(
            [school.area || school.studyType, school.score && `w/${school.score}`],
            ' ',
          ),
          nonEmpty(school.courses).map((course) => ({ text: course, bullet: true })),
        ),
      ],
    })),
  )

const projectsSection = (projects) =>
  groupByHeading(
    projects.map((project) => ({
      heading: project.name,
      url: project.url,
      link: project.url,
      align: 'right',
      periods: [{ start: project.startDate, end: project.endDate }],
      roles: [role(null, body(project.description, project.highlights))],
    })),
  )

const publicationsSection = (publications) =>
  groupByHeading(
    publications.map((publication) => ({
      heading: publication.publisher || publication.name,
      periods: [{ start: publication.releaseDate, end: publication.releaseDate }],
      roles: [
        publication.publisher
          ? role(publication.name, [], publication.url)
          : role(null, body(publication.summary), publication.url),
      ],
    })),
    'all',
  )

const awardsSection = (awards) =>
  awards.map((award) => ({
    heading: award.awarder,
    periods: [{ start: award.date, end: award.date }],
    roles: [role(award.title, body(award.summary))],
  }))

const certificatesSection = (certificates) =>
  certificates.map((certificate) => ({
    heading: certificate.issuer,
    url: certificate.url,
    link: certificate.url,
    periods: [{ start: certificate.date, end: certificate.date }],
    roles: [role(certificate.name)],
  }))

const referencesSection = (references) =>
  references.map((reference) => ({
    heading: reference.name,
    periods: [],
    roles: [role(null, body(reference.reference))],
  }))

/** skills, languages and interests share one label-value table in mdcv. */
const skillRows = ({ skills = [], languages = [], interests = [] }) => [
  ...nonEmpty(skills).map((skill) => ({
    label: joinParts(skill.keywords) || skill.name,
    value: skill.level,
  })),
  ...nonEmpty(languages).map((language) => ({
    label: language.language,
    value: language.fluency,
  })),
  ...nonEmpty(interests).map((interest) => ({
    label: interest.name,
    value: joinParts(interest.keywords),
  })),
]

const BUILDERS = {
  work: (resume) => ({ entries: workSection(nonEmpty(resume.work)) }),
  education: (resume) => ({ entries: educationSection(nonEmpty(resume.education)) }),
  volunteer: (resume) => ({ entries: volunteerSection(nonEmpty(resume.volunteer)) }),
  projects: (resume) => ({ entries: projectsSection(nonEmpty(resume.projects)) }),
  publications: (resume) => ({
    entries: publicationsSection(nonEmpty(resume.publications)),
  }),
  awards: (resume) => ({ entries: awardsSection(nonEmpty(resume.awards)) }),
  certificates: (resume) => ({
    entries: certificatesSection(nonEmpty(resume.certificates)),
  }),
  references: (resume) => ({ entries: referencesSection(nonEmpty(resume.references)) }),
  skills: (resume) => ({ rows: skillRows(resume) }),
}

/** Strip the scheme and any trailing slash, the way mdcv prints links. */
export const displayUrl = (url) =>
  String(url ?? '')
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')

const contactsOf = (basics, kinds) => {
  const contacts = []
  for (const kind of kinds) {
    if (kind === 'email' && basics.email) {
      contacts.push({ icon: 'email', text: basics.email, url: `mailto:${basics.email}` })
    } else if (kind === 'phone' && basics.phone) {
      contacts.push({
        icon: 'phone',
        text: basics.phone,
        url: `tel:${basics.phone.replace(/[^+\d]/g, '')}`,
      })
    } else if (kind === 'url' && basics.url) {
      contacts.push({ icon: 'website', text: displayUrl(basics.url), url: basics.url })
    } else if (kind === 'profiles') {
      for (const profile of nonEmpty(basics.profiles)) {
        const text = profile.url
          ? displayUrl(profile.url)
          : joinParts([profile.network, profile.username], '/')
        if (text) contacts.push({ icon: profile.network, text, url: profile.url })
      }
    } else if (kind === 'location' && location(basics.location)) {
      contacts.push({ icon: 'location', text: location(basics.location) })
    }
  }
  return contacts
}

export const buildDocument = (resume = {}) => {
  const basics = resume.basics ?? {}
  const options = resume.meta?.twoColumn ?? resume.meta?.['two-column'] ?? {}
  const labels = { ...DEFAULT_LABELS, ...options.labels }
  const order = nonEmpty(options.order).length ? options.order : DEFAULT_ORDER
  const contactKinds = nonEmpty(options.contacts).length
    ? options.contacts
    : DEFAULT_CONTACTS
  const present = options.present ?? 'Present'

  const sections = []
  for (const key of order) {
    const build = BUILDERS[key]
    if (!build) continue
    const { entries = [], rows = [] } = build(resume)
    const section = {
      key,
      title: labels[key] ?? key,
      entries: finalise(entries, present),
      rows: rows.filter((row) => row.label),
    }
    if (section.entries.length || section.rows.length) sections.push(section)
  }

  return {
    name: basics.name ?? '',
    label: basics.label ?? '',
    summary: basics.summary ?? '',
    contacts: contactsOf(basics, contactKinds),
    sections,
    colors: options.colors ?? {},
  }
}
