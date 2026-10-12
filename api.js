const BASE = 'https://dummyjson.com';
const CATEGORY = 'fragrances'; // тек бір категория: парфюмерия (серверде 5 өнім бар)
const $ = id => document.getElementById(id);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'class' ? e.className = v : e.setAttribute(k, v); e.append(...c); return e; };

let all = [], items = [], query = '', editing = null;
let localSeq = 0;                 // жергілікті өнімдерге бірегей id беру үшін
let imgData = '', imgReady = null; // таңдалған сурет (base64 немесе URL)

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
  $('imgfile').value = ''; $('imgurl').value = ''; imgReady = null;
  imgData = p && p.thumbnail && !p.thumbnail.startsWith('http') ? p.thumbnail : '';
  showPreview(p ? p.thumbnail : '');
  $('modal').showModal();
}

// Суретті алдын ала көрсету
function showPreview(src) { $('preview').src = src || ''; $('preview').hidden = !src; }

// Файлды base64 жолына айналдыру (<img src> ішінде тікелей жұмыс істейді)
const toDataURL = file => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result); fr.onerror = rej;
  fr.readAsDataURL(file);
});

$('imgfile').onchange = () => {
  const f = $('imgfile').files[0];
  if (!f) return;
  $('imgurl').value = '';
  imgReady = toDataURL(f).then(d => { imgData = d; showPreview(d); });
};
$('imgurl').oninput = () => {
  const u = $('imgurl').value.trim();
  if (u) { $('imgfile').value = ''; imgReady = null; imgData = u; }
  showPreview(u);
};

// CREATE (POST) және UPDATE (PUT/PATCH)
$('form').addEventListener('submit', async e => {
  e.preventDefault();
  if (imgReady) await imgReady;                  // файл әлі оқылып жатса, күтеміз
  const body = { title: $('title').value.trim(), price: Number($('price').value), category: $('category').value.trim() };
  const thumbnail = imgData;                     // суретті серверге жібермейміз (үлкен), тек бетте сақтаймыз
  $('modal').close();
  if (editing === null) {
    const r = await api('POST', '/products/add', body);
    // сервер әр жаңа өнімге бірдей id (195) береді, сондықтан өз id-мізді қоямыз
    if (r.ok) all.unshift({ ...body, ...r.data, id: 'local-' + (++localSeq), thumbnail, local: true });
  } else {
    const cur = all.find(p => p.id === editing);
    if (cur.local) {                             // жергілікті өнім: серверде жоқ, бетте ғана өзгертеміз
      all = all.map(p => p.id === editing ? { ...p, ...body, thumbnail: thumbnail || p.thumbnail } : p);
    } else {
      const r = await api($('method').value, '/products/' + editing, body);
      if (r.ok) all = all.map(p => p.id === editing ? { ...p, ...r.data, thumbnail: thumbnail || p.thumbnail } : p);
    }
  }
  applyFilter();
});

// READ (бір өнім): GET /products/{id} және ТОЛЫҚ ақпаратты модальды терезеде көрсету
const fmtDate = s => s ? new Date(s).toLocaleDateString('kk-KZ') : '';
const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

async function showInfo(p) {
  let d = p;
  if (!p.local) { // жергілікті қосылған өнім серверде жоқ, сондықтан сұрамаймыз
    const r = await api('GET', '/products/' + p.id);
    if (!r.ok) return;
    d = r.data;
  }

  // Негізгі сурет + кішкентай суреттер галереясы (басқанда үлкейеді)
  const imgs = (d.images && d.images.length) ? d.images : (d.thumbnail ? [d.thumbnail] : []);
  $('iimg').src = imgs[0] || ''; $('iimg').hidden = !imgs.length;
  $('igal').replaceChildren(...(imgs.length > 1
    ? imgs.map(src => h('img', { class: 'gthumb', src, alt: d.title, onclick: () => { $('iimg').src = src; } }))
    : []));
  $('ititle').textContent = d.title;

  // Бағасы: жеңілдік болса, жеңілдіктен кейінгі баға да көрсетіледі
  const disc = d.discountPercentage
    ? ` (жеңілдік ${d.discountPercentage}% → $${(d.price * (1 - d.discountPercentage / 100)).toFixed(2)})`
    : '';
  const dim = d.dimensions ? `${d.dimensions.width} × ${d.dimensions.height} × ${d.dimensions.depth}` : '';
  const m = d.meta || {};

  const rows = [
    ['ID', d.id],
    ['Категориясы', d.category],
    ['Бренд', d.brand],
    ['Бағасы', '$' + d.price + disc],
    ['Рейтинг', d.rating !== undefined ? `${d.rating} ${stars(d.rating)}` : undefined],
    ['Қоймада', d.stock !== undefined ? d.stock + (d.availabilityStatus ? ` (${d.availabilityStatus})` : '') : undefined],
    ['Ең аз тапсырыс', d.minimumOrderQuantity],
    ['SKU', d.sku],
    ['Штрих-код', m.barcode],
    ['Түрі (tags)', (d.tags || []).join(', ')],
    ['Өлшемі (E × Б × Т)', dim],
    ['Салмағы', d.weight],
    ['Кепілдік', d.warrantyInformation],
    ['Жеткізу', d.shippingInformation],
    ['Қайтару саясаты', d.returnPolicy],
    ['Қосылған күні', fmtDate(m.createdAt)],
    ['Жаңартылған күні', fmtDate(m.updatedAt)]
  ].filter(r => r[1] !== undefined && r[1] !== null && r[1] !== '');
  $('idl').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]));

  $('idesc').textContent = d.description || '';

  // Пікірлер
  const revs = d.reviews || [];
  $('irevh').hidden = !revs.length;
  $('irevh').textContent = `Пікірлер (${revs.length})`;
  $('irev').replaceChildren(...revs.map(v => h('div', { class: 'rev' },
    h('div', { class: 'rev-top' },
      h('b', {}, v.reviewerName || 'Анонимді'),
      h('span', { class: 'stars' }, stars(v.rating)),
      h('span', { class: 'mut' }, fmtDate(v.date))),
    h('p', { class: 'mut' }, v.comment || ''))));

  $('info').showModal();
}
$('iclose').onclick = () => $('info').close();

// DELETE
async function remove(p) {
  if (!p.local) {                                // серверде бар өнім ғана API арқылы жойылады
    const r = await api('DELETE', '/products/' + p.id);
    if (!r.ok) return;
  }
  all = all.filter(x => x.id !== p.id);
  applyFilter();
}

$('add').onclick = () => openModal(null);
$('cancel').onclick = () => $('modal').close();
$('sbtn').onclick = () => { query = $('q').value.trim(); applyFilter(); };
$('q').oninput = () => { query = $('q').value.trim(); applyFilter(); };
$('reset').onclick = () => { query = ''; $('q').value = ''; applyFilter(); };

load();