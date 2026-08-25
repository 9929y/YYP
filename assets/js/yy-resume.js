(function () {
  'use strict';

  var anchor = document.querySelector('[data-resume-tabs-anchor]');
  var floating = document.querySelector('[data-resume-floating]');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.resume-section[id]'));
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.resume__tabs a[href^="#"], .resume__floating-tabs a[href^="#"]')
  );

  if (!anchor || !floating || !sections.length) return;

  var queued = false;

  function setFloating(visible) {
    floating.classList.toggle('is-visible', visible);
    floating.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) floating.removeAttribute('inert');
    else floating.setAttribute('inert', '');
  }

  function setCurrent(id) {
    links.forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function update() {
    queued = false;
    setFloating(anchor.getBoundingClientRect().bottom < 16);

    var line = Math.min(120, window.innerHeight * 0.2);
    var current = sections[0].id;
    var nearest = Infinity;
    sections.forEach(function (section) {
      var rect = section.getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) {
        current = section.id;
        nearest = -1;
        return;
      }
      if (nearest >= 0) {
        var distance = Math.abs(rect.top - line);
        if (distance < nearest) {
          nearest = distance;
          current = section.id;
        }
      }
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = sections[sections.length - 1].id;
    }
    setCurrent(current);
  }

  function requestUpdate() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('hashchange', requestUpdate);
  update();
})();
