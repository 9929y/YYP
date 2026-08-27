(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-about-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-about\.js.*$/, '') : '';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function img(src, alt) {
    return '<img src="' + esc(ROOT + src) + '" alt="' + esc(alt) + '" loading="lazy">';
  }

  function render() {
    return '<article class="about">' +
      '<header class="about__hero">' +
        '<div class="about__copy">' +
          '<p class="about__place">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
              '<path d="M17.3635 8.36364C17.3635 14.0909 9.99987 19 9.99987 19C9.99987 19 2.63623 14.0909 2.63623 8.36364C2.63623 6.41068 3.41204 4.53771 4.79299 3.15676C6.17394 1.77581 8.04691 1 9.99987 1C11.9528 1 13.8258 1.77581 15.2067 3.15676C16.5877 4.53771 17.3635 6.41068 17.3635 8.36364Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<path d="M9.99987 10.8182C11.3555 10.8182 12.4544 9.71924 12.4544 8.36364C12.4544 7.00803 11.3555 5.90909 9.99987 5.90909C8.64426 5.90909 7.54532 7.00803 7.54532 8.36364C7.54532 9.71924 8.64426 10.8182 9.99987 10.8182Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
            '<span>Bay Area, US</span>' +
          '</p>' +
          '<p class="about__hello">Hello,</p>' +
          '<h1 class="about__name">I\'m Yanice Yang</h1>' +
          '<p class="about__lead">I\'m a User Experience Designer based in the Bay Area. I enjoy solving digital problem through empathizing, researching, exploring and designing.</p>' +
          '<a class="about__btn" href="https://www.linkedin.com/in/yanice-yang" target="_blank" rel="noopener">' +
            'LinkedIn' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
              '<path d="M5.8335 14.1666L14.1668 5.83331M14.1668 5.83331H5.8335M14.1668 5.83331V14.1666" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</a>' +
        '</div>' +
        '<div class="about__portrait">' +
          '<div class="about__portrait-frame">' +
            img(
              'assets/images/about/illustration-ai-generated-self-avatar.webp',
              'Stylized cartoon avatar of a smiling young woman with long wavy brown hair, used as the author\'s profile picture'
            ) +
            '<img class="about__aurora" alt="" aria-hidden="true" src="' +
              esc(ROOT + 'assets/images/about/bg-aurora-light-accent.png') + '">' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<section class="about__bio">' +
        '<p>Thanks for stopping by. I am a designer passioned in exploring diverse fields and help users and business find the happier path to succeed. As a UX designer, I’ve come to deeply appreciate the role of design as a bridge between user needs and business goals. To me, UX is not just about creating visually appealing interfaces—it’s about solving real problems in a way that feels intuitive, inclusive, and meaningful to users. Before becoming a UX designer, I was once a fashion designer for 5 years, feel free to check my fashion work here. I also enjoy learning Math, Physics and other STEM fields.</p>' +
        '<h2>Fun Fact</h2>' +
        '<p>I made 100k revenue in 2019 when I run a small business in Fashion field;)</p>' +
        '<a class="about__btn" href="fashion.html">' +
          'Fashion Project' +
          '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
            '<path d="M5.8335 14.1666L14.1668 5.83331M14.1668 5.83331H5.8335M14.1668 5.83331V14.1666" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</a>' +
      '</section>' +
      '<section class="about__stories" aria-labelledby="about-stories-heading">' +
        '<h2 id="about-stories-heading">A little about me</h2>' +
        '<div class="about__story">' +
          '<div class="about__pair">' +
            img('assets/images/about/photo-pet-photobooth-strip.webp', 'Photobooth strip of a woman in a costume hat posing with two small dogs') +
            img('assets/images/about/photo-feeding-two-dogs-treat.webp', 'Hand offering a piece of baked treat to an excited Shiba Inu and an Australian Shepherd') +
          '</div>' +
          '<div class="about__story-copy">' +
            '<h3>I am a dog lover!</h3>' +
            '<p>I’m a passionate <strong>dog lover</strong> and proud owner of a beautiful black Shiba Inu named <strong>Xiao Kui</strong> (小葵). Since welcoming Xiao Kui into my life last year, I’ve discovered the joy and companionship that comes with being a dog parent. My love for dogs has not only enriched my personal life but also connected me with a wonderful community of fellow dog enthusiasts.<br>As a dog lover, I believe in the power of these loyal companions to bring people together, teach us patience and responsibility, and fill our lives with unconditional love.</p>' +
          '</div>' +
        '</div>' +
        '<div class="about__story">' +
          '<div class="about__pair">' +
            img('assets/images/about/photo-snowboarder-on-slope-portrait.webp', 'Skier in a purple jacket and helmet standing beside a snowboard on a sunny mountain slope') +
            img('assets/images/about/photo-ski-resort-gondola-slope.webp', 'Snowy ski resort seen from the slope, with red gondola cabins overhead and a snow-covered village below') +
          '</div>' +
          '<div class="about__story-copy">' +
            '<h3>I enjoy Skiing;)</h3>' +
            '<p>I’m an avid <strong>skiing enthusiast</strong> who finds joy and exhilaration on the slopes. Whether it’s carving through fresh powder, tackling challenging runs, or simply enjoying the breathtaking mountain views, skiing is more than just a sport to me—it’s a way of life.<br>Meet me Vermont or Denver in snow season;)</p>' +
          '</div>' +
        '</div>' +
        '<div class="about__story">' +
          '<div class="about__pair">' +
            img('assets/images/about/photo-hotpot-table-with-dog.webp', 'A hotpot dinner spread of sliced meat, vegetables and mushrooms on a table, with a border collie watching from a chair') +
            img('assets/images/about/photo-hotpot-spread-kitchen.webp', 'A home-cooked hotpot spread with shrimp, sliced beef, mushrooms and greens laid out around a split broth pot') +
          '</div>' +
          '<div class="about__story-copy">' +
            '<h3>I am a home cook</h3>' +
            '<p>In my kitchen, I enjoy experimenting with fresh ingredients, mastering classic recipes, and putting my own creative spin on dishes. Whether it’s steaming fluffy bao buns, perfecting the art of wok cooking, or hosting friends for a homemade hot pot feast, I find joy in every step of the process. Through cooking, I’ve not only honed my skills but also built a deeper appreciation for the stories and cultures behind each dish. For me, Chinese food is more than just nourishment—it’s a celebration of flavor, tradition, and togetherness.</p>' +
          '</div>' +
        '</div>' +
        '<div class="about__story">' +
          '<div class="about__pair">' +
            img('assets/images/about/photo-jeep-summit-above-clouds.webp', 'Woman sitting on the hood of a jeep at a mountain summit above the clouds, next to observatory domes') +
            img('assets/images/about/photo-sandstone-canyon-group-photo.webp', 'Three people posing on a striped red sandstone slope, seen from above') +
          '</div>' +
          '<div class="about__story-copy">' +
            '<h3>I am passionate of traveling</h3>' +
            '<p>I’m a nature enthusiast with an insatiable curiosity for the great outdoors. Whether it’s hiking through rugged trails, diving into the vibrant underwater world, or embarking on journeys to new destinations, I thrive on the thrill of exploration and the beauty of discovering the unknown.<br>These adventures have taught me resilience, mindfulness, and a deep appreciation for the planet’s natural wonders. Whether I’m scaling a mountain, diving beneath the waves, or wandering through a bustling city, I’m always eager to embrace new experiences and share my passion for exploration with others.</p>' +
          '</div>' +
        '</div>' +
      '</section>' +
    '</article>';
  }

  function YYAboutContent() {
    var self = Reflect.construct(HTMLElement, [], YYAboutContent);
    var shadow = self.attachShadow({ mode: 'open' });
    var sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = ROOT + 'assets/css/yy-about.css';
    shadow.appendChild(sheet);
    var shell = document.createElement('div');
    shell.innerHTML = render();
    while (shell.firstChild) shadow.appendChild(shell.firstChild);
    return self;
  }

  YYAboutContent.prototype = Object.create(HTMLElement.prototype);
  YYAboutContent.prototype.constructor = YYAboutContent;
  Object.setPrototypeOf(YYAboutContent, HTMLElement);

  customElements.define('yy-about-content', YYAboutContent);
})();
