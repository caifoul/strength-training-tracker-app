(function () {
  'use strict';
  if (document.getElementById('music-widget')) return;

  // Load the SoundCloud Widget API
  const scApi = document.createElement('script');
  scApi.src = 'https://w.soundcloud.com/player/api.js';
  document.head.appendChild(scApi);

  // ── Markup ─────────────────────────────────────────────────────────────────
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
        <button class="mw-btn-prev mw-ctrl-btn" aria-label="Previous">⏮</button>
        <button class="mw-btn-play mw-ctrl-btn" aria-label="Play or pause">▶</button>
        <button class="mw-btn-next mw-ctrl-btn" aria-label="Next">⏭</button>
      </div>
      <div class="mw-sc-section">
        <p class="mw-sc-label">SoundCloud</p>
        <div class="mw-sc-input-row">
          <input class="mw-sc-url" type="url" placeholder="Paste a track or playlist URL…" spellcheck="false" autocomplete="off" />
          <button class="mw-sc-load-btn mw-ctrl-btn">Load</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Hidden SC iframe — needs real off-screen dimensions so SC initialises properly
  const scIframe = document.createElement('iframe');
  scIframe.id = 'mw-sc-iframe';
  scIframe.setAttribute('allow', 'autoplay');
  scIframe.setAttribute('scrolling', 'no');
  scIframe.setAttribute('frameborder', 'no');
  scIframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:300px;height:166px;border:0;';
  document.body.appendChild(scIframe);

  // ── State ──────────────────────────────────────────────────────────────────
  let isPlaying = false;
  let scWidget  = null;

  function qs(sel) { return root.querySelector(sel); }

  // ── Icons ──────────────────────────────────────────────────────────────────
  function syncPlayIcons() {
    const icon = isPlaying ? '⏸' : '▶';
    qs('.mw-pill-play').textContent = icon;
    qs('.mw-btn-play').textContent  = icon;
  }

  // ── Metadata ───────────────────────────────────────────────────────────────
  function applySound(sound) {
    if (!sound) return;
    const title  = sound.title || 'Unknown track';
    const artist = sound.user?.username || sound.label_name || '—';
    const artUrl = sound.artwork_url
      ? sound.artwork_url.replace('-large', '-t300x300')
      : null;

    qs('.mw-card-title').textContent  = title;
    qs('.mw-card-artist').textContent = artist;
    qs('.mw-pill-title').textContent  = title;

    const img = qs('.mw-art-img');
    const ph  = qs('.mw-art-placeholder');
    if (artUrl) {
      img.src = artUrl;
      img.style.display = '';
      ph.style.display  = 'none';
    } else {
      img.style.display = 'none';
      ph.style.display  = '';
    }
  }

  // ── Load SoundCloud URL ────────────────────────────────────────────────────
  function loadSoundCloud(url) {
    if (!url.includes('soundcloud.com')) {
      alert('Please paste a valid SoundCloud URL.');
      return;
    }

    qs('.mw-card-title').textContent  = 'Loading…';
    qs('.mw-card-artist').textContent = '—';
    qs('.mw-pill-title').textContent  = 'Loading…';

    const embedSrc =
      'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
      '&color=%23cc00ff&auto_play=true&hide_related=true' +
      '&show_comments=false&show_user=true&show_reposts=false&show_teaser=false';

    scIframe.src = embedSrc;

    const tryBind = () => {
      if (!window.SC?.Widget) { setTimeout(tryBind, 300); return; }

      scWidget = window.SC.Widget(scIframe);

      scWidget.bind(window.SC.Widget.Events.READY, () => {
        scWidget.getCurrentSound(applySound);
      });

      scWidget.bind(window.SC.Widget.Events.PLAY, () => {
        isPlaying = true;
        syncPlayIcons();
        scWidget.getCurrentSound(applySound);
      });

      scWidget.bind(window.SC.Widget.Events.PAUSE, () => {
        isPlaying = false;
        syncPlayIcons();
      });

      scWidget.bind(window.SC.Widget.Events.FINISH, () => {
        isPlaying = false;
        syncPlayIcons();
      });
    };
    tryBind();
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  function doTogglePlay() {
    if (!scWidget) return;
    if (isPlaying) scWidget.pause();
    else           scWidget.play();
  }

  function doPrev() { if (scWidget) scWidget.prev(); }
  function doNext() { if (scWidget) scWidget.next(); }

  // ── Size toggle ────────────────────────────────────────────────────────────
  function setSize(medium) {
    root.classList.toggle('mw--medium', medium);
    root.classList.toggle('mw--tiny',   !medium);
  }

  // ── Event wiring ───────────────────────────────────────────────────────────
  qs('.mw-pill-expand').addEventListener('click', () => setSize(true));
  qs('.mw-card-close').addEventListener('click',  () => setSize(false));
  qs('.mw-pill-play').addEventListener('click',   doTogglePlay);
  qs('.mw-btn-play').addEventListener('click',    doTogglePlay);
  qs('.mw-btn-prev').addEventListener('click',    doPrev);
  qs('.mw-btn-next').addEventListener('click',    doNext);

  qs('.mw-sc-load-btn').addEventListener('click', () => {
    const url = qs('.mw-sc-url').value.trim();
    if (url) loadSoundCloud(url);
  });

  qs('.mw-sc-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const url = e.target.value.trim();
      if (url) loadSoundCloud(url);
    }
  });
})();
