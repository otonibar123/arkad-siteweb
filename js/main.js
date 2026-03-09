/* ========================================
   Arkad Consulting — Scripts
   ======================================== */

/* --- Reveal au scroll --- */
var observer = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry, i) {
      if (entry.isIntersecting) {
        setTimeout(function () {
          entry.target.classList.add('reveal--visible');
        }, i * 60);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.reveal').forEach(function (el) {
  observer.observe(el);
});

/* --- Smooth scroll pour les ancres --- */
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    var target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* --- Page nav : état actif au scroll --- */
var sections = document.querySelectorAll('section[id]');
var pageNavLinks = document.querySelectorAll('.page-nav__link');

window.addEventListener('scroll', function () {
  var current = '';
  sections.forEach(function (section) {
    if (window.scrollY >= section.offsetTop - 120) {
      current = section.id;
    }
  });
  pageNavLinks.forEach(function (link) {
    link.classList.remove('page-nav__link--active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('page-nav__link--active');
    }
  });
});

/* --- Formulaire de contact --- */
var contactForm = document.querySelector('.form');

if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = contactForm.querySelector('.form__submit .btn');
    var originalHTML = btn.innerHTML;

    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';

    var data = {
      name: document.getElementById('name').value.trim(),
      company: document.getElementById('company').value.trim(),
      email: document.getElementById('email').value.trim(),
      message: document.getElementById('message').value.trim()
    };

    _supabase.from('messages').insert([data])
      .then(function (res) {
        if (res.error) throw res.error;
        btn.textContent = '\u2713 Message envoyé';
        btn.classList.add('btn--sent');
        contactForm.reset();
        setTimeout(function () {
          btn.innerHTML = originalHTML;
          btn.classList.remove('btn--sent');
          btn.disabled = false;
        }, 4000);
      })
      .catch(function () {
        btn.textContent = 'Erreur — réessayez';
        btn.disabled = false;
        setTimeout(function () {
          btn.innerHTML = originalHTML;
        }, 3000);
      });
  });
}

/* --- FAQ accordion --- */
document.querySelectorAll('.faq__question').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var item = btn.parentElement;
    var isOpen = item.classList.contains('faq__item--open');
    document.querySelectorAll('.faq__item--open').forEach(function (el) {
      el.classList.remove('faq__item--open');
    });
    if (!isOpen) {
      item.classList.add('faq__item--open');
    }
  });
});
