// Floating music widget — integrates with the browser's active Media Session.
// Controls any <audio>/<video> on the page; hardware media keys route here
// via the Media Session API when this tab has focus.
(function () {
  'use strict';
  if (document.getElementById('music-widget')) return;

  // ── Inject markup ──────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'music-widget';
  root.className = 'mw mw--tiny';
  root.innerHTML = `
    <div class="mw-pill">
      <span class="mw-pill-icon" aria-hidden="true">♫</span>
      <span class="mw-pill-title">No media</span>
      <button class="mw-pill-play mw-ctrl-btn" aria-label="Play or pause">▶</button>
      <button class="mw-pill-expand mw-ctrl-btn" aria-label="Expand player">⤢</button>
    </div>
    <div class="mw-card">
      <button class="mw-card-close mw-ctrl-btn" aria-label="Collapse player">✕</button>
      <div class="mw-artwork">
        <img class="mw-art-img" src="" alt="Album art" />
        <div class="mw-art-placeholder" aria-hidden="true">♫</div>
      </div>
      <p class="mw-card-title">No media playing</p>
      <p class="mw-card-artist">—</p>
      <div class="mw-card-controls">
        <button class="mw-btn-prev mw-ctrl-btn" aria-label="Previous / Rewind 10 s">⏮</button>
        <button class="mw-btn-play mw-ctrl-btn" aria-label="Play or pause">▶</button>
        <button class="mw-btn-next mw-ctrl-btn" aria-label="Next / Forward 10 s">⏭</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ── State ──────────────────────────────────────────────────────────────────
  let isPlaying = false;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function qs(sel) { return root.querySelector(sel); }

  function pageMedia() {
    // Exclude any silence shim audio elements used by other scripts
    return document.querySelector('audio:not([data-mw-shim]), video');
  }

  function syncPlayIcons() {
    const icon = isPlaying ? '⏸' : '▶';
    qs('.mw-pill-play').textContent = icon;
    qs('.mw-btn-play').textContent = icon;
  }

  // ── Display update ─────────────────────────────────────────────────────────
  function applyMeta(meta) {
    const title = meta?.title || 'No media playing';
    const artist = meta?.artist || '—';
    qs('.mw-card-title').textContent = title;
    qs('.mw-card-artist').textContent = artist;
    qs('.mw-pill-title').textContent = meta?.title || 'No media';

    const img = qs('.mw-art-img');
    const ph  = qs('.mw-art-placeholder');
    const art  = meta?.artwork;
    const best = art && art.length ? art[art.length - 1] : null;

    if (best && best.src) {
      if (img.src !== best.src) img.src = best.src;
      img.style.display = '';
      ph.style.display  = 'none';
    } else {
      img.style.display = 'none';
      ph.style.display  = '';
    }
  }

  // ── Media Session polling ──────────────────────────────────────────────────
  function poll() {
    const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;

    if (ms) {
      applyMeta(ms.metadata);
      if (ms.playbackState === 'playing') isPlaying = true;
      else if (ms.playbackState === 'paused') isPlaying = false;
    }

    // Prefer page media element's actual state
    const media = pageMedia();
    if (media) isPlaying = !media.paused;

    syncPlayIcons();
  }

  // ── Register hardware media key handlers ───────────────────────────────────
  function registerHandlers() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safe = (type, fn) => { try { ms.setActionHandler(type, fn); } catch (_) {} };

    safe('play',           () => { isPlaying = true;  syncPlayIcons(); });
    safe('pause',          () => { isPlaying = false; syncPlayIcons(); });
    safe('previoustrack',  () => doSeek(-10));
    safe('nexttrack',      () => doSeek(10));
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  function doTogglePlay() {
    const media = pageMedia();
    if (media) {
      if (media.paused) { media.play().catch(() => {}); isPlaying = true; }
      else              { media.pause();                isPlaying = false; }
    } else {
      isPlaying = !isPlaying;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    }
    syncPlayIcons();
  }

  function doSeek(delta) {
    const media = pageMedia();
    if (media && isFinite(media.duration)) {
      media.currentTime = Math.max(0, Math.min(media.duration, media.currentTime + delta));
    }
  }

  // ── Size toggle ────────────────────────────────────────────────────────────
  function setSize(medium) {
    root.classList.toggle('mw--medium', medium);
    root.classList.toggle('mw--tiny',  !medium);
  }

  // ── Event wiring ───────────────────────────────────────────────────────────
  qs('.mw-pill-expand').addEventListener('click', () => setSize(true));
  qs('.mw-card-close').addEventListener('click',  () => setSize(false));
  qs('.mw-pill-play').addEventListener('click',   doTogglePlay);
  qs('.mw-btn-play').addEventListener('click',    doTogglePlay);
  qs('.mw-btn-prev').addEventListener('click',    () => doSeek(-10));
  qs('.mw-btn-next').addEventListener('click',    () => doSeek(10));

  // ── Boot ───────────────────────────────────────────────────────────────────
  registerHandlers();
  poll();
  setInterval(poll, 1500);
})();
