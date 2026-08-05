import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- Smooth scroll (Lenis) ---
const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// --- Mobile hamburger menu ---
const navToggle = document.getElementById('nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function setMobileMenuOpen(isOpen) {
  mobileMenu.classList.toggle('is-open', isOpen);
  navToggle.classList.toggle('is-active', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (isOpen) {
    lenis.stop();
  } else {
    lenis.start();
  }
}

navToggle.addEventListener('click', () => {
  setMobileMenuOpen(!mobileMenu.classList.contains('is-open'));
});

mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMobileMenuOpen(false));
});

// --- Top progress bar ---
const progressFill = document.getElementById('progress-fill');
lenis.on('scroll', ({ scroll, limit }) => {
  const pct = limit > 0 ? (scroll / limit) * 100 : 0;
  progressFill.style.width = `${pct}%`;
});

// --- Back to top button ---
const backToTop = document.getElementById('back-to-top');
const footerEl = document.querySelector('.footer');

function updateBackToTop(scroll) {
  backToTop.classList.toggle('is-visible', scroll > window.innerHeight * 0.6);
  const footerTop = footerEl.getBoundingClientRect().top;
  const overlap = Math.max(0, window.innerHeight - footerTop);
  backToTop.style.setProperty('--btt-footer-push', `${overlap}px`);
}

lenis.on('scroll', ({ scroll }) => updateBackToTop(scroll));
window.addEventListener('resize', () => updateBackToTop(lenis.scroll));

backToTop.addEventListener('click', () => {
  lenis.scrollTo(0, { duration: 1.4 });
});

// --- Hero kinetic type reveal ---
gsap.set('.hero__name .word', { y: '110%' });
const heroTl = gsap.timeline({ delay: 0.2 });
heroTl
  .to('.hero__name .word', {
    y: '0%',
    duration: 1.1,
    ease: 'power4.out',
    stagger: 0.12,
  })
  .from(
    '[data-reveal]',
    {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.1,
    },
    '-=0.6'
  );

// --- 3D card: scroll-scrub orbit + parallax ---
const card = document.getElementById('card3d');
gsap.to(card, {
  rotateY: 360,
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 0.6,
  },
});

// subtle idle float + mouse parallax tilt
let mouseX = 0;
let mouseY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

gsap.ticker.add(() => {
  gsap.set('.hero__card-stage', {
    x: mouseX * 14,
    y: mouseY * 14,
  });
});

gsap.to('.hero__card-stage', {
  y: '+=18',
  duration: 2.6,
  ease: 'sine.inOut',
  repeat: -1,
  yoyo: true,
});

// --- Stats count-up ---
document.querySelectorAll('.stat__num').forEach((el) => {
  const target = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const counter = { val: 0 };

  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(counter, {
        val: target,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = `${prefix}${Math.round(counter.val)}${suffix}`;
        },
      });
    },
  });
});

// --- About section reveals ---
gsap.from('.about__lead, .about__intro', {
  y: 30,
  opacity: 0,
  duration: 0.9,
  ease: 'power3.out',
  stagger: 0.12,
  scrollTrigger: {
    trigger: '.about',
    start: 'top 75%',
  },
});

gsap.from('.about__subhead, .about__text, .about__chips .chip', {
  y: 30,
  opacity: 0,
  duration: 0.8,
  ease: 'power3.out',
  stagger: 0.1,
  scrollTrigger: {
    trigger: '.about__body',
    start: 'top 80%',
  },
});

gsap.from('.feature', {
  opacity: 0,
  duration: 0.6,
  ease: 'power2.out',
  stagger: 0.08,
  scrollTrigger: {
    trigger: '.features',
    start: 'top 85%',
  },
});

// --- Three pillars: reveal one at a time while pinned ---
const pillars = gsap.utils.toArray('[data-pillar]');
pillars.forEach((pillar, i) => {
  ScrollTrigger.create({
    trigger: pillar,
    start: 'top 70%',
    end: 'bottom 40%',
    onEnter: () => setActivePillar(i),
    onEnterBack: () => setActivePillar(i),
  });
});

function setActivePillar(index) {
  pillars.forEach((p, i) => {
    p.classList.toggle('is-active', i === index);
  });
}
setActivePillar(0);

// --- Work cards: staggered entrance ---
gsap.from('[data-work]', {
  opacity: 0,
  duration: 0.7,
  ease: 'power2.out',
  stagger: 0.08,
  scrollTrigger: {
    trigger: '.work__grid',
    start: 'top 80%',
  },
});

// --- Section title reveals ---
gsap.utils.toArray('.section-tag, .section-title').forEach((el) => {
  gsap.from(el, {
    y: 30,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
    },
  });
});

// --- Finale reveal ---
gsap.from('.finale__title, .finale__sub, .contact__info, .contact__form', {
  y: 40,
  opacity: 0,
  duration: 1,
  ease: 'power3.out',
  stagger: 0.15,
  scrollTrigger: {
    trigger: '.finale',
    start: 'top 75%',
  },
});

// --- Contact form (static site: hand off to the user's email client) ---
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = contactForm.name.value.trim();
  const phone = contactForm.phone.value.trim();
  const email = contactForm.email.value.trim();
  const message = contactForm.message.value.trim();

  if (!name || !email || !message) {
    formStatus.textContent = 'Popuni ime, e-poštu i poruku pre slanja.';
    return;
  }

  const subject = encodeURIComponent(`Upit sa sajta - ${name}`);
  const bodyLines = [
    `Ime i prezime: ${name}`,
    phone ? `Telefon: ${phone}` : null,
    `E-pošta: ${email}`,
    '',
    message,
  ].filter(Boolean);
  const body = encodeURIComponent(bodyLines.join('\n'));

  window.location.href = `mailto:milivojevic.webdev@gmail.com?subject=${subject}&body=${body}`;
  formStatus.textContent = 'Otvaram tvoj email program da pošalješ poruku…';
});
