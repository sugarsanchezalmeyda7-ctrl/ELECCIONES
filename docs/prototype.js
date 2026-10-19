const screens = [...document.querySelectorAll('.screen')];
let selected = 1;
function show(id) {
  screens.forEach((screen) => screen.classList.toggle('hidden', screen.id !== id));
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => show(button.dataset.view)));
document.querySelectorAll('[data-option]').forEach((button) => button.addEventListener('click', () => {
  selected = Number(button.dataset.option);
  document.querySelector('#selected-option').textContent = `OPCIÓN 0${selected}`;
  show('confirm');
}));
document.querySelector('#confirm-button').addEventListener('click', () => {
  show('success');
  window.setTimeout(() => {
    show('whiteout');
    window.setTimeout(() => show('home'), 10_000);
  }, 1_500);
});
document.querySelector('#charts-button').addEventListener('click', (event) => {
  const charts = document.querySelector('#charts');
  charts.classList.toggle('hidden');
  event.currentTarget.textContent = charts.classList.contains('hidden') ? '▥  VER GRÁFICOS' : 'OCULTAR GRÁFICOS';
});