import { fontData } from './generated/fonts.js'

/**
 * The three faces the LaTeX theme asks for, inlined as data URIs so that a
 * rendered resume is a single portable file. See fonts/README.md for how the
 * woff2 subsets are produced and what they are licensed under; the base64 is
 * baked into src/generated/fonts.js so nothing has to be read at render time.
 */
const FACES = [
  { family: 'Oswald', file: 'Oswald-Regular.woff2', weight: 400, style: 'normal' },
  {
    family: 'DejaVu Serif Condensed',
    file: 'DejaVuSerifCondensed.woff2',
    weight: 400,
    style: 'normal',
  },
  {
    family: 'DejaVu Serif Condensed',
    file: 'DejaVuSerifCondensed-Bold.woff2',
    weight: 700,
    style: 'normal',
  },
  {
    family: 'DejaVu Serif Condensed',
    file: 'DejaVuSerifCondensed-Italic.woff2',
    weight: 400,
    style: 'italic',
  },
  {
    family: 'DejaVu Sans Mono',
    file: 'DejaVuSansMono.woff2',
    weight: 400,
    style: 'normal',
  },
]

const fontFace = ({ family, file, weight, style }) => {
  const data = fontData[file]
  if (!data) throw new Error(`No font data for ${file}; run npm run build`)
  return `@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: block;
  src: url(data:font/woff2;base64,${data}) format('woff2');
}`
}

let cached

export const fontFaces = () => (cached ??= FACES.map(fontFace).join('\n'))
