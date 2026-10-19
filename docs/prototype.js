const screens = [...document.querySelectorAll('.screen')];
let selected = 1;
function show(id) {
  screens.forEach((screen) => screen.classList.toggle('hidden', screen.id !== id));
  window.scrollTo(0, 0);
}
const introKey = 'rp_election_intro_completed_2026';
let introFinished = false;
function finishIntro() {
  if (introFinished) return;
  introFinished = true;
  welcomeVideo.classList.add('fade-out');
  window.setTimeout(() => show('ballot'), 500);
}
const welcomeVideo = document.querySelector('#welcome-video');
welcomeVideo.addEventListener('ended', finishIntro, { once: true });
welcomeVideo.addEventListener('error', finishIntro, { once: true });
function playIntro() {
  introFinished = false;
  welcomeVideo.classList.remove('fade-out');
  welcomeVideo.currentTime = 0;
  show('home');
  welcomeVideo.play().catch(finishIntro);
}
playIntro();
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
    window.setTimeout(playIntro, 10_000);
  }, 1_500);
});
document.querySelector('#charts-button').addEventListener('click', (event) => {
  const charts = document.querySelector('#charts');
  charts.classList.toggle('hidden');
  event.currentTarget.textContent = charts.classList.contains('hidden') ? '▥  VER GRÁFICOS' : 'OCULTAR GRÁFICOS';
});