import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSteps } from './steps.js';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Mobile menu: closed state is `inert` so keyboard and screen readers skip its links.
const navToggle = document.getElementById('nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function setMobileMenuOpen(isOpen) {
  mobileMenu.classList.toggle('is-open', isOpen);
  mobileMenu.inert = !isOpen;
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  navToggle.classList.toggle('is-active', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Zatvori meni' : 'Otvori meni');
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (isOpen) lenis.stop();
  else lenis.start();
}

navToggle.addEventListener('click', () => {
  setMobileMenuOpen(!mobileMenu.classList.contains('is-open'));
});
mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMobileMenuOpen(false));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
    setMobileMenuOpen(false);
    navToggle.focus();
  }
});
window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
  if (e.matches) setMobileMenuOpen(false);
});

const progressFill = document.getElementById('progress-fill');
lenis.on('scroll', ({ scroll, limit }) => {
  const pct = limit > 0 ? (scroll / limit) * 100 : 0;
  progressFill.style.width = `${pct}%`;
});

// Back to top: rises with the footer so it never overlaps it.
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
backToTop.addEventListener('click', () => lenis.scrollTo(0, { duration: 1.4 }));

// Hero
gsap.set('.hero__name .word', { y: '110%' });
gsap
  .timeline({ delay: 0.2 })
  .to('.hero__name .word', { y: '0%', duration: 1.1, ease: 'power4.out', stagger: 0.12 })
  .from('[data-reveal]', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, '-=0.6');

// The photo turns once while the hero scrolls away.
gsap.to('#card3d', {
  rotateY: 360,
  ease: 'none',
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
});

// Float and mouse parallax run on different elements so they don't overwrite each other.
gsap.to('.hero__float', { y: 18, duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true });

if (window.matchMedia('(pointer: fine)').matches) {
  const moveX = gsap.quickTo('.hero__card-stage', 'x', { duration: 0.6, ease: 'power3' });
  const moveY = gsap.quickTo('.hero__card-stage', 'y', { duration: 0.6, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    moveX((e.clientX / window.innerWidth - 0.5) * 28);
    moveY((e.clientY / window.innerHeight - 0.5) * 28);
  });
}

// Stats: the HTML holds the real numbers; the count-up only starts once JS is running.
document.querySelectorAll('.stat__num[data-count]').forEach((el) => {
  const target = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const counter = { val: 0 };
  el.textContent = `${prefix}0${suffix}`;

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

document.querySelectorAll('.steps').forEach(initSteps);

// Contact form: the site is static, so this hands the message to the visitor's mail app
// and always offers a Gmail link as a fallback.
const MAIL_TO = 'milivojevic.webdev@gmail.com';
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(contactForm);
  const name = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const email = String(data.get('email') || '').trim();
  const message = String(data.get('message') || '').trim();

  formStatus.replaceChildren();

  if (!name || !email || !message) {
    formStatus.textContent = 'Popuni ime, email i poruku pre slanja.';
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    formStatus.textContent = 'Proveri email adresu.';
    return;
  }

  const subject = `Upit sa sajta: ${name}`;
  const body = [
    `Ime i prezime: ${name}`,
    phone ? `Telefon: ${phone}` : null,
    `Email: ${email}`,
    '',
    message,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const gmailUrl =
    `https://mail.google.com/mail/?view=cm&fs=1&to=${MAIL_TO}` +
    `&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const gmailLink = document.createElement('a');
  gmailLink.href = gmailUrl;
  gmailLink.target = '_blank';
  gmailLink.rel = 'noopener';
  gmailLink.textContent = 'pošalji preko Gmail-a';
  formStatus.append('Otvaram tvoj email program. Ako se ništa ne otvori, ', gmailLink, ` ili piši direktno na ${MAIL_TO}.`);
});
