(() => {
  'use strict';
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('site-header');
  const hero = document.getElementById('home');
  const video = document.getElementById('hero-video');
  const slider = document.getElementById('video-position');
  const motionButton = document.getElementById('toggle-motion');
  const hint = document.getElementById('video-hint');
  const videoStatus = document.getElementById('video-status');
  const coarsePointer = matchMedia('(pointer: coarse)');
  let interactionEnabled = !motionPreference.matches;
  let lastMouseX = null;
  let targetTime = 0;
  let maxTime = 0;
  let seekQueued = false;
  let touch = null;
  let touchId = null;
  let videoFailed = false;

  const updateHeader = () => header.classList.toggle('scrolled', scrollY > 35);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  function updateHint() {
    hint.textContent = videoFailed ? 'Vídeo no disponible' : interactionEnabled
      ? (coarsePointer.matches ? 'Arrastra para explorar ↔' : 'Mueve el ratón para explorar ↔')
      : 'Explora con la barra ↔';
    motionButton.setAttribute('aria-pressed', String(!interactionEnabled));
    const label = interactionEnabled ? 'Pausar interacción del vídeo' : 'Activar interacción del vídeo';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.firstElementChild.textContent = interactionEnabled ? 'Ⅱ' : '▷';
  }

  function paintPosition() {
    const value = maxTime ? Math.round(targetTime / maxTime * 1000) : 0;
    slider.value = String(value);
    slider.setAttribute('aria-valuetext', `${Math.round(value / 10)} por ciento del vídeo`);
  }

  // Only one native seek can be in flight. New pointer events update the target;
  // seeked then advances to the latest target instead of flooding the decoder.
  function seekFrame() {
    seekQueued = false;
    if (!maxTime || video.seeking || video.error) return;
    if (Math.abs(video.currentTime - targetTime) < 1 / 48) return;
    video.currentTime = targetTime;
  }

  function requestFrame(time) {
    if (!maxTime) return;
    targetTime = Math.max(0, Math.min(maxTime, time));
    paintPosition();
    if (!seekQueued && !video.seeking) {
      seekQueued = true;
      requestAnimationFrame(seekFrame);
    }
  }

  video.addEventListener('seeked', () => {
    if (Math.abs(video.currentTime - targetTime) >= 1 / 48 && !seekQueued) {
      seekQueued = true;
      requestAnimationFrame(seekFrame);
    }
  });

  function initializeVideo() {
    if (!Number.isFinite(video.duration) || video.duration <= 0 || maxTime) return;
    video.muted = true;
    video.pause();
    maxTime = Math.max(0, video.duration - 1 / 24);
    slider.disabled = false;
    requestFrame(maxTime * 0.5);
  }
  video.addEventListener('loadedmetadata', initializeVideo);
  video.addEventListener('loadeddata', seekFrame);
  if (video.readyState >= 1) initializeVideo();
  function showVideoError() {
    videoFailed = true;
    interactionEnabled = false;
    updateHint();
    hint.textContent = 'Vídeo no disponible';
    videoStatus.textContent = 'No se ha podido cargar el vídeo. Se mantiene la imagen de presentación.';
    slider.disabled = true;
    motionButton.disabled = true;
  }
  video.addEventListener('error', showVideoError);
  video.querySelector('source').addEventListener('error', showVideoError);
  // A fast network failure can precede this deferred script.
  if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) showVideoError();

  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const previous = lastMouseX;
    lastMouseX = event.clientX;
    if (previous === null || !interactionEnabled || document.hidden || scrollY > hero.offsetHeight) return;
    if (event.target.closest('.video-controls, .mobile-menu') || document.body.classList.contains('menu-open')) return;
    requestFrame(targetTime - (event.clientX - previous) / innerWidth * 0.8 * video.duration);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { lastMouseX = null; });
  document.addEventListener('visibilitychange', () => { lastMouseX = null; });

  // Horizontal touch drags control the same timeline; pan-y keeps normal
  // vertical page scrolling. Links, buttons and the range keep their actions.
  hero.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !interactionEnabled || event.target.closest('a, button, input')) return;
    touch = { x: event.clientX, y: event.clientY, horizontal: false };
    touchId = event.pointerId;
  });
  hero.addEventListener('pointermove', event => {
    if (!touch || event.pointerId !== touchId || !interactionEnabled) return;
    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    if (!touch.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      touch.horizontal = true;
      hero.setPointerCapture(event.pointerId);
    }
    if (touch.horizontal) {
      requestFrame(targetTime - dx / innerWidth * 0.8 * video.duration);
      touch.x = event.clientX;
      touch.y = event.clientY;
    }
  });
  function stopTouch() { touch = null; touchId = null; }
  hero.addEventListener('pointerup', stopTouch);
  hero.addEventListener('pointercancel', stopTouch);
  slider.addEventListener('input', () => requestFrame(Number(slider.value) / 1000 * maxTime));
  motionButton.addEventListener('click', () => {
    interactionEnabled = !interactionEnabled;
    lastMouseX = null;
    updateHint();
  });
  motionPreference.addEventListener('change', () => {
    interactionEnabled = !motionPreference.matches;
    lastMouseX = null;
    updateHint();
  });
  coarsePointer.addEventListener('change', updateHint);
  updateHint();

  const typewriter = document.getElementById('typewriter');
  const cursor = document.getElementById('typing-cursor');
  const fullText = typewriter.textContent;
  let typeTimer;
  if (!motionPreference.matches) {
    typewriter.textContent = '';
    cursor.hidden = false;
    let index = 0;
    function typeNext() {
      if (motionPreference.matches) {
        typewriter.textContent = fullText;
        cursor.hidden = true;
        return;
      }
      typewriter.textContent = fullText.slice(0, ++index);
      if (index < fullText.length) typeTimer = setTimeout(typeNext, 38);
      else cursor.hidden = true;
    }
    typeTimer = setTimeout(typeNext, 600);
  }
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      clearTimeout(typeTimer);
      typewriter.textContent = fullText;
      cursor.hidden = true;
    }
  });

  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const main = document.getElementById('main');
  const footer = document.getElementById('footer');
  function setMenu(open, returnFocus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.hidden = !open;
    main.inert = open;
    footer.inert = open;
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector('a').focus({ preventScroll: true });
    else if (returnFocus) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true', true));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { setMenu(false, true); return; }
    if (event.key === 'Tab') {
      const focusable = [toggle, ...menu.querySelectorAll('a')];
      const current = focusable.indexOf(document.activeElement);
      const next = event.shiftKey
        ? (current <= 0 ? focusable.length - 1 : current - 1)
        : (current + 1) % focusable.length;
      event.preventDefault();
      focusable[next].focus();
    }
  });
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  const copyButton = document.getElementById('copy-email');
  const copyStatus = document.getElementById('copy-status');
  copyButton.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('amzzdev@proton.me');
      copyStatus.textContent = 'Correo copiado.';
    } catch {
      copyStatus.textContent = 'Puedes seleccionar el correo o pulsarlo para escribir.';
    }
  });
})();
