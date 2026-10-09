const BASE = 'https://dummyjson.com';
const LIM = 10;
const $ = id => document.getElementById(id);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'class' ? e.className = v : e.setAttribute(k, v); e.append(...c); return e; };

let items = [], total = 0, skip = 0, query = '', editing = null, log = [];

// Барлық HTTP сұраныс осы функция арқылы өтеді
async function api(method, path, body) {
  const t0 = performance.now();
  let status = 'ERR', ok = false, data = null;
  try {
    const r = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    status = r.status; ok = r.ok;
    data = await r.json();
  } catch (e) { data = { error: String(e) }; }
  log.unshift({ method, path, status, ms: Math.round(performance.now() - t0) });
  log = log.slice(0, 8);
  renderLog();
  $('resp').textContent = status + ' ' + method + ' ' + BASE + path + '\n\n' + JSON.stringify(data, null, 2);
  return { ok, status, data };
}

function renderLog() {
  $('log').replaceChildren(
    h('tr', {}, ...['Әдіс', 'Адрес', 'Статус', 'мс'].map(x => h('th', {}, x))),
    ...log.map(l => h('tr', {}, h('td', {}, h('b', {}, l.method)), h('td', {}, l.path),
      h('td', {}, h('span', { class: 'badge s' + Math.floor(l.status / 100) }, String(l.status))), h('td', {}, String(l.ms)))));
}

// READ: GET /products және GET /products/search?q=
async function load() {
  const path = query ? `/products/search?q=${encodeURIComponent(query)}&limit=${LIM}&skip=${skip}` : `/products?limit=${LIM}&skip=${skip}`;
  const r = await api('GET', path);
  items = r.ok ? r.data.products : []; total = r.ok ? r.data.total : 0;
  renderList();
}

function renderList() {
  $('list').replaceChildren(...(items.length ? items.map(p => h('div', { class: 'item' },
    h('div', {}, h('b', {}, '#' + p.id + ' ' + p.title), h('span', { class: 'mut' }, p.category + ' / $' + p.price)),
    h('div', { class: 'acts' },
      h('button', { class: 'btn', type: 'button', onclick: () => api('GET', '/products/' + p.id) }, 'GET'),
      h('button', { class: 'btn', type: 'button', onclick: () => edit(p) }, 'Өзгерту'),
      h('button', { class: 'btn d', type: 'button', onclick: () => remove(p) }, 'DELETE')))) : [h('p', { class: 'mut' }, 'Тізім бос.')]));
  $('pg').textContent = `${total ? skip + 1 : 0}-${skip + items.length} / ${total}`;
  $('prev').disabled = skip === 0; $('next').disabled = skip + LIM >= total;
}

function edit(p) {
  editing = p ? p.id : null;
  $('ftitle').textContent = p ? `Update: #${p.id} (PUT / PATCH)` : 'Create: жаңа өнім (POST)';
  $('mbox').hidden = $('cancel').hidden = !p;
  $('title').value = p ? p.title : ''; $('price').value = p ? p.price : ''; $('category').value = p ? p.category : '';
}

// CREATE (POST) және UPDATE (PUT/PATCH)
async function save() {
  const body = { title: $('title').value.trim(), price: Number($('price').value), category: $('category').value.trim() };
  if (!body.title) { alert('Атауын енгізіңіз'); return; }
  if (editing === null) {
    const r = await api('POST', '/products/add', body);
    if (r.ok) { items.unshift({ ...body, ...r.data }); total++; }
  } else {
    const r = await api($('method').value, '/products/' + editing, body);
    if (r.ok) items = items.map(p => p.id === editing ? { ...p, ...r.data } : p);
  }
  renderList(); edit(null);
}

// DELETE
async function remove(p) {
  const r = await api('DELETE', '/products/' + p.id);
  if (r.ok) { items = items.filter(x => x.id !== p.id); total--; renderList(); }
}

$('save').onclick = save;
$('cancel').onclick = () => edit(null);
$('sbtn').onclick = () => { query = $('q').value.trim(); skip = 0; load(); };
$('reset').onclick = () => { query = ''; $('q').value = ''; skip = 0; load(); };
$('prev').onclick = () => { skip = Math.max(0, skip - LIM); load(); };
$('next').onclick = () => { skip += LIM; load(); };

renderLog(); load();
