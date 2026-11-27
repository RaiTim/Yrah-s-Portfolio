/* ===== SCRIPT.JS: Home page animations, Read more, image viewer, carousels (needs common.js first) ===== */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. SIDEBAR: hover behaviour lives in common.js; the cover logo also opens it (touch screens) ---------- */
$('heroLogo').addEventListener('click', () => setSidebar(!(pinned || hovering)));

/* ---------- 2. SCROLL ANIMATIONS ---------- */
const hero = $('home');
const slides = document.querySelectorAll('.full-slide');
const navLinks = sidebar.querySelectorAll('.nav-link');
let ticking = false;

function setActive(id) {
  navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
}
function update() {
  const vh = window.innerHeight;
  root.classList.toggle('scrolled', window.scrollY > vh * 0.3);
  const atHome = window.scrollY < vh * 0.3;
  if (atHome) setActive('home');
  if (!reduceMotion) {
    hero.style.setProperty('--p', Math.min(Math.max(window.scrollY / vh, 0), 1).toFixed(3));
    slides.forEach((s) => {
      const t = Math.min(Math.max(s.getBoundingClientRect().top / vh, 0), 1);
      s.style.setProperty('--enter', t.toFixed(3));   /* About Me slide zooms in as it arrives */
    });
  }
  ticking = false;
}
window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
window.addEventListener('resize', update);
update();

/* fade-up when sections appear */
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

/* highlight the current page in the sidebar */
let carInView = false;
const slideIds = ['biography', 'knowing-myself', 'curriculum-vitae'];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.target.id === 'about-slides') { carInView = e.isIntersecting; if (carInView) setActive(slideIds[about.cur]); return; }
    if (e.isIntersecting) setActive(e.target.id);
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('[data-nav]').forEach((el) => spy.observe(el));

/* ---------- 3. READ MORE (text and image move together) ---------- */
document.querySelectorAll('.paper-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const row = btn.closest('.paper-row');
    rowGuard(row, () => {                              /* the neighbouring row keeps its own height */
      const open = row.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.querySelector('.label').textContent = open ? 'Show less' : 'Read more';
    });
  });
});

/* Acknowledgement and Dedication share one height through CSS (grid stretch) */

/* ---------- 4. IMAGE VIEWER (pop-out with zoom) ---------- */
const lb = $('lightbox'), stage = $('lbStage'), lbImg = $('lbImg');
let zoom = 1, lastFocus = null;

function setZoom(z, x, y) {
  z = Math.min(4, Math.max(1, z));
  const s = stage.getBoundingClientRect(), r = lbImg.getBoundingClientRect();
  x = x ?? s.left + s.width / 2;  y = y ?? s.top + s.height / 2;
  const fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;   /* spot to keep under the pointer */
  const baseW = s.width, baseH = s.height;
  lbImg.style.width = z === 1 ? '' : baseW * z + 'px';
  lbImg.style.height = z === 1 ? '' : baseH * z + 'px';
  stage.scrollLeft = fx * lbImg.offsetWidth - (x - s.left);
  stage.scrollTop = fy * lbImg.offsetHeight - (y - s.top);
  zoom = z;
}
function openViewer(btn) {
  lastFocus = document.activeElement;
  lbImg.src = btn.querySelector('img').src;
  lbImg.alt = btn.querySelector('img').alt;
  $('lbTitle').textContent = btn.dataset.title;
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  setZoom(1);
  $('lbClose').focus();
}
function closeViewer() {
  lb.hidden = true;
  document.body.style.overflow = '';
  setZoom(1);
  if (lastFocus) lastFocus.focus();
}
document.querySelectorAll('.zoomable').forEach((b) => b.addEventListener('click', () => openViewer(b)));
$('lbClose').addEventListener('click', closeViewer);
$('lbIn').addEventListener('click', () => setZoom(zoom + 0.75));
$('lbOut').addEventListener('click', () => setZoom(zoom - 0.75));
$('lbReset').addEventListener('click', () => setZoom(1));
lbImg.addEventListener('click', (e) => setZoom(zoom > 1 ? 1 : 2.5, e.clientX, e.clientY));  /* click the image to zoom */
stage.addEventListener('click', (e) => { if (e.target === stage) closeViewer(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!lb.hidden) closeViewer(); else if (isMobile.matches) setSidebar(false); }
  if (lb.hidden) return;
  if (e.key === '+' || e.key === '=') setZoom(zoom + 0.75);
  if (e.key === '-') setZoom(zoom - 0.75);
});

