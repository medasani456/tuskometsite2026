# TuS Komet Arsten Cricket: static club site

Plain HTML, CSS and JavaScript. No build step, no framework. All content lives in CSV and text files in the root folder.

- `index.html` is the main page. It shows every section: matches, news, players, seasons, gallery, availability.
- `matches.html`, `news.html`, `players.html`, `seasons.html`, `gallery.html`, `availability.html` show one section each (deep links, plus earlier fixtures on the matches page).

## Update content

| File | What it controls | Columns |
|---|---|---|
| `config.txt` | Club name, location, footer, logo, poll links | `key = value` lines |
| `players.csv` | Players | `number,name,role,style,photo,active` |
| `matches.csv` | Schedule, next match, availability poll | `id,date,time,opponent,venue,type,result` |
| `news.csv` | News, lead story (newest row) | `date,tag,title,text,icon,image` |
| `seasons.csv` | Season tables (Outdoor / Indoor tabs) | `kind,season,played,won,lost,nr,finish` |
| `results.csv` | Results per season | `kind,season,date,opponent,result,margin` |
| `leaders.csv` | Season leaders | `kind,season,category,player,value` |
| `gallery.csv` | Gallery | `file,caption,date` |
| `availability.csv` | Availability answers | `match_id,player,status` |

## Images

| Folder | Used by | How to reference |
|---|---|---|
| `images/players/` | `players.csv`, column `photo` | file name only, e.g. `aarav-nair.jpg` |
| `images/gallery/` | `gallery.csv`, column `file` | file name only, e.g. `nets.jpg` |
| `images/news/` | `news.csv`, column `image` (optional) | file name only |
| `images/` | `config.txt`, `logo` | e.g. `images/logo.png` |

- JPG, PNG, WebP and SVG all work. Square photos around 400 px suit players, 1200 px wide suits the gallery.
- A player without a photo (or with a missing file) shows the shirt number instead.
- The sample SVG images in the repository are placeholders. Delete them and add real photos.

## Rules for the CSV files

- Dates are `YYYY-MM-DD`. Matches before today move to "Earlier fixtures" automatically.
- `kind` is `outdoor` or `indoor`. A tab appears for each kind found in `seasons.csv`.
- `result` in `results.csv` is `W`, `L` or `NR`.
- Set `active` to `no` in `players.csv` to hide a player without deleting the row.
- `icon` in `news.csv`: `bat`, `ball`, `stumps`, `hall`, `trophy` or `comet`.
- Wrap any value that contains a comma in double quotes.
- Semicolon-separated files from German Excel work too. Save as "CSV UTF-8" so names like Krüger display correctly.

## Availability poll

A static site cannot store answers, so players answer through a form and the page reads the results.

1. Create a Google Form with three dropdown questions named exactly **Player**, **Match** and **Availability**. Use match options like `2026-11-14 Hamburg Tigers CC` and the answers `Available`, `Maybe`, `Not available`. Player options must match the `name` column in `players.csv`.
2. Put the form link in `config.txt` as `availability_form_url`.
3. In the linked response sheet use File > Share > Publish to web > CSV, and put that link in `availability_csv_url`.

Without a published sheet the page reads `availability.csv`, which you can edit by hand. Later rows override earlier ones for the same player and match.

## Deploy with GitHub Actions

`.github/workflows/pages.yml` validates the data and publishes the site on every push to `main`.

1. Create a repository and push this folder so `index.html` is in the repository root.
2. Repository Settings > Pages > Build and deployment > Source: **GitHub Actions**.
3. Push to `main`. The Actions tab shows two jobs: `validate`, then `deploy`. The site appears at `https://<user>.github.io/<repo>/`.

The `validate` job runs `node scripts/validate.mjs`. It fails the deploy when a required column is missing, a date is not `YYYY-MM-DD`, a `match_id` is duplicated, or a photo named in a CSV does not exist in its images folder. Run it locally before pushing:

```
node scripts/validate.mjs
```

On a public repository everything in it is public. Keep private data such as phone numbers out of the CSV files.

## Preview locally

The pages load the CSV files with `fetch`, so use a server rather than opening the files directly:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Files

```
index.html + 6 section pages
config.txt, *.csv           content
images/players, images/gallery, images/news
assets/style.css            colours and layout (edit the :root block)
assets/app.js               CSV and config loading, header, footer
assets/sections.js          one renderer per section
scripts/validate.mjs        data checks used by the workflow
.github/workflows/pages.yml deploy workflow
```

The sample names, fixtures, news, results and images are placeholders. Replace them before publishing.
