const BASE = 'https://dummyjson.com';
const CATEGORY = 'fragrances'; // тек бір категория: парфюмерия (серверде 5 өнім бар)
const $ = id => document.getElementById(id);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'class' ? e.className = v : e.setAttribute(k, v); e.append(...c); return e; };

let all = [], items = [], query = '', editing = null;

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

// READ: тек парфюм категориясы. GET /products/category/fragrances
async function load() {
  const r = await api('GET', '/products/category/' + CATEGORY);
  all = r.ok ? r.data.products : [];
  applyFilter();
}

// Іздеу: 5 өнімнің ішінде бетте сүзіледі
function applyFilter() {
  items = all.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
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
}

// Модальды терезе: p бар болса өңдеу, жоқ болса жаңа өнім
function openModal(p) {
  editing = p ? p.id : null;
  $('mtitle').textContent = p ? 'Өнімді өңдеу' : 'Жаңа өнім';
  $('mbox').hidden = !p;
  $('title').value = p ? p.title : ''; $('price').value = p ? p.price : ''; $('category').value = p ? p.category : CATEGORY;
  $('modal').showModal();
}

// CREATE (POST) және UPDATE (PUT/PATCH)
$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const body = { title: $('title').value.trim(), price: Number($('price').value), category: $('category').value.trim() };
  $('modal').close();
  if (editing === null) {
    const r = await api('POST', '/products/add', body);
    if (r.ok) all.unshift({ ...body, ...r.data, local: true });
  } else {
    const r = await api($('method').value, '/products/' + editing, body);
    if (r.ok) all = all.map(p => p.id === editing ? { ...p, ...r.data } : p);
  }
  applyFilter();
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
  if (r.ok) { all = all.filter(x => x.id !== p.id); applyFilter(); }
}

$('add').onclick = () => openModal(null);
$('cancel').onclick = () => $('modal').close();
$('sbtn').onclick = () => { query = $('q').value.trim(); applyFilter(); };
$('q').oninput = () => { query = $('q').value.trim(); applyFilter(); };
$('reset').onclick = () => { query = ''; $('q').value = ''; applyFilter(); };

load();