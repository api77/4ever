var VALID_TABS = ['team', 'adina', 'aqbota', 'alfiya', 'zhansaya'];

function openTab(id, updateHash) {
  if (VALID_TABS.indexOf(id) === -1) id = 'team';

  document.querySelectorAll('.panel').forEach(function (p) {
    p.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.classList.remove('active');
  });

  var panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');

  var btn = document.querySelector('.tab-btn[data-target="' + id + '"]');
  if (btn) btn.classList.add('active');

  // URL-ді сол адамның "жеке сілтемесіне" сәйкес жаңарту
  if (updateHash !== false) {
    var newHash = '#' + id;
    if (window.location.hash !== newHash) {
      history.pushState({ tab: id }, '', newHash);
    }
  }

  // Вкладка ауысқанда беттің басына айналдыру
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tabFromHash() {
  var hash = window.location.hash.replace('#', '');
  return VALID_TABS.indexOf(hash) !== -1 ? hash : 'team';
}

document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    openTab(btn.getAttribute('data-target'));
  });
});

// Артқа/алға батырмалары (навигация тарихы) арқылы ауысу
window.addEventListener('popstate', function () {
  openTab(tabFromHash(), false);
});

// Сайт бірінші ашылғанда URL-дегі сілтемеге қарай дұрыс парақты көрсету
document.addEventListener('DOMContentLoaded', function () {
  openTab(tabFromHash(), false);
});
