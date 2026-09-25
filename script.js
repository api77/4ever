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


/* ======================= 1-ТАПСЫРМА ======================= */
document.addEventListener('DOMContentLoaded', function () {

  // 1) ID бойынша элементті тауып, мәтінін өзгерту
  var mainTitle = document.getElementById('main-title');
  if (mainTitle) {
    mainTitle.textContent = 'Сәлем, әлем!';
  }

  // 2) Жаңа <div class="new-div"> жасап, body соңына қосу
  var newDiv = document.createElement('div');
  newDiv.className = 'new-div';
  newDiv.textContent = 'Мен жаңа элементпін';
  document.body.appendChild(newDiv);

  // 3) "old-element" класы бар элементті жою
  var oldElement = document.querySelector('.old-element');
  if (oldElement) {
    oldElement.remove();
  }

  // 4) "Бұл ауыспалы абзац" мәтіні бар <p> жасау
  var demoBlock = document.getElementById('dom-tasks-demo');
  var togglePara = document.createElement('p');
  togglePara.className = 'toggle-paragraph';
  togglePara.textContent = 'Бұл ауыспалы абзац';
  if (demoBlock) {
    demoBlock.appendChild(togglePara);
  } else {
    document.body.appendChild(togglePara);
  }

  // 5) Абзацты басқанда түс пен қаріп өлшемін өзгерту
  togglePara.addEventListener('click', function () {
    togglePara.classList.toggle('highlighted');
  });


  /* ======================= 2-ТАПСЫРМА ======================= */

  // 1) Элементке "active" класын қосу, ол бар болса — жою (toggle)
  var toggleTarget = document.getElementById('toggle-target');
  if (toggleTarget) {
    toggleTarget.addEventListener('click', function () {
      toggleTarget.classList.toggle('active');
    });
  }

  // 2) Барлық элементтердің кластарын консольге шығару
  console.log('=== Беттегі барлық элементтердің кластары ===');
  var allClassLines = [];
  document.querySelectorAll('*').forEach(function (el) {
    if (el.className && typeof el.className === 'string' && el.className.trim() !== '') {
      var line = '<' + el.tagName.toLowerCase() + '> — класстар: "' + el.className + '"';
      console.log(line);
      allClassLines.push(line);
    }
  });

  // Жеке-дара <p> тегтерінің кластарын шығару (консольге)
  console.log('=== Тек <p> тегтерінің кластары ===');
  var pClassLines = [];
  document.querySelectorAll('p').forEach(function (p, index) {
    var pLine = 'p[' + index + '] — класстар: "' + (p.className || '(класс жоқ)') + '"';
    console.log(pLine);
    pClassLines.push(pLine);
  });

  // Сол тізімді беттегі бөлек <p> элементінің ішіне де шығару
  var classListOutput = document.getElementById('class-list-output');
  if (classListOutput) {
    classListOutput.innerHTML =
      '<strong>Барлық класстар:</strong><br>' + allClassLines.join('<br>') +
      '<br><br><strong>Тек &lt;p&gt; тегтерінің класстары:</strong><br>' + pClassLines.join('<br>');
  }

});