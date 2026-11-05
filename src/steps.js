import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Optional behaviour for the `.steps` component (circles with icons, shared by "Šta radim" and "O meni").
// `<div class="steps" data-connector="code">` replaces the static dotted line with a trail of
// code characters that is typed out along the path while the section scrolls into view.
// Without that attribute this module does nothing and the component stays pure CSS.

const TOKENS = ['</>', '{ }', '=>', ';', '01', '//', '[ ]'];
const OPACITIES = [0.85, 0.45, 0.7, 0.3, 0.6, 0.4, 0.8];
const SIZES = [0.78, 0.9, 0.72, 0.84]; // rem
const CHAR_WIDTH = 0.6; // monospace advance, in em
const TOKEN_GAP = 14; // px between tokens
const NODE_GAP = 16; // px between a circle's edge and the nearest token

function measureNodes(root) {
  const box = root.getBoundingClientRect();
  return [...root.querySelectorAll('.step__node')].map((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, r: node.offsetWidth / 2 };
  });
}

// Cubic curve between two circle centres: an S-shape across, a gentle wave down.
function curveBetween(p, q, vertical) {
  if (vertical) {
    const dy = q.y - p.y;
    return [p, { x: p.x + 14, y: p.y + dy * 0.33 }, { x: q.x - 14, y: p.y + dy * 0.66 }, q];
  }
  const mx = (p.x + q.x) / 2;
  return [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
}

function sampleCurve(c, steps = 120) {
  const pts = [];
  let length = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x;
    const y = u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y;
    if (i > 0) length += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
    pts.push({ x, y, len: length });
  }
  return { pts, length };
}

function pointAt(curve, dist) {
  const { pts } = curve;
  let i = 1;
  while (i < pts.length - 1 && pts[i].len < dist) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const f = (dist - a.len) / (b.len - a.len || 1);
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}

// Returns, per gap between two circles, the list of character elements in typing order.
function buildTrail(trail, nodes, vertical) {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  trail.replaceChildren();
  const gap = vertical ? TOKEN_GAP / 2 : TOKEN_GAP;
  const segments = [];
  let counter = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    const curve = sampleCurve(curveBetween(nodes[i], nodes[i + 1], vertical));
    const start = nodes[i].r + NODE_GAP;
    const end = curve.length - nodes[i + 1].r - NODE_GAP;

    const placed = [];
    let d = start;
    for (;;) {
      const text = TOKENS[counter % TOKENS.length];
      const size = SIZES[counter % SIZES.length];
      // Along a horizontal path a token takes up its width, along a vertical one its height.
      const extent = vertical ? size * rem * 1.2 : text.length * CHAR_WIDTH * size * rem;
      if (d + extent > end) break;
      placed.push({ text, size, opacity: OPACITIES[counter % OPACITIES.length], center: d + extent / 2 });
      d += extent + gap;
      counter++;
    }
    // Centre the run of tokens between the two circles.
    const shift = placed.length ? (end - (d - gap)) / 2 : 0;

    const chars = [];
    placed.forEach((t) => {
      const pos = pointAt(curve, t.center + shift);
      const el = document.createElement('span');
      el.className = 'trail__tok';
      el.style.left = `${pos.x.toFixed(1)}px`;
      el.style.top = `${pos.y.toFixed(1)}px`;
      el.style.fontSize = `${t.size}rem`;
      el.style.setProperty('--o', t.opacity);
      el.style.transform = `translate(-50%, -50%) rotate(${vertical ? 0 : pos.angle.toFixed(1)}deg)`;
      [...t.text].forEach((ch) => {
        const c = document.createElement('span');
        c.className = 'trail__ch';
        c.textContent = ch === ' ' ? ' ' : ch;
        el.append(c);
        chars.push(c);
      });
      trail.append(el);
    });
    segments.push(chars);
  }
  return segments;
}

export function initSteps(root) {
  if (root.dataset.connector !== 'code') return;

  root.querySelector('.steps__path')?.remove();
  let trail = root.querySelector('.steps__trail');
  if (!trail) {
    trail = document.createElement('div');
    trail.className = 'steps__trail';
    trail.setAttribute('aria-hidden', 'true');
    root.prepend(trail);
  }

  const steps = [...root.querySelectorAll('.step')];
  const nodes = steps.map((s) => s.querySelector('.step__node'));
  const texts = steps.map((s) => [...s.children].filter((el) => !el.classList.contains('step__node')));

  let timeline = null;
  let lastSize = '';
  let frame = 0;

  function teardown() {
    timeline?.scrollTrigger?.kill();
    timeline?.kill();
    timeline = null;
    gsap.set([...nodes, ...texts.flat()], { clearProps: 'all' });
  }

  function build() {
    teardown();
    const points = measureNodes(root);
    const vertical = Math.abs(points[0].x - points[points.length - 1].x) < 8;
    const segments = buildTrail(trail, points, vertical);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      segments.flat().forEach((c) => c.classList.add('is-on'));
      return;
    }

    const shown = segments.map(() => 0);
    const paint = (i, k) => {
      const n = Math.floor(k + 1e-6);
      if (shown[i] === n) return;
      shown[i] = n;
      segments[i].forEach((c, j) => c.classList.toggle('is-on', j < n));
    };

    const block = 1 / steps.length;
    timeline = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 78%', end: 'bottom 62%', scrub: 0.4 },
    });

    steps.forEach((_, i) => {
      const at = i * block;
      timeline.fromTo(
        nodes[i],
        { scale: 0.55, opacity: 0 },
        { scale: 1, opacity: 1, duration: block * 0.3, ease: 'back.out(1.4)' },
        at
      );
      timeline.fromTo(
        texts[i],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: block * 0.35, ease: 'power2.out' },
        at + block * 0.28
      );
      if (segments[i]) {
        const state = { k: 0 };
        timeline.to(
          state,
          { k: segments[i].length, duration: block * 0.7, ease: 'none', onUpdate: () => paint(i, state.k) },
          at + block * 0.3
        );
      }
    });
  }

  new ResizeObserver(() => {
    const size = `${root.offsetWidth}x${root.offsetHeight}`;
    if (size === lastSize) return;
    lastSize = size;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(build);
  }).observe(root);
}
