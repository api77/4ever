const BASE = 'https://dummyjson.com';
const $ = id => document.getElementById(id);
const h = (t, a = {}, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'class' ? e.className = v : e.setAttribute(k, v); e.append(...c); return e; };

let list = [], listUserId = null;      // негізгі беттегі таскілер
let users = {};                        // авторлар кэші: id -> { username, image, ... }
let mUserId = null, mUser = null, mTodos = [];   // модальды терезедегі автор және оның таскілері
let filter = 'all', sort = 'default';            // автор терезесінің фильтрі мен сортировкасы
let lfilter = 'all', lsort = 'default';          // негізгі беттің фильтрі мен сортировкасы
let editing = null;                    // өзгертіліп жатқан таск id-і (null = жаңа таск)
let localSeq = 0, reqSeq = 0, mSeq = 0;

// Барлық HTTP сұраныс осы функция арқылы өтеді (статус код консольде ғана)
async function api(method, path, body, quiet) {
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
  if (!ok && !quiet) alert(`Қате: ${method} ${path} → ${status}`);
  return { ok, status, data };
}

// <dialog> ашу: showModal жұмыс істемесе, open атрибуты арқылы
function openDialog(d) {
  try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
}

function avatar(src, cls = '') {
  const c = 'avatar ' + cls;
  if (!src) return h('div', { class: c });
  const img = h('img', { class: c, src, alt: '' });
  img.addEventListener('error', () => img.removeAttribute('src'));
  return img;
}

// Фильтр + сортировка (басты бет пен автор терезесінде ортақ)
function applyView(arr, f, s) {
  let a = arr.filter(t => f === 'all' || (f === 'done') === t.completed);
  if (s === 'az') a = [...a].sort((x, y) => x.todo.localeCompare(y.todo));
  if (s === 'za') a = [...a].sort((x, y) => y.todo.localeCompare(x.todo));
  if (s === 'status') a = [...a].sort((x, y) => x.completed - y.completed);
  return a;
}

/* ---------- READ: таскілер тізімі (негізгі бет) ---------- */
async function loadList() {
  const my = ++reqSeq;
  const raw = $('uid').value.trim();
  listUserId = raw ? Number(raw) : null;
  $('list').replaceChildren(h('p', { class: 'mut' }, 'Жүктелуде…'));
  // ID берілсе — сол қолданушының таскілері, әйтпесе — алғашқы 12 таск
  const r = listUserId
    ? await api('GET', `/todos/user/${listUserId}?limit=0`, null, true)
    : await api('GET', '/todos?limit=12', null, true);
  if (my !== reqSeq) return;
  list = r.ok ? r.data.todos : [];
  renderList();
  // Әр таскінің userId бойынша автордың нигін GET /users/{id} арқылы аламыз
  await Promise.all([...new Set(list.map(t => t.userId))].filter(id => !users[id]).map(loadShortUser));
  if (my === reqSeq) renderList();
}

async function loadShortUser(id) {
  const r = await api('GET', `/users/${id}?select=username,firstName,lastName,image`, null, true);
  if (r.ok) users[id] = r.data;
}

function renderList() {
  const a = applyView(list, lfilter, lsort);
  const done = list.filter(t => t.completed).length;
  $('lcount').textContent = list.length ? `Таскілер: ${list.length}, орындалған: ${done}, көрсетілген: ${a.length}` : '';
  $('list').replaceChildren(...(a.length ? a.map(t => taskRow(t, true)) : [h('p', { class: 'mut' }, 'Тізім бос.')]));
}

// Бір таск жолы (тақтадағыдай): ✓ · мәтін · [аватар @ник] · ✕
function taskRow(t, withNick) {
  const u = users[t.userId];
  return h('div', { class: 'task' + (t.completed ? ' done' : '') },
    h('input', { type: 'checkbox', 'aria-label': 'Орындалды', ...(t.completed ? { checked: '' } : {}), onchange: e => toggle(t, e.target.checked) }),
    h('button', { class: 'ttext', type: 'button', title: 'Өзгерту', onclick: () => openTask(t, t.userId, true) }, t.todo),
    ...(withNick ? [h('button', { class: 'chip', type: 'button', title: 'Автор туралы толық ақпарат', onclick: () => openAuthor(t.userId) },
      avatar(u && u.image, 'sm'), '@' + (u ? u.username : '…'))] : []),
    h('button', { class: 'btn d x', type: 'button', 'aria-label': 'Жою', title: 'Жою', onclick: () => remove(t) }, '✕'));
}

/* ---------- Модальды терезе: екіге бөлінген ---------- */
async function openAuthor(id) {
  const my = ++mSeq;
  mUserId = id; mUser = null; mTodos = [];
  filter = 'all'; sort = 'default'; $('flt').value = 'all'; $('srt').value = 'default';
  $('mimg').hidden = true; $('mnick').textContent = '@' + (users[id] ? users[id].username : '…'); $('mname').textContent = '';
  $('mdl').replaceChildren(); $('mcount').textContent = '';
  $('mlist').replaceChildren(h('p', { class: 'mut' }, 'Жүктелуде…'));
  openDialog($('umodal'));
  // Сол жақ: GET /users/{id} (толық), оң жақ: GET /todos/user/{id}
  const [u, t] = await Promise.all([
    api('GET', '/users/' + id, null, true),
    api('GET', `/todos/user/${id}?limit=0`, null, true)
  ]);
  if (my !== mSeq) return;
  if (!u.ok) { $('mlist').replaceChildren(h('p', { class: 'mut' }, `Қолданушыны жүктеу мүмкін болмады (${u.status}).`)); return; }
  mUser = u.data; users[id] = { ...users[id], ...mUser };
  mTodos = t.ok ? t.data.todos : [];
  renderAuthor();
  renderModalTasks();
}

