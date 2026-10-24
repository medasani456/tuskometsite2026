// Checks the CSV files and image references before deploy. Run: node scripts/validate.mjs
import fs from 'node:fs';
process.chdir(new URL('..', import.meta.url).pathname); // run from any folder
const K = new Function('document', 'location', fs.readFileSync('assets/app.js', 'utf8') + ';return Komet;')({}, {});
const errors = [], warns = [];
const read = f => fs.existsSync(f) ? K.parseCSV(fs.readFileSync(f, 'utf8')) : (errors.push(`${f}: file missing`), []);
const need = (f, rows, cols) => {
  const have = rows.length ? Object.keys(rows[0]) : [];
  if (rows.length) cols.filter(c => !have.includes(c)).forEach(c => errors.push(`${f}: missing column "${c}"`));
};
const iso = /^\d{4}-\d{2}-\d{2}$/;
const dates = (f, rows) => rows.forEach((r, i) => { if (r.date && !iso.test(r.date)) errors.push(`${f} row ${i + 2}: date "${r.date}" must be YYYY-MM-DD`); });
const img = (f, rows, col, dir) => rows.forEach((r, i) => {
  const v = r[col]; if (!v || /^(https?:|\/)/.test(v)) return;
  const p = v.startsWith('images/') ? v : `images/${dir}/${v}`;
  if (!fs.existsSync(p)) errors.push(`${f} row ${i + 2}: image not found: ${p}`);
});

const players = read('players.csv'), matches = read('matches.csv'), news = read('news.csv');
const seasons = read('seasons.csv'), results = read('results.csv'), leaders = read('leaders.csv');
const gallery = read('gallery.csv'), avail = fs.existsSync('availability.csv') ? read('availability.csv') : [];

need('players.csv', players, ['number', 'name', 'role']);
need('matches.csv', matches, ['id', 'date', 'time', 'opponent']);
need('news.csv', news, ['date', 'title', 'text']);
need('seasons.csv', seasons, ['kind', 'season', 'played', 'won', 'lost', 'nr', 'finish']);
need('results.csv', results, ['kind', 'season', 'date', 'opponent', 'result']);
need('leaders.csv', leaders, ['kind', 'season', 'category', 'player', 'value']);
need('gallery.csv', gallery, ['file']);
dates('matches.csv', matches); dates('news.csv', news); dates('results.csv', results); dates('gallery.csv', gallery);
img('players.csv', players, 'photo', 'players'); img('gallery.csv', gallery, 'file', 'gallery'); img('news.csv', news, 'image', 'news');

const ids = matches.map(m => m.id);
ids.forEach((id, i) => { if (!id) errors.push(`matches.csv row ${i + 2}: empty id`); else if (ids.indexOf(id) !== i) errors.push(`matches.csv: duplicate id "${id}"`); });
[...seasons, ...results, ...leaders].forEach(r => { if (!['outdoor', 'indoor'].includes((r.kind || '').toLowerCase())) warns.push(`kind "${r.kind}" is not outdoor or indoor`); });
avail.forEach((r, i) => { if (r.match_id && !ids.includes(r.match_id)) warns.push(`availability.csv row ${i + 2}: unknown match_id "${r.match_id}"`); });

[...new Set(warns)].forEach(w => console.log('warning:', w));
if (errors.length) { errors.forEach(e => console.error('error:', e)); process.exit(1); }
console.log(`ok: ${players.length} players, ${matches.length} matches, ${news.length} news, ${seasons.length} seasons, ${gallery.length} gallery photos`);
