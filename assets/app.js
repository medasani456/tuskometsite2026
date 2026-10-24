/* Shared helpers: CSV/config loading, header, footer. No build step needed. */
const Komet = (() => {
  // [page, label, section id on the one-page index]
  const PAGES = [
    ['index.html', 'Home', 'top'], ['matches.html', 'Matches', 'matches'], ['news.html', 'News', 'news'], ['players.html', 'Players', 'players'],
    ['seasons.html', 'Seasons', 'seasons'], ['gallery.html', 'Gallery', 'gallery'], ['availability.html', 'Availability', 'availability']
  ];
  const DEFAULTS = {
    club_name: 'TuS Komet Arsten', short_name: 'TuS Komet Arsten', section: 'Cricket', locale: 'en-GB',
    location: '', contact_email: '', logo: '', availability_form_url: '', availability_csv_url: '',
    footer_text: '', home_cta_text: 'Mark my availability'
  };
  const failed = [];
  let cfg = { ...DEFAULTS };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = n => `<svg aria-hidden="true"><use href="#${n}"/></svg>`;
  const today = () => new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd, local time
  const date = (iso, opts) => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString(cfg.locale, opts); };
  const daysUntil = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);

  /* Handles quotes, commas inside quotes, and semicolon-separated files saved by German Excel. */
  function parseCSV(t) {
    t = t.replace(/^﻿/, '');
    const first = t.split(/\r?\n/, 1)[0] || '';
    const d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    const clean = rows.filter(r => r.some(x => x.trim() !== ''));
    if (!clean.length) return [];
    const head = clean[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    return clean.slice(1).map(r => { const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim()); return o; });
  }

  async function text(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null; // missing file: treated as empty
    return r.text();
  }
  async function csv(file) {
    try { const t = await text(file); return t ? parseCSV(t) : []; }
    catch (e) { failed.push(file); return []; }
  }
  async function loadConfig() {
    try {
      const t = await text('config.txt');
      if (t) t.split(/\r?\n/).forEach(l => {
        l = l.trim(); if (!l || l[0] === '#') return;
        const i = l.indexOf('='); if (i > 0) cfg[l.slice(0, i).trim()] = l.slice(i + 1).trim();
      });
    } catch (e) { failed.push('config.txt'); }
    return cfg;
  }

  const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="comet" viewBox="0 0 64 64"><circle cx="44" cy="20" r="11" fill="currentColor"/><path d="M36 28 6 58M40 31 14 60M32 24 2 46" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/></symbol>
    <symbol id="bat" viewBox="0 0 64 64"><path d="M40 6l18 18-8 8-18-18z" fill="currentColor"/><path d="M34 20 8 46l4 4 6 6 26-26" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></symbol>
    <symbol id="ball" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="5"/><path d="M14 18c10 6 10 22 0 28M50 18c-10 6-10 22 0 28" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="4 4"/></symbol>
    <symbol id="stumps" viewBox="0 0 64 64"><path d="M16 14v42M32 14v42M48 14v42" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M12 12h18M34 12h18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></symbol>
    <symbol id="hall" viewBox="0 0 64 64"><path d="M6 28 32 10l26 18v26H6z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M24 54V38h16v16" fill="none" stroke="currentColor" stroke-width="4"/></symbol>
    <symbol id="trophy" viewBox="0 0 64 64"><path d="M18 8h28v16a14 14 0 0 1-28 0zM18 14H8c0 10 4 16 12 18M46 14h10c0 10-4 16-12 18M32 38v10M20 56h24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  </svg>`;

  async function init(page) {
    await loadConfig();
    const cur = page.split('/').pop() || 'index.html';
    const one = cur === 'index.html';
    cfg.__onepage = one;
    const label = (PAGES.find(p => p[0] === cur) || [0, ''])[1];
    document.title = (label && cur !== 'index.html' ? label + ' | ' : '') + cfg.short_name + ' ' + cfg.section;
    const logo = cfg.logo ? `<img src="${esc(cfg.logo)}" alt="">` : icon('comet');
    document.getElementById('site-header').outerHTML = SPRITE + `<header class="bar"><div class="wrap">
      <a class="brand" href="index.html" aria-label="${esc(cfg.club_name)}, home">${logo}<span>${esc(cfg.short_name)} <span class="long">${esc(cfg.section)}</span></span></a>
      <nav aria-label="Sections">${PAGES.map(p => `<a href="${one ? '#' + p[2] : p[0]}"${!one && p[0] === cur ? ' aria-current="page"' : ''}>${p[1]}</a>`).join('')}</nav></div></header>`;
    const f = document.getElementById('site-footer');
    if (f) f.outerHTML = `<footer class="wrap"><span>${esc(cfg.club_name)} ${esc(cfg.section)}${cfg.location ? ', ' + esc(cfg.location) : ''}</span><span>${esc(cfg.footer_text || cfg.contact_email)}</span></footer>`;
    return cfg;
  }

  /* Call at the end of a page script: shows a hint if files could not be fetched (e.g. opened from disk). */
  function finish() {
    if (!failed.length) return;
    const el = document.createElement('div'); el.className = 'warn';
    el.textContent = 'Could not load ' + [...new Set(failed)].join(', ') + '. If you opened this page straight from a folder, start a local server (python3 -m http.server) or publish it to GitHub Pages.';
    (document.querySelector('main') || document.body).prepend(el);
  }

  return { esc, icon, today, date, daysUntil, csv, init, finish, parseCSV, get cfg() { return cfg; } };
})();