/* ---------- 5. CAROUSELS (About Me, Pre-Deployment Seminar): arrows, tabs, swipe, loop ---------- */
function initCarousel(card) {
  const track = card.querySelector('.car-track'), viewport = card.querySelector('.car-viewport'), titleEl = card.querySelector('.car-title');
  const slides = [...card.querySelectorAll('.car-slide')], tabs = [...card.querySelectorAll('.car-tab')];
  const api = { cur: 0, onChange: null };

  const size = () => { viewport.style.height = slides[api.cur].offsetHeight + 'px'; };
  function goTo(i) {
    api.cur = (i + slides.length) % slides.length;     /* wraps around both ways */
    track.style.transform = 'translateX(' + (-api.cur * 100) + '%)';
    slides.forEach((s, k) => { s.toggleAttribute('inert', k !== api.cur); s.setAttribute('aria-hidden', k !== api.cur); });
    tabs.forEach((t, k) => { t.classList.toggle('on', k === api.cur); t.setAttribute('aria-current', k === api.cur); });
    titleEl.textContent = slides[api.cur].dataset.title;
    size();
    if (api.onChange) api.onChange(api.cur);
  }
  card.querySelector('.car-prev').addEventListener('click', () => goTo(api.cur - 1));
  card.querySelector('.car-next').addEventListener('click', () => goTo(api.cur + 1));
  tabs.forEach((t) => t.addEventListener('click', () => goTo(+t.dataset.i)));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(api.cur - 1);
    if (e.key === 'ArrowRight') goTo(api.cur + 1);
  });
  let sx = 0, sy = 0;                                  /* swipe on phones */
  viewport.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  viewport.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(api.cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
  const ro = new ResizeObserver(size);
  ro.observe(track);
  slides.forEach((s) => ro.observe(s));
  api.goTo = goTo;
  goTo(0);
  return api;
}

const about = initCarousel($('aboutCarousel'));
about.onChange = (i) => { if (carInView) setActive(slideIds[i]); };
initCarousel($('preCarousel'));

/* photo slider inside Project ASCEND (loops; keeps swipes and arrow keys from moving the big box) */
document.querySelectorAll('.photo-slider').forEach((box) => {
  const track = box.querySelector('.ps-track'), photos = [...box.querySelectorAll('.ps-slide')];
  let i = 0;
  function show(n) {
    i = (n + photos.length) % photos.length;
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    photos.forEach((p, k) => p.toggleAttribute('inert', k !== i));
  }
  box.querySelector('.ps-prev').addEventListener('click', () => show(i - 1));
  box.querySelector('.ps-next').addEventListener('click', () => show(i + 1));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { show(i - 1); e.stopPropagation(); }
    if (e.key === 'ArrowRight') { show(i + 1); e.stopPropagation(); }
  });
  let sx = 0, sy = 0;
  box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; e.stopPropagation(); }, { passive: true });
  box.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(i + (dx < 0 ? 1 : -1));
    e.stopPropagation();
  }, { passive: true });
  show(0);
});

/* sidebar links for the three About Me pages open the carousel on the right page */
const slideLinks = { '#biography': 0, '#knowing-myself': 1, '#curriculum-vitae': 2 };
function showSlide(i) {
  about.goTo(i);
  $('about-slides').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
sidebar.querySelectorAll('a').forEach((a) => {
  const i = slideLinks[a.getAttribute('href')];
  if (i !== undefined) a.addEventListener('click', (e) => { e.preventDefault(); showSlide(i); });
});
if (location.hash in slideLinks) { about.goTo(slideLinks[location.hash]); setTimeout(() => showSlide(slideLinks[location.hash]), 100); }

/* ---------- 6. HOME BUTTONS (sidebar Home, round logos): jump straight to the cover ---------- */
document.querySelectorAll('a[href="#home"]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'instant' });
  setSidebar(false);
  history.replaceState(null, '', '#home');
}));
