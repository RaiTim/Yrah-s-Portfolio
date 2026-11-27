/* ===== COMMON.JS: shared by every page. Hover sidebar + "Read more" on long text ===== */
const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const isMobile = matchMedia('(max-width: 900px)');
const canHover = matchMedia('(hover: hover)');
const hasCoarsePointer = matchMedia('(pointer: coarse)');
const usesSidebarToggle = () => isMobile.matches || hasCoarsePointer.matches || !canHover.matches;

/* ---------- SIDEBAR: slides out when the cursor reaches the left edge or the menu ---------- */
const sidebar = $('sidebar'), edgeTab = $('edgeTab'), sidebarClose = $('sidebarClose');
let pinned = false, hovering = false, closeTimer = 0;

function renderSidebar() {
  const open = pinned || hovering;
  root.classList.toggle('sidebar-closed', !open);
  edgeTab.setAttribute('aria-expanded', open);
  edgeTab.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
function setHover(on) {
  clearTimeout(closeTimer);
  if (on) { hovering = true; renderSidebar(); }
  else closeTimer = setTimeout(() => { hovering = false; renderSidebar(); }, 180);   /* short grace so it does not flicker */
}
function setSidebar(open) {            /* used by the backdrop, Escape, and the cover logo */
  clearTimeout(closeTimer);
  pinned = open;
  hovering = false;
  renderSidebar();
}
[edgeTab, sidebar].forEach((el) => {
  el.addEventListener('mouseenter', () => { if (!usesSidebarToggle()) setHover(true); });
  el.addEventListener('mouseleave', () => { if (!usesSidebarToggle()) setHover(false); });
});
edgeTab.addEventListener('focus', () => { if (!usesSidebarToggle()) setHover(true); });   /* keyboard users */
edgeTab.addEventListener('blur', (e) => { if (!usesSidebarToggle() && !sidebar.contains(e.relatedTarget)) setHover(false); });
sidebar.addEventListener('focusin', () => { if (!usesSidebarToggle()) setHover(true); });
sidebar.addEventListener('focusout', (e) => { if (!usesSidebarToggle() && !sidebar.contains(e.relatedTarget) && e.relatedTarget !== edgeTab) setHover(false); });
edgeTab.addEventListener('click', () => {
  if (!usesSidebarToggle()) return;
  const opening = !pinned;
  setSidebar(opening);
  if (opening) sidebarClose.focus();
});
sidebarClose.addEventListener('click', () => { setSidebar(false); edgeTab.focus(); });
$('backdrop').addEventListener('click', () => { setSidebar(false); edgeTab.focus(); });
sidebar.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { if (isMobile.matches || pinned) setSidebar(false); }));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !isMobile.matches) { setSidebar(false); if (sidebar.contains(document.activeElement)) document.activeElement.blur(); } });
renderSidebar();

/* ---------- IMAGE SLIDER: any container with more than 2 photos becomes an arrow + swipe slider ---------- */
const ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
function buildSlider(shots, anchor) {
  const box = document.createElement('div');
  box.className = 'img-slider';
  box.setAttribute('role', 'group'); box.setAttribute('aria-roledescription', 'carousel'); box.setAttribute('aria-label', 'Photo slider');
  const track = document.createElement('div'); track.className = 'ps-track';
  box.append(track);
  anchor.before(box);
  shots.forEach((s) => { const slide = document.createElement('div'); slide.className = 'ps-slide'; slide.append(s); track.append(slide); });
  const nav = document.createElement('div'); nav.className = 'ps-nav';
  nav.innerHTML = '<button class="ps-btn ps-prev" type="button" aria-label="Previous photo">' + ARROW_L + '</button><button class="ps-btn ps-next" type="button" aria-label="Next photo">' + ARROW_R + '</button>';
  box.append(nav);
  const slides = [...track.children];
  let i = 0;
  function show(n) {
    i = (n + slides.length) % slides.length;                       /* loops */
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    slides.forEach((p, k) => p.toggleAttribute('inert', k !== i));
  }
  nav.querySelector('.ps-prev').addEventListener('click', () => show(i - 1));
  nav.querySelector('.ps-next').addEventListener('click', () => show(i + 1));
  box.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
  let sx = 0, sy = 0;                                             /* swipe on phones */
  box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(i + (dx < 0 ? 1 : -1));
  }, { passive: true });
  show(0);
}
document.querySelectorAll('.shot-grid').forEach((grid) => {
  const shots = [...grid.querySelectorAll(':scope > .shot')];
  if (shots.length > 2) { buildSlider(shots, grid); grid.remove(); }
});
document.querySelectorAll('.card').forEach((card) => {
  if (card.closest('.carousel, .photo-slider')) return;
  const shots = [...card.querySelectorAll(':scope > .shot')];
  if (shots.length > 2) buildSlider(shots, shots[0]);
});

