# Bundled fonts

`scripts/build-assets.mjs` bakes these into `src/generated/fonts.js`, and
`src/fonts.js` inlines them as data URIs so a rendered resume is a single
portable file. They are subsets covering Latin, Latin Extended-A/B, general
punctuation and common symbols — enough for a resume in any Latin-script
language, and about a fifth of the size of the full faces.

| File                             | Face                               | Licence                                     |
| -------------------------------- | ---------------------------------- | ------------------------------------------- |
| `Oswald-Regular.woff2`           | Oswald Regular                     | SIL Open Font License 1.1, `LICENSE-Oswald.txt` |
| `DejaVuSerifCondensed*.woff2`    | DejaVu Serif Condensed, R/B/I      | Bitstream Vera + Arev, `LICENSE-DejaVu.txt` |
| `DejaVuSansMono.woff2`           | DejaVu Sans Mono                   | Bitstream Vera + Arev, `LICENSE-DejaVu.txt` |

Sources: [DejaVu 2.37](https://github.com/dejavu-fonts/dejavu-fonts/releases/tag/version_2_37)
and [Oswald from Google Fonts](https://github.com/google/fonts/tree/main/ofl/oswald).

## Regenerating

With [fonttools](https://github.com/fonttools/fonttools) and `brotli` installed:

```sh
UNICODES='U+0020-007E,U+00A0-00FF,U+0100-017F,U+0180-024F,U+02B0-02FF,U+0300-036F,\
U+2000-206F,U+2070-209F,U+20A0-20BF,U+2100-214F,U+2190-21FF,U+2200-22FF,\
U+25A0-25FF,U+2600-26FF,U+2764,U+FB00-FB06'

pyftsubset SourceFont.ttf \
  --unicodes="$UNICODES" \
  --layout-features='*' \
  --no-hinting --desubroutinize --drop-tables+=DSIG \
  --flavor=woff2 --output-file=Name.woff2
```

Keep `--layout-features='*'`: the theme relies on kerning and on the `ff`/`fi`
ligatures, which is how the LaTeX original breaks its lines.
