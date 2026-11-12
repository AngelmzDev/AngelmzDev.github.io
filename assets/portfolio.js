(() => {
  'use strict';
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('site-header');
  const hero = document.getElementById('home');
  const stage = document.querySelector('.video-stage');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const slider = document.getElementById('video-position');
  const motionButton = document.getElementById('toggle-motion');
  const hint = document.getElementById('video-hint');
  const videoStatus = document.getElementById('video-status');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const narrow = matchMedia('(max-width: 767px)');
  let interactionEnabled = !motionPreference.matches;
  let touch = null;
  let touchId = null;
  let videoFailed = false;

  // Poses extracted by scripts/build-gaze-frames.sh, ordered left → right.
  // Each value is the approximate head yaw in degrees (negative = looking
  // towards the left of the screen), so the turn speed stays proportional
  // even though the source has more in-between poses on the left side.
  const GAZE_POSES = [-62, -56, -50, -43, -36, -29, -21, -12, 0, 24, 40];
  const MIN_YAW = GAZE_POSES[0];
  const MAX_YAW = GAZE_POSES[GAZE_POSES.length - 1];
  const SRC_W = 1280, SRC_H = 720;
  const HEAD = { x: 650 / SRC_W, y: 280 / SRC_H }; // eyes, in source coords
  const frames = GAZE_POSES.map((_, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = `assets/gaze/${String(i).padStart(2, '0')}.webp`;
    return img;
  });

  // Spring state: the head eases towards the target instead of snapping.
  let yaw = 0, yawVel = 0, targetYaw = 0;
  let par = { x: 0, y: 0 }, parTarget = { x: 0, y: 0 };
  let drawnYaw = NaN, rafId = 0, lastTs = 0, ready = false;
  let layout = { scale: 1, ox: 0, oy: 0 };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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
    const value = Math.round((targetYaw - MIN_YAW) / (MAX_YAW - MIN_YAW) * 1000);
    slider.value = String(value);
    const side = targetYaw < -4 ? 'a la izquierda' : targetYaw > 4 ? 'a la derecha' : 'al frente';
    slider.setAttribute('aria-valuetext', `Mirando ${side}`);
  }

  // Canvas sized like object-fit: cover, honouring the CSS object-position.
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.max(w / SRC_W, h / SRC_H);
    const posX = narrow.matches ? 0.5 : 0.2;
    layout = { scale, ox: (w - SRC_W * scale) * posX, oy: (h - SRC_H * scale) * 0.5, dpr };
    drawnYaw = NaN;
    kick();
  }

  // Head position on screen, so the gaze points at the cursor itself.
  function headOnScreen() {
    const r = canvas.getBoundingClientRect();
    const sx = r.width / canvas.clientWidth || 1;
    return {
      x: r.left + (layout.ox + HEAD.x * SRC_W * layout.scale) * sx,
      y: r.top + (layout.oy + HEAD.y * SRC_H * layout.scale) * sx
    };
  }

  function yawFromX(clientX) {
    const head = headOnScreen();
    const reach = Math.max(innerWidth * 0.32, 180);
    const n = Math.atan((clientX - head.x) / reach) / (Math.PI / 2) * 1.35;
    return clamp(n < 0 ? -n * MIN_YAW : n * MAX_YAW, MIN_YAW, MAX_YAW);
  }

  function setTarget(nextYaw) {
    targetYaw = clamp(nextYaw, MIN_YAW, MAX_YAW);
    paintPosition();
    kick();
  }

  function draw() {
    const { scale, ox, oy, dpr } = layout;
    // Locate the two poses around the current yaw and cross-fade them.
    let i = 0;
    while (i < GAZE_POSES.length - 2 && yaw > GAZE_POSES[i + 1]) i++;
    const f = clamp((yaw - GAZE_POSES[i]) / (GAZE_POSES[i + 1] - GAZE_POSES[i]), 0, 1);
    // Short blend window keeps each pose crisp and hides ghosting.
    const t = clamp((f - 0.3) / 0.4, 0, 1);
    const blend = t * t * (3 - 2 * t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(frames[i], ox, oy, SRC_W * scale, SRC_H * scale);
    if (blend > 0.001) {
      ctx.globalAlpha = blend;
      ctx.drawImage(frames[i + 1], ox, oy, SRC_W * scale, SRC_H * scale);
    }
    drawnYaw = yaw;
  }

  function tick(ts) {
    rafId = 0;
    const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 1 / 60);
    lastTs = ts;
    // Critically damped spring (no overshoot), ~0.25 s to settle.
    const k = 140, c = 2 * Math.sqrt(k);
    yawVel += (k * (targetYaw - yaw) - c * yawVel) * dt;
    yaw += yawVel * dt;
    par.x += (parTarget.x - par.x) * Math.min(1, dt * 6);
    par.y += (parTarget.y - par.y) * Math.min(1, dt * 6);
    canvas.style.transform = `translate3d(${par.x.toFixed(2)}px, ${par.y.toFixed(2)}px, 0) scale(1.04)`;
    if (Math.abs(yaw - drawnYaw) > 0.05) draw();
    const moving = Math.abs(targetYaw - yaw) > 0.05 || Math.abs(yawVel) > 0.05 ||
      Math.abs(parTarget.x - par.x) > 0.1 || Math.abs(parTarget.y - par.y) > 0.1;
    if (moving) kick();
    else lastTs = 0;
  }

  function kick() {
    if (ready && !rafId && !document.hidden) rafId = requestAnimationFrame(tick);
  }

  function showVideoError() {
    if (videoFailed) return;
    videoFailed = true;
    interactionEnabled = false;
    updateHint();
    videoStatus.textContent = 'No se ha podido cargar la animación. Se mantiene la imagen de presentación.';
    slider.disabled = true;
    motionButton.disabled = true;
  }

  Promise.all(frames.map(img => img.decode ? img.decode() : new Promise((ok, ko) => {
    img.onload = ok; img.onerror = ko;
  }))).then(() => {
    ready = true;
    slider.disabled = false;
    resize();
    yaw = targetYaw;
    draw();
    stage.classList.add('is-ready');
    paintPosition();
  }, showVideoError);

  addEventListener('resize', resize, { passive: true });
  narrow.addEventListener('change', resize);

  function trackPointer(clientX, clientY) {
    if (!interactionEnabled || document.hidden || scrollY > hero.offsetHeight) return;
    setTarget(yawFromX(clientX));
    // Subtle parallax: the scene drifts a few pixels against the cursor.
    if (!motionPreference.matches) {
      parTarget = {
        x: -(clientX / innerWidth - 0.5) * 18,
        y: -(clientY / innerHeight - 0.5) * 10
      };
    }
  }

  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (event.target.closest('.video-controls, .mobile-menu') || document.body.classList.contains('menu-open')) return;
    trackPointer(event.clientX, event.clientY);
  }, { passive: true });
  // When the cursor leaves the window he looks back at the visitor.
  document.documentElement.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse' || !interactionEnabled) return;
    parTarget = { x: 0, y: 0 };
    setTarget(0);
  });
  document.addEventListener('visibilitychange', () => { lastTs = 0; kick(); });

  // Horizontal touch drags aim the gaze at the finger; pan-y keeps normal
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
    if (touch.horizontal) setTarget(yawFromX(event.clientX));
  });
  function stopTouch() { touch = null; touchId = null; }
  hero.addEventListener('pointerup', stopTouch);
  hero.addEventListener('pointercancel', stopTouch);
  slider.addEventListener('input', () => setTarget(MIN_YAW + Number(slider.value) / 1000 * (MAX_YAW - MIN_YAW)));
  motionButton.addEventListener('click', () => {
    interactionEnabled = !interactionEnabled;
    if (!interactionEnabled) { parTarget = { x: 0, y: 0 }; kick(); }
    updateHint();
  });
  motionPreference.addEventListener('change', () => {
    interactionEnabled = !motionPreference.matches;
    parTarget = { x: 0, y: 0 };
    kick();
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
