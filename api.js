const BASE = 'https://dummyjson.com';
const LIM = 5; // бір бетте 5 өнім
const $ = id => document.getElementById(id);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'class' ? e.className = v : e.setAttribute(k, v); e.append(...c); return e; };

let items = [], total = 0, skip = 0, query = '', editing = null;

// Барлық HTTP сұраныс осы функция арқылы өтеді (статус код консольде ғана)
async function api(method, path, body) {
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
  console.log(status, method, BASE + path, data);
  if (!ok) alert(`Қате: ${method} ${path} → ${status}`);
  return { ok, status, data };
}

// READ
async function load() {
  const path = query ? `/products/search?q=${encodeURIComponent(query)}&limit=${LIM}&skip=${skip}` : `/products?limit=${LIM}&skip=${skip}`;
  const r = await api('GET', path);
  items = r.ok ? r.data.products : []; total = r.ok ? r.data.total : 0;
  renderList();
}

function renderList() {
  $('list').replaceChildren(...(items.length ? items.map(p => h('div', { class: 'item' },
    p.thumbnail ? h('img', { class: 'thumb', src: p.thumbnail, alt: p.title, loading: 'lazy' }) : h('div', { class: 'thumb ph' }, 'Сурет жоқ'),
    h('div', { class: 'info' }, h('b', {}, p.title), h('span', { class: 'mut' }, p.category + ' / $' + p.price)),
    h('div', { class: 'acts' },
      h('button', { class: 'btn', type: 'button', onclick: () => showInfo(p) }, 'GET'),
      h('button', { class: 'btn', type: 'button', onclick: () => openModal(p) }, 'Өзгерту'),
      h('button', { class: 'btn d', type: 'button', onclick: () => remove(p) }, 'Жою')))) : [h('p', { class: 'mut' }, 'Тізім бос.')]));
  $('pg').textContent = `${total ? skip + 1 : 0}-${skip + items.length} / ${total}`;
  $('prev').disabled = skip === 0; $('next').disabled = skip + LIM >= total;
}

// Модальды терезе: p бар болса өңдеу, жоқ болса жаңа өнім
function openModal(p) {
  editing = p ? p.id : null;
  $('mtitle').textContent = p ? 'Өнімді өңдеу' : 'Жаңа өнім';
  $('mbox').hidden = !p;
  $('title').value = p ? p.title : ''; $('price').value = p ? p.price : ''; $('category').value = p ? p.category : '';
  $('modal').showModal();
}

// CREATE (POST) және UPDATE (PUT/PATCH)
$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const body = { title: $('title').value.trim(), price: Number($('price').value), category: $('category').value.trim() };
  $('modal').close();
  if (editing === null) {
    const r = await api('POST', '/products/add', body);
    if (r.ok) { items.unshift({ ...body, ...r.data, local: true }); total++; }
  } else {
    const r = await api($('method').value, '/products/' + editing, body);
    if (r.ok) items = items.map(p => p.id === editing ? { ...p, ...r.data } : p);
  }
  renderList();
});

// READ (бір өнім): GET /products/{id} және ақпаратты модальды терезеде көрсету
async function showInfo(p) {
  let d = p;
  if (!p.local) { // жергілікті қосылған өнім серверде жоқ, сондықтан сұрамаймыз
    const r = await api('GET', '/products/' + p.id);
    if (!r.ok) return;
    d = r.data;
  }
  $('iimg').src = d.thumbnail || ''; $('iimg').hidden = !d.thumbnail;
  $('ititle').textContent = d.title;
  const rows = [
    ['Категориясы', d.category],
    ['Бағасы', '$' + d.price + (d.discountPercentage ? ` (жеңілдік ${d.discountPercentage}%)` : '')],
    ['Түрі (tags)', (d.tags || []).join(', ')],
    ['Бренд', d.brand],
    ['Рейтинг', d.rating],
    ['Қоймада', d.stock]
  ].filter(r => r[1] !== undefined && r[1] !== '');
  $('idl').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]));
  $('idesc').textContent = d.description || '';
  $('info').showModal();
}
$('iclose').onclick = () => $('info').close();

// DELETE
async function remove(p) {
  const r = await api('DELETE', '/products/' + p.id);
  if (r.ok) { items = items.filter(x => x.id !== p.id); total--; renderList(); }
}

$('add').onclick = () => openModal(null);
$('cancel').onclick = () => $('modal').close();
$('sbtn').onclick = () => { query = $('q').value.trim(); skip = 0; load(); };
$('q').onkeydown = e => { if (e.key === 'Enter') $('sbtn').click(); };
$('reset').onclick = () => { query = ''; $('q').value = ''; skip = 0; load(); };
$('prev').onclick = () => { skip = Math.max(0, skip - LIM); load(); };
$('next').onclick = () => { skip += LIM; load(); };

load();