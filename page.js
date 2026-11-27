/* ===== PAGE.JS: scroll animations, page highlight and image viewer for the sub pages (needs common.js first) ===== */
/* fade-up when sections appear */
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

/* highlight the current section in the sidebar and in the sticky top bar (links that point inside this page) */
const navLinks = [...document.querySelectorAll('.sidebar .nav-link, .fs-bar a')].filter((l) => l.getAttribute('href').startsWith('#'));
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((l) => {
      const on = l.getAttribute('href') === '#' + e.target.id;
      l.classList.toggle('active', on);
      const bar = l.closest('.fs-bar-inner');
      if (on && bar) bar.scrollTo({ left: l.offsetLeft - bar.clientWidth / 2 + l.offsetWidth / 2, behavior: 'smooth' });   /* keep the active pill visible on phones */
    });
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('[data-nav]').forEach((el) => spy.observe(el));

/* image viewer: click any photo to open it, zoom with + / - or by clicking the picture */
const lb = $('lightbox');
if (lb) {
const stage = $('lbStage'), lbImg = $('lbImg');
let zoom = 1, lastFocus = null;
function setZoom(z, x, y) {
  z = Math.min(4, Math.max(1, z));
  const s = stage.getBoundingClientRect(), r = lbImg.getBoundingClientRect();
  x = x ?? s.left + s.width / 2;  y = y ?? s.top + s.height / 2;
  const fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;
  lbImg.style.width = z === 1 ? '' : s.width * z + 'px';
  lbImg.style.height = z === 1 ? '' : s.height * z + 'px';
  stage.scrollLeft = fx * lbImg.offsetWidth - (x - s.left);
  stage.scrollTop = fy * lbImg.offsetHeight - (y - s.top);
  zoom = z;
}
function openViewer(btn) {
  lastFocus = document.activeElement;
  const im = btn.querySelector('img');
  lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt;
  $('lbTitle').textContent = btn.dataset.title;
  lb.hidden = false; document.body.style.overflow = 'hidden';
  setZoom(1); $('lbClose').focus();
}
function closeViewer() { lb.hidden = true; document.body.style.overflow = ''; setZoom(1); if (lastFocus) lastFocus.focus(); }
document.querySelectorAll('.zoomable').forEach((b) => b.addEventListener('click', () => openViewer(b)));
$('lbClose').addEventListener('click', closeViewer);
$('lbIn').addEventListener('click', () => setZoom(zoom + 0.75));
$('lbOut').addEventListener('click', () => setZoom(zoom - 0.75));
$('lbReset').addEventListener('click', () => setZoom(1));
lbImg.addEventListener('click', (e) => setZoom(zoom > 1 ? 1 : 2.5, e.clientX, e.clientY));
stage.addEventListener('click', (e) => { if (e.target === stage) closeViewer(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!lb.hidden) closeViewer(); else if (isMobile.matches) setSidebar(false); }
  if (lb.hidden) return;
  if (e.key === '+' || e.key === '=') setZoom(zoom + 0.75);
  if (e.key === '-') setZoom(zoom - 0.75);
});
}