/* ---------- INDEPENDENT CARDS: opening one never makes its neighbour grow or move ---------- */
const isOpenCard = (k) => k.matches('.expanded, .open') || !!k.querySelector('.toggle-host.expanded');
function rowGuard(card, change) {
  const top = card.getBoundingClientRect().top;
  const mates = [...card.parentElement.children].filter((k) => k !== card && k.matches('.card, .paper-row') && Math.abs(k.getBoundingClientRect().top - top) < 4);
  if (!mates.length) { change(); return; }
  const group = [card, ...mates];
  const H = Math.max(...group.map((k) => +k.dataset.lockH || k.offsetHeight));   /* the equal height they share while collapsed */
  change();
  if (!group.some(isOpenCard)) group.forEach((k) => { k.style.height = ''; delete k.dataset.lockH; });
  else group.forEach((k) => { k.dataset.lockH = H; k.style.height = isOpenCard(k) ? 'auto' : H + 'px'; });
}

/* ---------- READ MORE / SHOW LESS: text over 150 words is cut and the rest opens from a top-right button ---------- */
const WORD_LIMIT = 150;
const BLOCKS = 'p:not(.crumb):not(.placeholder), dd, li, blockquote';
const SKIP = '.paper-text, .paper-more, .carousel, .photo-slider, .img-slider, .table-wrap, .shot, .lightbox';
const countWords = (el) => (el.textContent.match(/\S+/g) || []).length;

function cutBlock(b, keep) {                            /* keep the first `keep` words, move the rest into a hidden span */
  const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
  let n, seen = 0;
  while ((n = walker.nextNode())) {
    for (const m of n.data.matchAll(/\S+/g)) {
      if (++seen < keep) continue;
      const r = document.createRange();
      r.setStart(n, m.index + m[0].length); r.setEnd(b, b.childNodes.length);
      const rest = document.createElement('span'); rest.className = 'more-text';
      rest.append(r.extractContents());
      const dots = document.createElement('span'); dots.className = 'ellipsis'; dots.textContent = '\u2026';
      b.append(dots, rest);
      return;
    }
  }
}
document.querySelectorAll('.card').forEach((card) => {
  if (card.closest(SKIP) || card.matches('.paper-row, .carousel')) return;
  const inner = card.classList.contains('zig-card') ? [...card.children].find((c) => c.tagName === 'DIV' && !c.matches('.shot, .img-slider')) : null;
  const host = inner || card;
  const blocks = [...host.querySelectorAll(BLOCKS)].filter((b) => !b.closest(SKIP) && !b.closest('table') && !b.querySelector(BLOCKS));
  if (blocks.reduce((t, b) => t + countWords(b), 0) <= WORD_LIMIT) return;

  let used = 0, cut = false;
  blocks.forEach((b) => {
    if (cut) { b.classList.add('more-block'); return; }
    const n = countWords(b), left = WORD_LIMIT - used;
    if (n <= left) { used += n; return; }
    cut = true;
    if (left < 5) b.classList.add('more-block'); else cutBlock(b, left);
  });
  host.querySelectorAll('dd.more-block').forEach((dd) => { const dt = dd.previousElementSibling; if (dt && dt.tagName === 'DT') dt.classList.add('more-block'); });
  host.querySelectorAll('ul, ol').forEach((l) => { if ([...l.children].every((li) => li.classList.contains('more-block'))) l.classList.add('more-block'); });

  host.classList.add('toggle-host');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'card-toggle'; btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="label">Read more</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  btn.addEventListener('click', () => rowGuard(card, () => {
    const open = host.classList.toggle('expanded');
    btn.setAttribute('aria-expanded', open);
    btn.querySelector('.label').textContent = open ? 'Show less' : 'Read more';
  }));
  host.prepend(btn);
});
