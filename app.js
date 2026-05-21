// ============ Cursor — spring trail ============
(function () {
  const dot = document.querySelector('.cursor-dot');
  if (!dot) return;
  const trails = [...document.querySelectorAll('.cursor-trail')];

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my;
  const trailPos = trails.map(() => ({ x: mx, y: my }));

  // Show cursor on first move
  let shown = false;
  function show() {
    if (shown) return;
    shown = true;
    dot.classList.remove('hidden');
    trails.forEach((t) => t.classList.remove('hidden'));
  }
  dot.classList.add('hidden');
  trails.forEach((t) => t.classList.add('hidden'));

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    show();
  });
  window.addEventListener('mouseleave', () => {
    dot.classList.add('hidden');
    trails.forEach((t) => t.classList.add('hidden'));
    shown = false;
  });

  // Hover affordance — grow dot on interactive elements
  const interactiveSel = 'a, button, [data-detail], .path-card, input, [role="button"]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(interactiveSel)) dot.classList.add('hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest(interactiveSel)) {
      const to = e.relatedTarget;
      if (!to || !to.closest || !to.closest(interactiveSel)) dot.classList.remove('hover');
    }
  });

  function tick() {
    // main dot — tight lerp
    dx += (mx - dx) * 0.35;
    dy += (my - dy) * 0.35;
    dot.style.transform = `translate(${dx}px, ${dy}px)`;

    // trail — each lags behind the previous
    let prevX = dx, prevY = dy;
    const stiff = [0.28, 0.22, 0.16];
    trails.forEach((t, i) => {
      const p = trailPos[i];
      p.x += (prevX - p.x) * stiff[i];
      p.y += (prevY - p.y) * stiff[i];
      t.style.transform = `translate(${p.x}px, ${p.y}px)`;
      prevX = p.x; prevY = p.y;
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

// ============ Hero — interactive dot grid ============
(function () {
  const opening = document.getElementById('opening');
  if (!opening) return;
  if (window.matchMedia('(hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-dots';
  opening.insertBefore(canvas, opening.firstChild);

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  let mx = -9999, my = -9999;
  let dirty = true;

  function resize() {
    const r = opening.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    dirty = true;
  }
  resize();
  window.addEventListener('resize', resize);

  opening.addEventListener('mousemove', (e) => {
    const r = opening.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    dirty = true;
  });
  opening.addEventListener('mouseleave', () => {
    mx = -9999; my = -9999;
    dirty = true;
  });

  const SPACING = 26;
  const BASE_R = 0.8;
  const MAX_R = 2.6;
  const REACH = 130;
  const REACH_SQ = REACH * REACH;

  function draw() {
    if (!dirty) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, w, h);
    const offsetX = (w % SPACING) / 2;
    const offsetY = (h % SPACING) / 2;
    for (let x = offsetX; x <= w; x += SPACING) {
      for (let y = offsetY; y <= h; y += SPACING) {
        const dx = x - mx, dy = y - my;
        const dsq = dx * dx + dy * dy;
        let factor = 0;
        if (dsq < REACH_SQ) {
          factor = 1 - Math.sqrt(dsq) / REACH;
        }
        const r = BASE_R + factor * (MAX_R - BASE_R);
        const alpha = 0.06 + factor * 0.45;
        ctx.beginPath();
        ctx.fillStyle = `rgba(91, 50, 166, ${alpha})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    dirty = false;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ============ Spotlight on cards (Questions) ============
(function () {
  document.querySelectorAll('.q').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--mx', x + '%');
      el.style.setProperty('--my', y + '%');
    });
  });
})();

// ============ Tilt on cards (Worlds) ============
(function () {
  const MAX = 5;
  document.querySelectorAll('.world').forEach((el) => {
    let raf = null;
    function update(e) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const ry = (x - 0.5) * 2 * MAX;
      const rx = (0.5 - y) * 2 * MAX;
      el.classList.add('tilting');
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    }
    el.addEventListener('mousemove', (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => update(e));
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
})();

// ============ Magnetic effect (Path cards + Contact buttons) ============
(function () {
  function attach(el, strength) {
    let raf = null;
    function update(e) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const tx = (e.clientX - cx) * strength;
      const ty = (e.clientY - cy) * strength;
      el.classList.add('tracking');
      el.style.setProperty('--tx', tx.toFixed(2) + 'px');
      el.style.setProperty('--ty', ty.toFixed(2) + 'px');
    }
    el.addEventListener('mousemove', (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => update(e));
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('tracking');
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    });
  }
  document.querySelectorAll('.path-card').forEach((el) => attach(el, 0.18));
  document.querySelectorAll('.contact-list a').forEach((el) => attach(el, 0.3));
})();

// ============ Scroll reveal ============
(function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  document.querySelectorAll('.q, .principles li').forEach((el) => observer.observe(el));
})();

// ============ Drawer ============
(function () {
  const drawer = document.querySelector('.drawer');
  const backdrop = document.querySelector('.drawer-backdrop');
  const content = document.querySelector('.drawer-content');
  const closeBtn = document.querySelector('.drawer-close');
  if (!drawer || !content) return;

  const details = {
    undergrad: {
      eyebrow: 'Path · 01',
      title: 'Mount Holyoke College',
      sub: 'BA Computer Science · 2020 – 2024 · GPA 4.0',
      blocks: [
        { h: 'What I did', p: 'Studied CS with an early interest in algorithms, robotics, and signal processing. Honors: Phi Beta Kappa, Magna Cum Laude, Sarah Williston Scholar Prize, Fennema-Strahman Prize.' },
        { h: 'Research', p: 'Worked in the Su Lab on surgical robotics and endoscopic tool segmentation. Co-authored two papers at ISMR 2024 and AIM 2024.' },
        { h: 'Selected publications',
          html: `<div class="pub-line">Bui, M., Chalfant, N., <strong>Sun, C.</strong>, ... Su, Y. <em>Expanding the Surgical Robotics Community: an Intuitive Sim-to-Real Control Framework for Raven-II.</em> ISMR 2024.</div>
                 <div class="pub-line">Zhu, Y., Wu, X., Tan, S., <strong>Sun, C.</strong>, ... Huang, K. <em>Iterative Morphological Training Set Decomposition for Endoscopic Tool Segmentation.</em> AIM 2024.</div>` },
      ],
    },
    belle: {
      eyebrow: 'Path · 02',
      title: 'Belle International Holdings',
      sub: 'Backend Developer Intern · May 2023 – Oct 2023 · Shenzhen',
      blocks: [
        { h: 'Team & scope', p: 'Data Application Development Group. Contributed to three enterprise systems serving different business units: e-commerce (300 people), executive leadership (100 people), and retail store network (9,000+ stores, 30,000 employees).' },
        { h: 'What I shipped',
          html: `<ul>
            <li>Sales analytics dashboards</li>
            <li>Daily notification subscription system</li>
            <li>Cross-system data restructuring</li>
            <li>Data layer optimization</li>
            <li>Brand drill-down analytics</li>
          </ul>` },
        { h: 'What I learned', p: 'Worked across PM, product, frontend, data, and QA. Developed a systematic debugging methodology — isolate by parameter, check data sources, identify whether the root cause is code, data, or API. First time I really understood that "the system" includes the people running it.' },
      ],
    },
    mhil: {
      eyebrow: 'Path · 03',
      title: 'Machine and Hybrid Intelligence Lab',
      sub: 'Research Assistant · Northwestern · 2025 – Present · Advisor: Prof. Ulas Bagci',
      blocks: [
        { h: 'Focus', p: 'Medical image segmentation, multi-modal MRI analysis, anatomy-aware AI for clinical decision support. Working directly with radiologists for annotation and clinical input.' },
        { h: 'Active projects',
          html: `<ul>
            <li><strong>Bronchoscopic Accessibility from 3D CT</strong> — anatomy-aware MoE framework on 438 clinical cases. AUROC 0.8052, beating human experts.</li>
            <li><strong>Cross-Sequence Pancreas MRI Segmentation</strong> — curated dataset + benchmark of domain generalization approaches.</li>
            <li><strong>Prostate Tumor Segmentation in bpMRI</strong> — multi-encoder U-Net with text-guided loss. Dice 0.7326 on PI-CAI.</li>
          </ul>` },
        { h: 'Selected publications',
          html: `<div class="pub-line">Peng, L., <strong>Sun, C.</strong>, ... Bagci, U. <em>Anatomy-Aware Prediction of Bronchoscopic Accessibility from 3D CT.</em> MICCAI 2026 (submitted).</div>
                 <div class="pub-line"><strong>Sun, C.</strong>, Peng, L., ... Bagci, U. <em>Align then Refine: Text-Guided 3D Prostate Lesion Segmentation.</em> EMBC 2026.</div>
                 <div class="pub-line">Peng, L.*, <strong>Sun, C.*</strong>, Zhang, Z.*, ... Bagci, U. <em>CrossPan: A Comprehensive Benchmark for Cross-Sequence Pancreas MRI Segmentation.</em> MIDL 2026.</div>` },
      ],
    },
    solo: {
      eyebrow: 'Path · 04',
      title: 'Shipping AI products solo',
      sub: '2026 · Personal projects',
      blocks: [
        { h: 'PaperMind', p: 'Auto-generates a structured 7-dimension paper analysis. Replaces the manual prompt cycle I was doing for every paper. Full-stack: arXiv + PDF ingestion, streaming output, side-by-side reading view. Added a daily digest after observing paper discovery as a secondary workflow need. Cut paper-review time by ~70%.' },
        { h: 'K-Expression Learner', p: 'Learning platform for intermediate Korean learners — colloquial expressions with tone, register, and context. Designed a production-first loop (understand → compare → produce → AI feedback → review) to force output practice. Shipped 360 fully structured expressions with rewrite-style AI feedback.' },
        { h: 'What I learned', p: 'Building solo forced me to make every product decision — scope, defaults, what to cut. I now think about PM problems differently: not "what feature?" but "what loop am I building?"' },
      ],
    },
  };

  function open(key) {
    const d = details[key];
    if (!d) return;
    let html = '';
    html += `<div class="drawer-eyebrow">${d.eyebrow}</div>`;
    html += `<h2>${d.title}</h2>`;
    html += `<p class="drawer-sub">${d.sub}</p>`;
    d.blocks.forEach((b) => {
      html += `<h3>${b.h}</h3>`;
      if (b.p) html += `<p>${b.p}</p>`;
      if (b.html) html += b.html;
    });
    content.innerHTML = html;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.view-details, .path-view').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      open(btn.dataset.detail);
    });
  });
  document.querySelectorAll('.polaroid[data-detail], .path-card[data-detail]').forEach((el) => {
    el.addEventListener('click', () => open(el.dataset.detail));
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