// Сол жақ бөлік: аватар, @ник, аты-жөні және толық ақпарат (ID жоқ)
function renderAuthor() {
  const d = mUser, a = d.address || {}, c = d.company || {}, hr = d.hair || {};
  $('mimg').src = d.image || ''; $('mimg').hidden = !d.image;
  $('mnick').textContent = '@' + d.username;
  $('mname').textContent = `${d.firstName} ${d.lastName}`;
  const rows = [
    ['Жасы', d.age],
    ['Жынысы', d.gender],
    ['Email', d.email],
    ['Телефон', d.phone],
    ['Туған күні', d.birthDate],
    ['Қан тобы', d.bloodGroup],
    ['Бойы / салмағы', d.height && d.weight ? `${d.height} см / ${d.weight} кг` : ''],
    ['Көз түсі', d.eyeColor],
    ['Шашы', [hr.color, hr.type].filter(Boolean).join(', ')],
    ['Мекенжайы', [a.address, a.city, a.state, a.country, a.postalCode].filter(Boolean).join(', ')],
    ['Университет', d.university],
    ['Компания', c.name],
    ['Бөлім', c.department],
    ['Лауазымы', c.title],
    ['Рөлі', d.role]
  ].filter(r => r[1] !== undefined && r[1] !== null && r[1] !== '');
  $('mdl').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]));
}

// Оң жақ бөлік: фильтр + сортировка
function view() { return applyView(mTodos, filter, sort); }

function renderModalTasks() {
  const a = view(), done = mTodos.filter(t => t.completed).length;
  $('mcount').textContent = `Барлығы: ${mTodos.length}, орындалған: ${done}, көрсетілген: ${a.length}`;
  $('mlist').replaceChildren(...(a.length ? a.map(t => taskRow(t, false)) : [h('p', { class: 'mut' }, 'Тізім бос.')]));
}

function renderAll() { renderList(); if (mUser) renderModalTasks(); }
const patchLocal = (id, f) => {
  list = list.map(x => x.id === id ? { ...x, ...f } : x);
  mTodos = mTodos.map(x => x.id === id ? { ...x, ...f } : x);
};

/* ---------- UPDATE: орындалды белгісі (PATCH /todos/{id}) ---------- */
async function toggle(t, completed) {
  if (!t.local) {                               // серверде бар таск ғана API арқылы өзгереді
    const r = await api('PATCH', '/todos/' + t.id, { completed });
    if (!r.ok) { renderAll(); return; }
  }
  patchLocal(t.id, { completed });
  renderAll();
}

/* ---------- CREATE (POST) және UPDATE мәтін (PATCH) ---------- */
// uid — қолданушы ID, lock = true болса ID өрісі өзгертілмейді
function openTask(t, uid, lock) {
  editing = t ? t.id : null;
  $('ttitle').textContent = t ? 'Тасктi өзгерту' : 'Жаңа таск';
  $('ttext').value = t ? t.todo : '';
  $('tuid').value = uid ?? '';
  $('tuid').readOnly = !!lock;
  openDialog($('tmodal'));
  (lock || uid ? $('ttext') : $('tuid')).focus();
}

$('tform').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('ttext').value.trim();
  const userId = Number($('tuid').value);
  if (!text || !userId) return;
  $('tmodal').close();
  if (editing === null) {
    const r = await api('POST', '/todos/add', { todo: text, completed: false, userId });
    // сервер әр жаңа таскіге бірдей id береді, сондықтан өз id-мізді қоямыз
    if (r.ok) {
      const nt = { todo: text, completed: false, userId, id: 'local-' + (++localSeq), local: true };
      if (mUser && mUserId === userId) mTodos.unshift(nt);        // автор терезесі осы қолданушыныкі болса
      if (!listUserId || listUserId === userId) list.unshift(nt); // басты бет сәйкес келсе
      if (!users[userId]) await loadShortUser(userId);            // ник пен аватарды алу
    }
  } else {
    const cur = [...mTodos, ...list].find(x => x.id === editing);
    let ok = true;
    if (!cur.local) ok = (await api('PATCH', '/todos/' + editing, { todo: text })).ok;
    if (ok) patchLocal(editing, { todo: text });
  }
  renderAll();
});

/* ---------- DELETE (DELETE /todos/{id}) ---------- */
async function remove(t) {
  if (!t.local) {
    const r = await api('DELETE', '/todos/' + t.id);
    if (!r.ok) return;
  }
  list = list.filter(x => x.id !== t.id);
  mTodos = mTodos.filter(x => x.id !== t.id);
  renderAll();
}

/* ---------- Басқару элементтері ---------- */
$('uform').addEventListener('submit', e => { e.preventDefault(); loadList(); });
$('flt').onchange = () => { filter = $('flt').value; renderModalTasks(); };
$('srt').onchange = () => { sort = $('srt').value; renderModalTasks(); };
$('lflt').onchange = () => { lfilter = $('lflt').value; renderList(); };
$('lsrt').onchange = () => { lsort = $('lsrt').value; renderList(); };
$('tadd').onclick = () => openTask(null, mUserId, true);       // автор терезесінен: ID бекітілген
$('ladd').onclick = () => openTask(null, listUserId, false);   // басты беттен: ID-ді өзіңіз жазасыз
$('tcancel').onclick = () => $('tmodal').close();
$('mclose').onclick = () => $('umodal').close();
for (const d of [$('umodal'), $('tmodal')]) d.addEventListener('click', e => { if (e.target === d) d.close(); }); // фонды басқанда жабылады

loadList();