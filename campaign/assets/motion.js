/* ============================================================
   PROCUREMENT DIPLOMAT: shared motion utilities
   Vanilla JS. Everything degrades gracefully with
   prefers-reduced-motion (CSS handles the visual fallbacks).
   ============================================================ */

(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealIO.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal, .u-reveal-host").forEach((el) => revealIO.observe(el));

  /* ---------- redaction lift (Great Lie treatment) ---------- */
  const redactIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const bars = e.target.querySelectorAll(".redact");
          bars.forEach((b, i) => setTimeout(() => b.classList.add("is-lifted"), 350 + i * 420));
          redactIO.unobserve(e.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-redact-group]").forEach((el) => redactIO.observe(el));

  /* ---------- count-up numbers ----------
     <span class="count" data-to="2100000" data-prefix="$" data-format="compact">$2.1M</span> */
  function formatNum(n, fmt) {
    if (fmt === "compact") {
      if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
      if (n >= 1e3) return Math.round(n / 1e3) + "K";
      return String(Math.round(n));
    }
    if (fmt === "float1") return n.toFixed(1);
    return Math.round(n).toLocaleString("en-US");
  }
  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        countIO.unobserve(el);
        const to = parseFloat(el.dataset.to || "0");
        const prefix = el.dataset.prefix || "";
        const suffix = el.dataset.suffix || "";
        const fmt = el.dataset.format || "";
        if (reduced) { el.textContent = prefix + formatNum(to, fmt) + suffix; return; }
        const dur = 1600;
        const t0 = performance.now();
        function tick(t) {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = prefix + formatNum(to * eased, fmt) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".count").forEach((el) => countIO.observe(el));

  /* ---------- scroll-scrub driver ----------
     Elements with [data-scrub] get a CSS custom property --p (0→1)
     as they travel through the viewport. Sections use it to drive
     transforms without JS layout math.                     */
  const scrubs = Array.from(document.querySelectorAll("[data-scrub]"));
  if (scrubs.length && !reduced) {
    let ticking = false;
    function update() {
      ticking = false;
      const vh = window.innerHeight;
      scrubs.forEach((el) => {
        const r = el.getBoundingClientRect();
        const total = r.height + vh;
        const passed = vh - r.top;
        const p = Math.min(Math.max(passed / total, 0), 1);
        el.style.setProperty("--p", p.toFixed(4));
      });
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  } else {
    scrubs.forEach((el) => el.style.setProperty("--p", "1"));
  }

  /* ---------- sticky-stage progress ----------
     [data-stage] = tall wrapper containing a sticky viewport.
     Progress 0→1 across the wrapper's scrollable span drives --sp. */
  const stages = Array.from(document.querySelectorAll("[data-stage]"));
  if (stages.length) {
    function updateStages() {
      const vh = window.innerHeight;
      stages.forEach((el) => {
        const r = el.getBoundingClientRect();
        const span = r.height - vh;
        const p = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 1;
        el.style.setProperty("--sp", (reduced ? 1 : p).toFixed(4));
      });
      requestAnimationFrame(updateStages);
    }
    requestAnimationFrame(updateStages);
  }

  /* ---------- terrain canvas (Cartographer contour field) ----------
     <canvas data-terrain data-knight="true"></canvas>
     Draws animated topographic contour lines from layered
     pseudo-noise; optionally plots a knight's L-move path.  */
  function noiseFactory(seed) {
    // deterministic value noise, cheap & dependency-free
    function rnd(ix, iy) {
      let n = ix * 374761393 + iy * 668265263 + seed * 1446648779;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = smooth(x - ix), fy = smooth(y - iy);
      const a = rnd(ix, iy), b = rnd(ix + 1, iy);
      const c = rnd(ix, iy + 1), d = rnd(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }

  document.querySelectorAll("canvas[data-terrain]").forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    const noise = noiseFactory(7);
    const noise2 = noiseFactory(31);
    let w, h, dpr, raf;
    const CELL = 14; // marching-squares grid cell (css px)

    function field(x, y, t) {
      const s = 0.0035;
      return (
        noise(x * s * 1.0 + t * 0.018, y * s * 1.0) * 0.62 +
        noise2(x * s * 2.3, y * s * 2.3 + t * 0.012) * 0.28 +
        noise(x * s * 5.1 + 40, y * s * 5.1 + 40) * 0.10
      );
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // sample the field once per frame; reuse across all iso levels
    function sampleField(t) {
      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      const vals = [];
      for (let j = 0; j <= rows; j++) {
        vals[j] = [];
        for (let i = 0; i <= cols; i++) vals[j][i] = field(i * CELL, j * CELL, t);
      }
      return { vals, cols, rows };
    }

    // marching squares for one iso level
    function drawIso(level, sample, alpha, lw) {
      ctx.beginPath();
      const { vals, cols, rows } = sample;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * CELL, y = j * CELL;
          const tl = vals[j][i] > level, tr = vals[j][i + 1] > level;
          const br = vals[j + 1][i + 1] > level, bl = vals[j + 1][i] > level;
          const idx = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          function lerpP(va, vb) { return (level - va) / (vb - va || 1e-9); }
          const top = [x + CELL * lerpP(vals[j][i], vals[j][i + 1]), y];
          const right = [x + CELL, y + CELL * lerpP(vals[j][i + 1], vals[j + 1][i + 1])];
          const bottom = [x + CELL * lerpP(vals[j + 1][i], vals[j + 1][i + 1]), y + CELL];
          const left = [x, y + CELL * lerpP(vals[j][i], vals[j + 1][i])];
          const segs = {
            1: [left, bottom], 2: [bottom, right], 3: [left, right], 4: [top, right],
            5: [top, left, bottom, right], 6: [top, bottom], 7: [top, left],
            8: [top, left], 9: [top, bottom], 10: [top, right, bottom, left],
            11: [top, right], 12: [left, right], 13: [bottom, right], 14: [left, bottom]
          }[idx];
          for (let s = 0; s < segs.length; s += 2) {
            ctx.moveTo(segs[s][0], segs[s][1]);
            ctx.lineTo(segs[s + 1][0], segs[s + 1][1]);
          }
        }
      }
      ctx.strokeStyle = "rgba(126, 147, 184," + alpha + ")";
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    let t = 0;
    let drawProgress = 0; // lines "draw in" on load
    function frame() {
      ctx.clearRect(0, 0, w, h);
      if (drawProgress < 1) drawProgress = Math.min(drawProgress + 0.012, 1);
      const levels = 7;
      const sample = sampleField(t);
      for (let k = 0; k < levels; k++) {
        if (k / levels > drawProgress) break;
        const lv = 0.30 + (k / levels) * 0.42;
        const major = k % 3 === 0;
        drawIso(lv, sample, major ? 0.34 : 0.16, major ? 1.1 : 0.6);
      }
      // gold summit ring
      const gx = w * 0.68, gy = h * 0.38;
      ctx.beginPath();
      ctx.arc(gx, gy, 4 + Math.sin(t * 0.06) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(201,169,106,0.9)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx, gy, 14 + Math.sin(t * 0.06) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201,169,106,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!reduced) { t += 1; raf = requestAnimationFrame(frame); }
    }

    resize();
    window.addEventListener("resize", () => { resize(); });
    if (reduced) { drawProgress = 1; t = 40; frame(); } else { frame(); }

    // pause when offscreen
    const visIO = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (reduced) return;
        if (e.isIntersecting) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
        else cancelAnimationFrame(raf);
      });
    });
    visIO.observe(canvas);
  });

  /* ---------- knight path (SVG dash draw) ----------
     any <path data-draw> inside an .is-visible group animates its dash */
  const drawIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        drawIO.unobserve(e.target);
        e.target.querySelectorAll("path[data-draw], line[data-draw], polyline[data-draw]").forEach((p, i) => {
          const len = p.getTotalLength ? p.getTotalLength() : 600;
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = reduced ? 0 : len;
          if (!reduced) {
            p.style.transition = "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1) " + (0.3 + i * 0.35) + "s";
            requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = 0; }));
          }
        });
      });
    },
    { threshold: 0.4 }
  );
  document.querySelectorAll("[data-draw-group]").forEach((el) => drawIO.observe(el));

  /* ---------- copy-to-clipboard buttons ----------
     <button data-copy="#targetId">Copy</button> */
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(btn.dataset.copy);
      if (!target) return;
      const text = target.innerText.trim();
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = "Copied ✓";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1800);
      });
    });
  });

  /* ---------- nav hide-on-scroll-down ---------- */
  const nav = document.querySelector(".site-nav");
  if (nav) {
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y > lastY + 8 && y > 140) nav.style.transform = "translateY(-100%)";
      else if (y < lastY - 8) nav.style.transform = "";
      lastY = y;
    }, { passive: true });
  }
})();
