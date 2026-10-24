/* Section renderers. index.html shows all of them; the other pages show one each. */
const Sections = (() => {
  const K = Komet, esc = K.esc, icon = K.icon, date = K.date;
  const lc = s => (s || '').toLowerCase();
  // A bare file name is looked up in images/<dir>/. A path or URL is used as written.
  const src = (f, dir) => /^(https?:|\/|images\/)/.test(f) ? f : 'images/' + dir + '/' + f;
  const byTime = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
  const upcoming = rows => rows.filter(m => m.date >= K.today()).sort(byTime);

  const fxCard = m => `<div class="fx"><span class="d">${date(m.date, { day: 'numeric', month: 'short' })}</span><span class="o">${esc(m.opponent)}</span><span class="m">${date(m.date, { weekday: 'long' })} ${esc(m.time)}${m.venue ? '<br>' + esc(m.venue) : ''}</span>${m.type ? `<span class="pill">${esc(m.type)}</span>` : ''}</div>`;
  const newsCard = a => `<article class="card"><div class="pic">${a.image ? `<img src="${esc(src(a.image, 'news'))}" alt="">` : icon(a.icon || 'bat')}</div><div class="body"><span class="eyebrow">${esc(a.tag)} · ${date(a.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div></article>`;

  async function hero(leadEl, nextEl) {
    const cfg = K.cfg;
    const [news, matches] = await Promise.all([K.csv('news.csv'), K.csv('matches.csv')]);
    news.sort((a, b) => b.date.localeCompare(a.date));
    const n = news[0], m = upcoming(matches)[0];
    leadEl.innerHTML = icon('comet') + `<div>${n
      ? `<span class="tag">${esc(n.tag || 'Club news')}</span><h1>${esc(n.title)}</h1><p>${esc(n.text)}</p>`
      : `<h1>${esc(cfg.club_name)}</h1><p>${esc(cfg.tagline || '')}</p>`}<p style="margin-top:16px"><a class="btn accent" href="${esc(cfg.__onepage ? '#availability' : 'availability.html')}">${esc(cfg.home_cta_text)}</a></p></div>`;
    if (!m) { nextEl.innerHTML = '<span class="eyebrow">Next match</span><div class="vs">No fixtures yet</div><div class="meta">Add rows to matches.csv.</div>'; return; }
    const d = K.daysUntil(m.date);
    nextEl.innerHTML = `<span class="eyebrow">Next match</span><div class="vs">${esc(cfg.short_name.replace(/^TuS /, ''))} v ${esc(m.opponent)}</div><div class="big">${d <= 0 ? 'Today' : d + (d === 1 ? ' day' : ' days')}</div><div class="meta">${date(m.date, { weekday: 'long', day: 'numeric', month: 'long' })}${m.time ? ', ' + esc(m.time) : ''}${m.venue ? ' · ' + esc(m.venue) : ''}</div><a class="btn ghost" href="${esc(cfg.__onepage ? '#availability' : 'availability.html')}">Are you in?</a>`;
  }

  async function matches(el, o = {}) {
    const rows = await K.csv('matches.csv');
    let up = upcoming(rows); if (o.limit) up = up.slice(0, o.limit);
    let h = `<div class="fxgrid">${up.map(fxCard).join('') || '<p class="muted">No upcoming matches.</p>'}</div>`;
    if (o.past) {
      const past = rows.filter(m => m.date < K.today()).sort((a, b) => b.date.localeCompare(a.date));
      h += `<h3 class="sub">Earlier fixtures</h3><div class="scroll"><table>${past.length
        ? '<thead><tr><th>Date</th><th>Opponent</th><th>Venue</th><th>Result</th></tr></thead><tbody>' + past.map(m => `<tr><td>${date(m.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${esc(m.opponent)}</td><td>${esc(m.venue)}</td><td>${esc(m.result)}</td></tr>`).join('') + '</tbody>'
        : '<tbody><tr><td class="muted">Nothing yet.</td></tr></tbody>'}</table></div>`;
    }
    el.innerHTML = h;
  }

  async function news(el, o = {}) {
    let rows = (await K.csv('news.csv')).sort((a, b) => b.date.localeCompare(a.date));
    if (o.limit) rows = rows.slice(0, o.limit);
    el.innerHTML = `<div class="news">${rows.map(newsCard).join('') || '<p class="muted">No news yet. Add rows to news.csv.</p>'}</div>`;
  }

  async function players(el) {
    const all = (await K.csv('players.csv')).filter(p => lc(p.active || 'yes') !== 'no');
    const roles = ['All', ...new Set(all.map(p => p.role).filter(Boolean))]; let role = 'All';
    el.innerHTML = '<div class="chips" role="group" aria-label="Filter by role"></div><div class="players"></div>';
    const chips = el.querySelector('.chips'), grid = el.querySelector('.players');
    function draw() {
      chips.innerHTML = roles.map(r => `<button class="chip" type="button" aria-pressed="${r === role}" data-r="${esc(r)}">${r === 'All' ? 'All players' : esc(r)}</button>`).join('');
      grid.innerHTML = all.filter(p => role === 'All' || p.role === role).map(p =>
        `<div class="pl">${p.photo ? `<img src="${esc(src(p.photo, 'players'))}" alt="${esc(p.name)}" data-n="${esc(p.number)}" loading="lazy">` : `<div class="n">${esc(p.number)}</div>`}<b>${esc(p.name)}</b><span>${esc(p.role)}${p.photo && p.number ? ' · #' + esc(p.number) : ''}</span><span>${esc(p.style)}</span></div>`
      ).join('') || '<p class="muted">No players yet. Add rows to players.csv.</p>';
      // a missing photo falls back to the shirt number
      grid.querySelectorAll('img[data-n]').forEach(i => i.addEventListener('error', () => {
        const d = document.createElement('div'); d.className = 'n'; d.textContent = i.dataset.n; i.replaceWith(d);
      }));
    }
    chips.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { role = b.dataset.r; draw(); } });
    draw();
  }

  async function seasons(el) {
    const [seasons, results, leaders] = await Promise.all([K.csv('seasons.csv'), K.csv('results.csv'), K.csv('leaders.csv')]);
    const kinds = [...new Set(seasons.map(s => lc(s.kind)))].sort((a, b) => a === 'outdoor' ? -1 : b === 'outdoor' ? 1 : a.localeCompare(b));
    let kind = kinds[0], season = '';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    el.innerHTML = '<div class="toolbar"><div class="tabs" role="tablist" aria-label="Season type"></div><label>Season <select aria-label="Season"></select></label></div><div class="sbody"></div>';
    const tabs = el.querySelector('.tabs'), pick = el.querySelector('select'), body = el.querySelector('.sbody');
    function draw() {
      const ss = seasons.filter(s => lc(s.kind) === kind).sort((a, b) => b.season.localeCompare(a.season));
      if (!ss.find(s => s.season === season)) season = ss[0] ? ss[0].season : '';
      tabs.innerHTML = kinds.map(k => `<button role="tab" type="button" aria-selected="${k === kind}" data-k="${esc(k)}">${esc(cap(k))}</button>`).join('');
      pick.innerHTML = ss.map(s => `<option${s.season === season ? ' selected' : ''}>${esc(s.season)}</option>`).join('');
      const res = results.filter(r => lc(r.kind) === kind && r.season === season).sort((a, b) => b.date.localeCompare(a.date));
      const led = leaders.filter(r => lc(r.kind) === kind && r.season === season);
      body.innerHTML = ss.length ? `<div class="two"><div><div class="scroll"><table><thead><tr><th>Season</th><th class="num">P</th><th class="num">W</th><th class="num">L</th><th class="num">NR</th><th>Finish</th></tr></thead><tbody>${ss.map(s => `<tr${s.season === season ? ' class="sel"' : ''}><td>${esc(s.season)}</td><td class="num">${esc(s.played)}</td><td class="num">${esc(s.won)}</td><td class="num">${esc(s.lost)}</td><td class="num">${esc(s.nr)}</td><td>${esc(s.finish)}</td></tr>`).join('')}</tbody></table></div>${led.length ? `<h3 class="sub2">Season leaders</h3><div class="scroll"><table><tbody>${led.map(r => `<tr><td>${esc(r.category)}</td><td>${esc(r.player)}</td><td class="num"><b>${esc(r.value)}</b></td></tr>`).join('')}</tbody></table></div>` : ''}</div><div><h3 class="sub3">${esc(season)} results</h3><div class="scroll"><table><tbody>${res.map(r => `<tr><td>${date(r.date, { day: 'numeric', month: 'short' })}</td><td>${esc(r.opponent)}</td><td class="res-${lc(r.result) === 'w' ? 'w' : lc(r.result) === 'l' ? 'l' : 'n'}">${esc(r.result)}</td><td>${esc(r.margin)}</td></tr>`).join('') || '<tr><td class="muted">No results entered for this season.</td></tr>'}</tbody></table></div></div></div>` : '<p class="muted">No seasons yet. Add rows to seasons.csv.</p>';
    }
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { kind = b.dataset.k; draw(); } });
    pick.addEventListener('change', e => { season = e.target.value; draw(); });
    draw();
  }

  async function gallery(el) {
    const rows = (await K.csv('gallery.csv')).filter(r => r.file).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    el.innerHTML = `<div class="gal">${rows.map((r, i) => `<figure><button type="button" data-i="${i}" aria-label="Open photo${r.caption ? ': ' + esc(r.caption) : ''}"><img src="${esc(src(r.file, 'gallery'))}" alt="${esc(r.caption)}" loading="lazy"></button>${r.caption ? `<figcaption>${esc(r.caption)}</figcaption>` : ''}</figure>`).join('') || '<p class="muted">No photos yet. Add files to images/gallery and list them in gallery.csv.</p>'}</div>
      <dialog><button type="button" aria-label="Close">X</button><img alt=""><p></p></dialog>`;
    const dlg = el.querySelector('dialog'), big = dlg.querySelector('img'), cap = dlg.querySelector('p');
    el.querySelector('.gal').addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const r = rows[+b.dataset.i]; big.src = src(r.file, 'gallery'); big.alt = r.caption || ''; cap.textContent = r.caption || ''; dlg.showModal();
    });
    dlg.querySelector('button').onclick = () => dlg.close();
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }

  async function availability(el) {
    const cfg = K.cfg;
    const [ms, players, local] = await Promise.all([K.csv('matches.csv'), K.csv('players.csv'), K.csv('availability.csv')]);
    let rows = local, remoteOk = false;
    if (cfg.availability_csv_url) {
      try { const r = await fetch(cfg.availability_csv_url, { cache: 'no-store' }); if (r.ok) { rows = K.parseCSV(await r.text()); remoteOk = true; } } catch (e) { /* fall back to availability.csv */ }
    }
    const note = cfg.availability_form_url
      ? (remoteOk ? 'Answers update from the shared sheet within a few minutes of submitting.' : 'Submit your answer with the form. This page shows answers from availability.csv.')
      : 'Answers come from availability.csv. Set availability_form_url in config.txt to let players submit their own.';
    const get = (r, keys) => { for (const k of keys) if (r[k] !== undefined && r[k] !== '') return r[k]; return ''; };
    const up = upcoming(ms);
    const status = v => { v = lc(v).trim(); if (/^(n|u|not|nein)/.test(v)) return 'no'; if (/^(m|v)/.test(v)) return 'maybe'; if (/^(y|a|j)/.test(v)) return 'yes'; return ''; };
    const findMatch = v => { v = lc(v); return up.find(m => m.id && lc(m.id) === v) || up.find(m => v.includes(m.date) || (m.opponent && v.includes(lc(m.opponent)))); };
    const findPlayer = v => { v = lc(v).trim(); return players.find(p => lc(p.name) === v || (p.number && p.number === v)); };
    const ans = {};
    rows.forEach(r => { // later rows override earlier ones
      const m = findMatch(get(r, ['match_id', 'match', 'which_match', 'fixture', 'opponent', 'date']));
      const p = findPlayer(get(r, ['player', 'name', 'your_name', 'player_name']));
      const s = status(get(r, ['status', 'availability', 'answer', 'available']));
      if (m && p) (ans[m.id] = ans[m.id] || {})[p.name] = s;
    });
    const first = n => esc(n.split(' ')[0]);
    el.innerHTML = `<div class="note">${esc(note)}</div>${cfg.availability_form_url ? `<p><a class="btn" href="${esc(cfg.availability_form_url)}" target="_blank" rel="noopener">Submit my availability</a></p>` : ''}<div class="polls">${up.map(m => {
      const a = ans[m.id] || {}, by = { yes: [], maybe: [], no: [] };
      Object.keys(a).forEach(n => { if (a[n]) by[a[n]].push(n); });
      const total = players.length || 1, open = players.length - by.yes.length - by.maybe.length - by.no.length;
      return `<div class="pm"><div class="t"><h3>${esc(m.opponent)}</h3><span class="eyebrow">${date(m.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${esc(m.time)}</span></div><div class="bars" role="img" aria-label="${by.yes.length} available, ${by.maybe.length} maybe, ${by.no.length} not available"><i class="y" style="width:${by.yes.length / total * 100}%"></i><i class="m" style="width:${by.maybe.length / total * 100}%"></i><i class="n" style="width:${by.no.length / total * 100}%"></i></div><div class="names"><div><b>${by.yes.length} available</b> ${by.yes.map(first).join(', ')}</div><div><b>${by.maybe.length} maybe</b> ${by.maybe.map(first).join(', ')}</div><div><b>${by.no.length} not available</b> ${by.no.map(first).join(', ')}</div>${players.length ? `<div>${open} no answer yet</div>` : ''}</div></div>`;
    }).join('') || '<p class="muted">No upcoming matches.</p>'}</div>`;
  }

  return { hero, matches, news, players, seasons, gallery, availability };
})();
