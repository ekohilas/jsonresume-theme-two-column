# jsonresume-theme-two-column

A dense, two-column [JSON Resume](https://jsonresume.org) theme: a port of a
two-column LaTeX CV theme, reproduced closely enough that the two PDFs line up
within about a point.

- A4, 5mm margins, a 24mm full-bleed masthead and two 272pt columns 8mm apart.
- Oswald for the name and section headings, DejaVu Serif Condensed for body
  copy, DejaVu Sans Mono for contact details and links.
- Fonts are subset and inlined, so a rendered resume is one portable file with
  no network requests.

## Usage

### On the registry

Publishing to npm is necessary but not sufficient: the hosted registry renders
only the themes it has been taught. It maps each slug to a static import in
`apps/registry/lib/formatters/template/themeConfig.js` and carries the package
as a dependency of `apps/registry/package.json`, where a good third of the
themes are ordinary npm releases rather than packages kept in that monorepo.

Ask for it with a 🎨 Theme Request issue on [jsonresume/jsonresume.org][repo],
or open the pull request yourself — `themeConfig.js`,
`packages/theme-config/src/metadata.js`, `apps/registry/package.json` and a
changeset. The issue form requires confirming the theme does not touch the
filesystem, which is what `src/generated/` below is for.

Once it is registered:

```json
{
  "meta": {
    "theme": "two-column"
  }
}
```

[repo]: https://github.com/jsonresume/jsonresume.org

### From a CLI

The theme is an ES module exposing the standard `render(resume)` entry point,
so any modern JSON Resume CLI can drive it:

```sh
npm install jsonresume-theme-two-column resumed
npx resumed render resume.json --theme jsonresume-theme-two-column --output resume.html
```

### From your own code

```js
import { render } from 'jsonresume-theme-two-column'

const html = render(JSON.parse(await readFile('resume.json', 'utf8')))
```

`render` is synchronous and returns a complete HTML document — stylesheet,
fonts and all — with nothing left to fetch.

Print with **background graphics on** and **margins set to none** — the page
box is sized by the stylesheet, and the masthead needs to bleed.

## How JSON Resume maps onto the layout

Each section draws a list of entries. An entry has a black heading, a grey date
flush right, one or more black subheadings, and grey body copy; summaries are
set as plain paragraphs and highlights as en-dashed ones.

| Section        | Title                      | Heading            | Date                   | Subheading       | Body                    |
| -------------- | -------------------------- | ------------------ | ---------------------- | ---------------- | ----------------------- |
| `work`         | Work Experience            | `name`, `location` | `startDate`–`endDate`  | `position`       | `summary`, `highlights` |
| `education`    | Education                  | `institution`      | `startDate`–`endDate`  | `area` w/`score` | `courses`               |
| `volunteer`    | Volunteering               | `organization`     | `startDate`–`endDate`  | `position`       | `summary`, `highlights` |
| `projects`     | Recent Personal Projects   | `name`             | `startDate`–`endDate`  | —                | `description`, `url`    |
| `publications` | Conference Talks           | `publisher`        | span of `releaseDate`s | `name`           | —                       |
| `awards`       | Awards                     | `awarder`          | `date`                 | `title`          | `summary`               |
| `certificates` | Certificates               | `issuer`           | `date`                 | `name`           | —                       |
| `references`   | References                 | `name`             | —                      | —                | `reference`             |

`skills`, `languages` and `interests` share one two-column table titled
**Skills & Interests**, label on the left and value flush right:

| Section     | Label                     | Value      |
| ----------- | ------------------------- | ---------- |
| `skills`    | `keywords`, or `name`     | `level`    |
| `languages` | `language`                | `fluency`  |
| `interests` | `name`                    | `keywords` |

The titles are the ones the LaTeX theme prints, which are more opinionated than the JSON
Resume section names — `publications` is titled *Conference Talks*, `projects`
is *Recent Personal Projects*. Override any of them with `labels` below.

Two things follow from the original rather than from the schema:

- **Repeats collapse.** Consecutive entries sharing a heading become one block
  with several subheadings — two roles at one employer, or the two PyCon
  Australia volunteer posts. Publications group by publisher wherever they
  appear, so every talk given at a conference sits under one heading with the
  span of years beside it.
- **Only years are printed**, whatever precision the source dates carry. A
  period with a start and no end reads `2024 - Present`; one that starts and
  ends in the same year collapses to a single year.

The masthead is two rows. Across the top, `basics.image` as a square photo,
level with the name and with `basics.label` under it, and the contact details
flush right — drawn from `basics.email`, `phone`, `url`, `profiles` and
`location`, each with a mark beside it; a `network` the theme does not
recognise gets a generic link mark. Underneath both, running the full width of
the band, `basics.summary`.

The band is 24mm when it holds a name and contacts alone, and grows to fit a
summary rather than clipping one. `--photo-size` (18mm) sizes the photo.

`basics.image` is the one thing in a rendered resume that is not inlined: it
stays a URL, because `render` cannot fetch it without reaching the network, and
a theme has to stay pure. Only `http(s)` and `data:image` are accepted. Inline
your own `data:` URI if you want a resume that is genuinely one file.

## Options

All optional, under `meta["two-column"]`:

```json
{
  "meta": {
    "theme": "two-column",
    "two-column": {
      "colors": { "section": "#205081", "heading": "#205081" },
      "labels": { "publications": "Talks", "projects": "Projects" },
      "order": ["work", "skills", "education", "publications"],
      "contacts": ["email", "profiles"],
      "present": "Now"
    }
  }
}
```

| Key        | Meaning                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `colors`   | Colour overrides — `title`, `section`, `heading` are the accent, black by default |
| `labels`   | Section titles, keyed by JSON Resume section name                                |
| `order`    | Which sections appear and in what order they flow through the columns            |
| `contacts` | Which masthead details appear, from `email`, `phone`, `url`, `profiles`, `location` |
| `present`  | What an open-ended date range ends with (`""` prints the start year alone)       |

## Known differences from the LaTeX original

- TeX squeezes interword space by up to a third to keep a line from breaking.
  CSS cannot, so a sliver comes off every space instead (`--word-shrink`). It is
  enough for most lines; a subheading that TeX squeezed hard — say a talk title
  that filled the column to the last point — will wrap onto a second line here.
- Long resumes paginate rather than reflow: the masthead only appears on the
  first page, and the columns continue on the next, as the LaTeX theme does.
- On screen the columns balance instead of filling, so a resume that runs past
  one page grows the sheet rather than escaping it sideways. Print is unaffected.

## Working on the theme

```sh
npm install          # also runs the asset build, via prepare
npm test             # unit tests, plus the registry's render QA gate
npm run render       # preview/resume.html, from a complete sample resume
npm run render -- path/to/resume.json
```

`src/style.css` and `fonts/*.woff2` are the sources of truth;
`scripts/build-assets.mjs` bakes both into `src/generated/` so that nothing is
read from disk at render time. That is a hard requirement rather than a
preference: [the theme development guide][dev] asks that `render` be pure and
says not to import `fs` at all, and the registry's theme-request form makes it
a checkbox you have to tick. It is also what lets the registry bundle the theme
into its Next.js build, where a `.css` file would belong to the CSS pipeline and
the woff2 subsets would never reach the output directory. A test fails if
anything under `src/` reaches for the filesystem again. Re-run `npm run build`
(or just `npm test`) after editing either.

[dev]: https://jsonresume.org/theme-development

`test/registry-gate.js` mirrors the gate the registry applies to every theme —
render without crashing, leak no `[object Object]`/`undefined`/`NaN`, and draw
the sections it insists on. This theme is held to a stricter line than the gate
itself: every section the complete sample resume populates has to reach the
HTML, and a section added to that fixture upstream fails the suite rather than
going quietly untested.

The layout is measured rather than derived — the comments in `src/style.css`
say what each value came from. Change one and re-render before trusting it.

## Licence

MIT, see `LICENSE`. The bundled fonts are not — see `fonts/README.md`.
