(function () {
  'use strict';

  // Données injectées par build.ps1 : seules les cases déjà arrivées ont un contenu.
  var D = JSON.parse(document.getElementById('donnees').textContent);
  var AUJ = D.aujourdhui; // "AAAA-MM-JJ", date de Paris au moment du build (ou date simulée)
  var parJour = {};
  D.cases.forEach(function (c) { parJour[c.jour] = c; });
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Hasard reproductible : le sapin est le même à chaque visite ----------
  function hasard(graine) {
    return function () {
      graine |= 0; graine = graine + 0x6D2B79F5 | 0;
      var t = Math.imul(graine ^ graine >>> 15, 1 | graine);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var R = hasard(2026);
  function entre(a, b) { return a + R() * (b - a); }

  // ---------- Dates et états ----------
  function dateDe(jour) {
    return D.annee + '-12-' + (jour < 10 ? '0' : '') + jour;
  }
  // L'état vient des données publiées : une case fermée n'a que son heure d'ouverture.
  function etatDe(jour) {
    var c = parJour[jour];
    if (!c || c.ouvreLe || c.ouvreA) return 'fermee';
    return jour === D.dujour ? 'dujour' : 'ouverte';
  }
  function jourEnLettres(jour) {
    return (jour === 1 ? '1er' : String(jour)) + ' décembre';
  }
  function heure(hhmm) { return String(hhmm).replace(':', 'h'); }
  // « le 14 décembre à minuit » (rythme normal) ou « à 21h55 » (mode soirée)
  function quand(jour) {
    var c = parJour[jour] || {};
    return c.ouvreA ? 'à ' + heure(c.ouvreA) : 'le ' + jourEnLettres(jour) + ' à minuit';
  }
  function dateLongue(iso) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var txt = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return txt.replace(/^1 /, '1er ');
  }
  var ICONES = { fermee: '🔒', dujour: '★', ouverte: '✓' };
  function libelle(jour, etat) {
    var nom = jour === 25 ? "L'étoile du 25" : 'Cadeau ' + jour;
    if (etat === 'fermee') return nom + ', pas encore disponible : s\'ouvre ' + quand(jour);
    if (etat === 'dujour') return nom + ', cadeau du jour : à ouvrir !';
    return nom + ', déjà ouvert : à relire';
  }

  // ---------- Géométrie du sapin (unités du dessin : 400 x 560) ----------
  var L = 400, H = 560, CX = 200, SOMMET = 58, BASE = 468, DEMI_BASE = 172;
  function demi(y) { return DEMI_BASE * Math.max(0, y - SOMMET) / (BASE - SOMMET); }
  function f(n) { return n.toFixed(1); }

  var EMBALLAGES = [
    ['#9e1328', '#7d0f20', '#e8c36a'], // bordeaux, ruban or
    ['#c9a13b', '#a8842c', '#9e1328'], // or, ruban bordeaux
    ['#f1e8d6', '#d9ccb3', '#c8202e'], // ivoire, ruban rouge
    ['#155e3f', '#0f4a31', '#e8c36a'], // émeraude, ruban or
    ['#c8202e', '#9e1a24', '#f1e8d6'], // rouge, ruban ivoire
    ['#1d3f7a', '#162f5c', '#e8c36a']  // bleu nuit, ruban or
  ];

  function positionsCadeaux() {
    var lignes = [[150, 2], [205, 3], [262, 4], [318, 4], [376, 5], [438, 6]];
    var pos = [];
    lignes.forEach(function (l) {
      var y = l[0], n = l[1], larg = demi(y) - 16;
      var pas = n > 1 ? 2 * larg / (n - 1) : 0;
      for (var i = 0; i < n; i++) {
        var x = n > 1 ? CX - larg + i * pas : CX;
        var j = Math.min(pas * 0.15, 7);
        pos.push({ x: x + entre(-j, j), y: y + entre(-7, 7) });
      }
    });
    // numéros distribués au hasard sur le sapin
    var nums = [];
    for (var k = 1; k <= 24; k++) nums.push(k);
    for (var a = nums.length - 1; a > 0; a--) {
      var b = Math.floor(R() * (a + 1));
      var t = nums[a]; nums[a] = nums[b]; nums[b] = t;
    }
    pos.forEach(function (p, i) { p.jour = nums[i]; });
    return pos;
  }

  function dessinerSapin(occupes) {
    var s = [];
    s.push('<svg viewBox="0 0 ' + L + ' ' + H + '" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="gVert" x1="0" x2="1" y1="0" y2="0">' +
        '<stop offset="0" stop-color="#082a18"/><stop offset=".3" stop-color="#1b603a"/>' +
        '<stop offset=".5" stop-color="#1f6b40"/><stop offset=".75" stop-color="#154d2e"/><stop offset="1" stop-color="#072414"/></linearGradient>' +
      '<linearGradient id="gOmbre" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".55" stop-color="#000" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gNeige" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d6ee"/></linearGradient>' +
      '<linearGradient id="gTronc" x1="0" x2="1"><stop offset="0" stop-color="#3b2010"/><stop offset=".5" stop-color="#6b3f22"/><stop offset="1" stop-color="#3b2010"/></linearGradient>' +
      '<radialGradient id="gSol" cx="50%" cy="45%" r="50%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#eef3fb" stop-opacity=".95"/><stop offset=".8" stop-color="#b8c8e6" stop-opacity=".35"/><stop offset="1" stop-color="#9fb3d6" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="halo"><stop offset="0" stop-color="#fff2c4" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".4"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>' +
      boule('bRouge', '#ff6a6a', '#c0142a', '#5c0712') +
      boule('bOr', '#fff1b8', '#d7a93a', '#7a5512') +
      boule('bVert', '#7fdcae', '#13855a', '#053a24') +
      boule('bChamp', '#ffffff', '#e6d6b5', '#8d7a55') +
      '<linearGradient id="gEtoileDeco" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c0"/><stop offset="1" stop-color="#c8951f"/></linearGradient>' +
      '<filter id="rameaux" x="-8%" y="-8%" width="116%" height="125%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.07 0.32" numOctaves="2" seed="7" result="bruit"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="bruit" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
        '<feDropShadow in="d" dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".45"/></filter>' +
      '<filter id="flou"><feGaussianBlur stdDeviation="2"/></filter>' +
      '</defs>');

    // sol enneigé et tronc
    s.push('<ellipse cx="200" cy="510" rx="250" ry="46" fill="url(#gSol)"/>');
    s.push('<rect x="186" y="440" width="28" height="64" fill="url(#gTronc)"/>');

    // étages de branches, du bas vers le haut (les plus hauts passent devant)
    var N = 10, etages = [];
    for (var k = 0; k < N; k++) {
      var yb = SOMMET + (BASE - SOMMET) * (k + 1) / N;
      var yt = k === 0 ? SOMMET - 6 : Math.max(SOMMET, yb - (BASE - SOMMET) / N * 2.5);
      etages.push(etage(yt, yb));
    }
    for (var e = N - 1; e >= 0; e--) s.push(etages[e]);

    // cadeaux au pied du sapin
    s.push(cadeauxAuPied());

    // guirlandes de perles dorées
    [[118, 142], [196, 172], [268, 300], [352, 326], [420, 446]].forEach(function (g, i) {
      var x1 = CX - demi(g[0]) + 8, x2 = CX + demi(g[1]) - 8;
      var bas = Math.max(g[0], g[1]) + 22 + i * 3;
      var d = 'M' + f(x1) + ',' + g[0] + ' Q' + CX + ',' + bas + ' ' + f(x2) + ',' + g[1];
      s.push('<path d="' + d + '" fill="none" stroke="#7a5a1a" stroke-width="1" opacity=".6"/>');
      s.push('<path d="' + d + '" fill="none" stroke="#f1cf7a" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.01 5.5"/>');
    });

    // décorations placées au hasard, sans toucher les cadeaux
    var decos = [];
    function placer(rayon) {
      for (var essai = 0; essai < 400; essai++) {
        var y = entre(92, 458), x = CX + entre(-1, 1) * (demi(y) - rayon - 4);
        var libre = occupes.concat(decos).every(function (o) {
          var dx = o.x - x, dy = o.y - y;
          return Math.sqrt(dx * dx + dy * dy) > o.r + rayon + 3;
        });
        if (libre) { var p = { x: x, y: y, r: rayon }; decos.push(p); return p; }
      }
      return null;
    }
    var couleurs = ['bRouge', 'bRouge', 'bRouge', 'bOr', 'bOr', 'bOr', 'bVert', 'bChamp', 'bChamp'];
    for (var b = 0; b < 36; b++) {
      var p = placer(entre(5, 8.5));
      if (p) s.push(dessinBoule(p, couleurs[Math.floor(R() * couleurs.length)]));
    }
    for (var e2 = 0; e2 < 12; e2++) {
      var q = placer(entre(5, 7));
      if (q) s.push(dessinEtoile(q));
    }
    for (var n = 0; n < 8; n++) {
      var r = placer(7);
      if (r) s.push(dessinNoeud(r));
    }

    // lumières chaudes
    var groupes = ['', '', '<g class="scintille">', '<g class="scintille d1">', '<g class="scintille d2">'];
    var lum = [[], [], [], [], []];
    for (var i = 0; i < 170; i++) {
      var y = entre(78, 470), x = CX + entre(-1, 1) * demi(y) * 0.97;
      lum[i % 5].push('<circle cx="' + f(x) + '" cy="' + f(y) + '" r="5" fill="url(#halo)"/>' +
        '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="1.3" fill="#fff8de"/>');
    }
    lum.forEach(function (l, i) {
      s.push(groupes[i] ? groupes[i] + l.join('') + '</g>' : l.join(''));
    });

    s.push('</svg>');
    return s.join('');
  }

  function boule(id, clair, milieu, sombre) {
    return '<radialGradient id="' + id + '" cx="35%" cy="30%" r="75%">' +
      '<stop offset="0" stop-color="' + clair + '"/><stop offset=".45" stop-color="' + milieu + '"/>' +
      '<stop offset="1" stop-color="' + sombre + '"/></radialGradient>';
  }

  function etage(yt, yb) {
    var hb = demi(yb) * 1.04 + 4, ht = demi(yt) * 0.55;
    var gauche = [], bas = [], neige = [], aiguilles = [];
    var m = 4;
    for (var i = 0; i <= m; i++) {
      var t = i / m, y = yt + (yb - yt) * t;
      var x = CX - ht - (hb - ht) * t - (i % 2 ? entre(0, 5) : 0);
      gauche.push([x, y]);
    }
    var nb = Math.max(3, Math.round(2 * hb / 15)), pas = 2 * hb / nb;
    for (var j = 0; j <= nb; j++) {
      var xp = CX - hb + j * pas, u = (xp - CX) / hb, chute = 6 * u * u + 4;
      var pointe = [xp, yb + chute + entre(0, 6)];
      bas.push(pointe);
      if (j < nb) {
        var xv = xp + pas / 2, uv = (xv - CX) / hb, cv = 6 * uv * uv + 4;
        bas.push([xv, yb + cv * 0.6 - 4 - entre(0, 5)]);
        // neige posée sur les branches
        if (R() < 0.6) {
          neige.push('<ellipse cx="' + f(xv + entre(-3, 3)) + '" cy="' + f(yb + cv * 0.6 - 7) +
            '" rx="' + f(pas * entre(0.45, 0.75)) + '" ry="' + f(entre(2.4, 4)) + '" fill="url(#gNeige)"/>');
        }
      }
      if (R() < 0.3) {
        neige.push('<circle cx="' + f(pointe[0]) + '" cy="' + f(pointe[1] - 2) + '" r="' + f(entre(1.2, 2.2)) + '" fill="#f4f8ff"/>');
      }
    }
    // aiguilles : petits traits clairs et sombres
    for (var a = 0; a < 34; a++) {
      var ya = entre(yb - 16, yb + 4), xa = CX + entre(-0.92, 0.92) * hb * (ya - yt) / (yb - yt + 1);
      var dx = (xa - CX) / hb * 4 + entre(-0.6, 0.6);
      aiguilles.push('<line x1="' + f(xa) + '" y1="' + f(ya) + '" x2="' + f(xa + dx) + '" y2="' + f(ya + entre(5, 9)) +
        '" stroke="' + (a % 3 ? '#3f9460' : '#06200f') + '" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>');
    }
    var droite = gauche.map(function (p) { return [2 * CX - p[0], p[1]]; }).reverse();
    var pts = [[CX, yt]].concat(gauche, bas, droite);
    var d = 'M' + pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' L') + 'Z';
    // neige accumulée en haut de l'étage, côté lumière
    var dessus = '<path d="M' + f(CX - ht * 0.8) + ',' + f(yt + 3) + ' Q' + CX + ',' + f(yt - 3) + ' ' + f(CX + ht * 0.6) + ',' + f(yt + 4) +
      '" stroke="#f4f8ff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>';
    return '<g filter="url(#rameaux)"><path d="' + d + '" fill="url(#gVert)"/><path d="' + d + '" fill="url(#gOmbre)"/>' +
      aiguilles.join('') + neige.join('') + (yt > SOMMET ? dessus : '') + '</g>';
  }

  function cadeauxAuPied() {
    var liste = [
      [62, 492, 30, 20, 1], [96, 478, 42, 32, 0], [142, 488, 32, 24, 2], [180, 494, 26, 18, 3],
      [222, 484, 36, 28, 4], [262, 472, 46, 36, 0], [312, 486, 34, 26, 3], [348, 494, 26, 18, 1]
    ];
    return liste.map(function (c) {
      var x = c[0], y = c[1], w = c[2], h = c[3], e = EMBALLAGES[c[4]];
      return '<g>' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="' + e[0] + '"/>' +
        '<rect x="' + (x - 2) + '" y="' + y + '" width="' + (w + 4) + '" height="' + (h * 0.22) + '" rx="2" fill="' + e[1] + '"/>' +
        '<rect x="' + (x + w / 2 - 2.5) + '" y="' + y + '" width="5" height="' + h + '" fill="' + e[2] + '"/>' +
        '<path d="M' + (x + w / 2) + ',' + y + ' c-9,-9 -14,1 0,0 c14,1 9,-9 0,0" fill="none" stroke="' + e[2] + '" stroke-width="2.5"/>' +
        '<rect x="' + (x - 2) + '" y="' + (y - 2) + '" width="' + (w + 4) + '" height="4" rx="2" fill="#f4f8ff" opacity=".9"/>' +
        '</g>';
    }).join('') +
      '<ellipse cx="200" cy="512" rx="175" ry="8" fill="#ffffff" opacity=".7" filter="url(#flou)"/>';
  }

  function dessinBoule(p, couleur) {
    return '<line x1="' + f(p.x) + '" y1="' + f(p.y - p.r - 6) + '" x2="' + f(p.x) + '" y2="' + f(p.y - p.r) + '" stroke="#d9b45a" stroke-width=".7"/>' +
      '<rect x="' + f(p.x - 1.8) + '" y="' + f(p.y - p.r - 2) + '" width="3.6" height="3" rx=".8" fill="#caa24a"/>' +
      '<circle cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + f(p.r) + '" fill="url(#' + couleur + ')"/>' +
      '<ellipse cx="' + f(p.x - p.r * 0.35) + '" cy="' + f(p.y - p.r * 0.4) + '" rx="' + f(p.r * 0.28) + '" ry="' + f(p.r * 0.18) +
      '" fill="#fff" opacity=".7" transform="rotate(-30 ' + f(p.x) + ' ' + f(p.y) + ')"/>';
  }

  function dessinEtoile(p) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5, ray = i % 2 ? p.r * 0.45 : p.r;
      pts.push(f(p.x + Math.cos(ang) * ray) + ',' + f(p.y + Math.sin(ang) * ray));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="url(#gEtoileDeco)" stroke="#8a6414" stroke-width=".5" transform="rotate(' +
      f(entre(-20, 20)) + ' ' + f(p.x) + ' ' + f(p.y) + ')"/>';
  }

  function dessinNoeud(p) {
    var x = p.x, y = p.y;
    return '<g fill="#a3142b" stroke="#6a0b19" stroke-width=".6">' +
      '<path d="M' + f(x) + ',' + f(y) + ' c-8,-6 -9,4 0,0z"/><path d="M' + f(x) + ',' + f(y) + ' c8,-6 9,4 0,0z"/>' +
      '<path d="M' + f(x) + ',' + f(y) + ' l-4,8 l2,-1 l1,2z"/><path d="M' + f(x) + ',' + f(y) + ' l4,8 l-2,-1 l-1,2z"/>' +
      '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="1.6"/></g>';
  }

  // ---------- Cadeaux cliquables ----------
  function creerCadeau(p) {
    var jour = p.jour, etat = etatDe(jour), c = parJour[jour] || {};
    var e = EMBALLAGES[(jour * 5) % EMBALLAGES.length];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cadeau ' + etat + (c.manquant ? ' manquant' : '');
    b.dataset.jour = jour;
    b.style.left = (p.x / L * 100) + '%';
    b.style.top = (p.y / H * 100) + '%';
    b.style.setProperty('--c', e[0]);
    b.style.setProperty('--c2', e[1]);
    b.style.setProperty('--r', e[2]);
    b.setAttribute('aria-label', libelle(jour, etat) + (c.manquant ? ' (contenu manquant)' : ''));
    b.title = libelle(jour, etat);
    if (etat === 'fermee') b.setAttribute('aria-disabled', 'true');
    b.innerHTML = '<span class="tout"><span class="fil"></span>' +
      '<span class="boite"></span><span class="couvercle"></span><span class="noeud"></span>' +
      '<span class="num" aria-hidden="true">' + jour + '</span>' +
      '<span class="badge" aria-hidden="true">' + ICONES[etat] + '</span>' +
      (c.manquant ? '<span class="alerte" aria-hidden="true">⚠</span>' : '') + '</span>';
    return b;
  }

  function creerEtoile() {
    var etat = etatDe(25), c = parJour[25] || {};
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'etoile ' + etat + (c.manquant ? ' manquant' : '');
    b.dataset.jour = 25;
    b.setAttribute('aria-label', libelle(25, etat));
    b.title = libelle(25, etat);
    if (etat === 'fermee') b.setAttribute('aria-disabled', 'true');
    b.innerHTML = '<span class="forme"></span><span class="num" aria-hidden="true">25</span>' +
      '<span class="badge" aria-hidden="true">' + ICONES[etat] + '</span>' +
      (c.manquant ? '<span class="alerte" aria-hidden="true">⚠</span>' : '');
    return b;
  }

  function construireSapin() {
    var sapin = document.getElementById('sapin');
    var pos = positionsCadeaux();
    var occupes = pos.map(function (p) { return { x: p.x, y: p.y - 4, r: 20 }; });
    occupes.push({ x: CX, y: 38, r: 30 }); // l'étoile
    sapin.innerHTML = dessinerSapin(occupes);
    sapin.appendChild(creerEtoile());
    pos.slice().sort(function (a, b) { return a.jour - b.jour; }).forEach(function (p) {
      sapin.appendChild(creerCadeau(p));
    });
    sapin.addEventListener('click', function (e) {
      var b = e.target.closest('[data-jour]');
      if (b) cliquer(+b.dataset.jour, b);
    });
  }

  // ---------- Interactions ----------
  var minuteur;
  function annoncer(texte) {
    var a = document.getElementById('annonce');
    a.textContent = texte;
    a.classList.add('visible');
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { a.classList.remove('visible'); }, 3500);
  }

  function cliquer(jour, bouton) {
    if (etatDe(jour) === 'fermee') {
      bouton.classList.remove('secoue');
      void bouton.offsetWidth;
      bouton.classList.add('secoue');
      annoncer('🔒 Patience ! ' + (jour === 25 ? "L'étoile" : 'Le cadeau n°' + jour) +
        ' s\'ouvrira ' + quand(jour) + ' (heure de Paris).');
      return;
    }
    ouvrir(parJour[jour] || { jour: jour, manquant: true });
  }

  // Ouverture : le Père Noël et ses lutins tirent la nouvelle sur un bandeau, puis le cadeau s'ouvre
  function ouvrir(c) {
    if (reduit || c.manquant) { afficherFenetre(c); return; }
    var scene = document.getElementById('scene');
    var cortege = document.getElementById('cortege');
    document.getElementById('bandeau-texte').textContent = (c.emoji ? c.emoji + ' ' : '') + c.titre;
    scene.hidden = false;
    scene.classList.remove('joue');
    void scene.offsetWidth; // relance l'animation
    scene.classList.add('joue');
    musique.carillon();

    var fini = false;
    function terminer() {
      if (fini) return;
      fini = true;
      scene.classList.remove('joue');
      scene.hidden = true;
      cortege.removeEventListener('animationend', surFin);
      scene.removeEventListener('click', terminer);
      document.removeEventListener('keydown', surTouche);
      afficherFenetre(c);
    }
    function surFin(e) { if (e.target === cortege) terminer(); }
    function surTouche(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); terminer(); } }
    cortege.addEventListener('animationend', surFin);
    setTimeout(terminer, 6000); // filet de sécurité si l'animation est suspendue (onglet en arrière-plan)
    scene.addEventListener('click', terminer);
    document.addEventListener('keydown', surTouche);
  }

  function afficherFenetre(c) {
    var fen = document.getElementById('fenetre');
    document.getElementById('fenetre-jour').textContent =
      (c.jour === 25 ? 'Étoile du ' : 'Cadeau du ') + jourEnLettres(c.jour);
    var titre = document.getElementById('fenetre-titre');
    var texte = document.getElementById('fenetre-texte');
    var image = document.getElementById('fenetre-image');
    var voeux = document.getElementById('fenetre-voeux');
    image.innerHTML = '';
    if (c.manquant) {
      document.getElementById('fenetre-emoji').textContent = D.dev ? '⚠' : '🎁';
      titre.textContent = D.dev ? 'Contenu manquant' : 'Surprise en préparation';
      texte.textContent = D.dev
        ? 'Cette case n\'a pas encore de titre ou de texte dans contenu/cases.json.'
        : 'Les lutins emballent encore ce cadeau. Revenez un peu plus tard !';
    } else {
      document.getElementById('fenetre-emoji').textContent = c.emoji || '🎁';
      titre.textContent = c.titre;
      texte.textContent = c.texte;
      if (c.image) {
        var fig = document.createElement('figure');
        var img = document.createElement('img');
        img.src = c.image;
        img.alt = c.titre;
        fig.appendChild(img);
        if (c.credit) {
          var cap = document.createElement('figcaption');
          cap.textContent = c.credit;
          fig.appendChild(cap);
        }
        image.appendChild(fig);
      }
    }
    voeux.hidden = !c.voeux;
    voeux.textContent = c.voeux || '';
    fen.showModal();
  }

  // ---------- Musique en continu ----------
  // Une chanson libre (assets/musique.mp3) si elle est présente, sinon « Jingle Bells »
  // (domaine public) jouée au synthétiseur. Les navigateurs n'autorisent le son qu'après
  // un premier geste du visiteur : la musique démarre donc au premier clic ou à la première touche.
  var musique = (function () {
    var chanson = document.getElementById('chanson');
    var credit = document.getElementById('credit-musique');
    var fichierOk = false, lancee = false, ctx = null, sortie = null, bruit = null;
    chanson.addEventListener('canplay', function () { fichierOk = true; credit.hidden = false; });
    chanson.addEventListener('error', function () { fichierOk = false; });
    chanson.volume = 0.45;

    var NOTES = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, Cg: 261.63, Gg: 196 };
    var refrain = [
      ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['G', 1], ['C', 1.5], ['D', .5], ['E', 4],
      ['F', 1], ['F', 1], ['F', 1.5], ['F', .5], ['F', 1], ['E', 1], ['E', 1], ['E', .5], ['E', .5],
      ['E', 1], ['D', 1], ['D', 1], ['E', 1], ['D', 2], ['G', 2],
      ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['G', 1], ['C', 1.5], ['D', .5], ['E', 4],
      ['F', 1], ['F', 1], ['F', 1.5], ['F', .5], ['F', 1], ['E', 1], ['E', 1], ['E', .5], ['E', .5],
      ['G', 1], ['G', 1], ['F', 1], ['D', 1], ['C', 4]
    ];
    var TEMPS = 0.32;

    function contexte() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sortie = ctx.createGain();
      sortie.gain.value = 0.22;
      sortie.connect(ctx.destination);
      bruit = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      var d = bruit.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function cloche(freq, t, duree, volume) {
      var g = ctx.createGain(), fin = t + Math.max(duree * 1.5, 0.45);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, fin);
      g.connect(sortie);
      [[1, 1, 'sine'], [2, 0.3, 'sine'], [3.01, 0.08, 'triangle']].forEach(function (h) {
        var o = ctx.createOscillator(), gh = ctx.createGain();
        o.type = h[2]; o.frequency.value = freq * h[0]; gh.gain.value = h[1];
        o.connect(gh); gh.connect(g);
        o.start(t); o.stop(fin + 0.05);
      });
    }
    function grelot(t) {
      var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = bruit; fl.type = 'highpass'; fl.frequency.value = 6000;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      s.connect(fl); fl.connect(g); g.connect(sortie);
      s.start(t); s.stop(t + 0.1);
    }
    function programmer(debut) {
      var t = debut;
      refrain.forEach(function (n) { cloche(NOTES[n[0]], t, n[1] * TEMPS, 0.45); t += n[1] * TEMPS; });
      var temps = Math.round((t - debut) / TEMPS);
      for (var i = 0; i < temps; i++) {
        grelot(debut + i * TEMPS);
        if (i % 2 === 0) cloche(i % 4 === 0 ? NOTES.Cg : NOTES.Gg, debut + i * TEMPS, TEMPS, 0.16);
      }
      var fin = t + TEMPS * 2;
      setTimeout(function () { programmer(fin); }, (fin - ctx.currentTime - 0.5) * 1000);
    }
    function synthe() {
      if (!contexte()) return;
      ctx.resume();
      programmer(ctx.currentTime + 0.1);
    }
    function lancer() {
      if (lancee) return;
      lancee = true;
      contexte();
      if (ctx) ctx.resume();
      if (fichierOk || chanson.readyState >= 2) {
        chanson.play().catch(function () { synthe(); });
      } else {
        synthe();
      }
    }
    // tentative immédiate (acceptée par certains navigateurs), sinon au premier geste
    chanson.play().then(function () { lancee = true; }).catch(function () {});
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, lancer, { once: true, capture: true });
    });
    return {
      carillon: function () {
        if (!contexte()) return;
        var t = ctx.currentTime + 0.05;
        ['G', 'C', 'E', 'G'].forEach(function (n, i) { cloche(NOTES[n] * 2, t + i * 0.12, 0.3, 0.25); });
      }
    };
  })();

  // ---------- En-tête ----------
  function messageDuJour() {
    var m = document.getElementById('message-jour');
    var debut = dateDe(1);
    var nbOuverts = D.cases.filter(function (c) { return !c.ouvreLe && !c.ouvreA; }).length;
    if (D.mode === 'soiree') {
      m.innerHTML = '<strong>Mode soirée</strong> : un cadeau s\'ouvre toutes les 5 minutes. ' +
        (D.dujour ? 'Le cadeau n°' + D.dujour + ' vient de s\'ouvrir ! ' : '') +
        (D.prochaine ? 'Prochain cadeau à <strong>' + heure(D.prochaine) + '</strong>.' : 'Tous les cadeaux sont ouverts !');
    } else if (AUJ < debut && nbOuverts > 0) {
      m.innerHTML = 'Les cadeaux ouverts pendant la soirée restent à relire. Le prochain s\'ouvre le <strong>' +
        jourEnLettres(D.prochaine || 1) + ' à minuit</strong>.';
    } else if (AUJ < debut) {
      var ms = Date.parse(debut + 'T00:00:00Z') - Date.parse(AUJ + 'T00:00:00Z');
      var n = Math.round(ms / 86400000);
      m.innerHTML = 'Le premier cadeau s\'ouvre le <strong>1er décembre à minuit</strong>. Plus que ' +
        '<strong>' + n + ' jour' + (n > 1 ? 's' : '') + '</strong> à patienter !';
    } else if (AUJ < dateDe(25)) {
      var j = +AUJ.slice(8, 10);
      m.innerHTML = 'Nous sommes le <strong>' + jourEnLettres(j) + '</strong> : le cadeau n°' + j +
        ' vous attend sur le sapin !';
    } else if (AUJ === dateDe(25)) {
      m.innerHTML = '<strong>Joyeux Noël !</strong> L\'étoile du sapin s\'est allumée pour vous.';
    } else {
      m.innerHTML = '<strong>Joyeux Noël et belle année ' + (D.annee + 1) + ' !</strong>';
    }
  }

  function bandeauDev() {
    if (!D.dev) return;
    var manquantes = D.cases.filter(function (c) { return c.manquant; }).map(function (c) { return c.jour; });
    var b = document.getElementById('bandeau-dev');
    b.textContent = '🛠 Mode construction : calendrier vu le ' + dateLongue(AUJ) +
      (D.simulee ? ' (date simulée)' : '') + ' · ' +
      (manquantes.length ? 'Cases sans contenu : ' + manquantes.join(', ') : 'Toutes les cases ont un contenu');
    b.hidden = false;
  }

  function neige() {
    if (reduit) return;
    var n = document.querySelector('.neige');
    for (var i = 0; i < 50; i++) {
      var fl = document.createElement('span');
      fl.className = 'flocon';
      fl.textContent = i % 3 ? '•' : '❄';
      fl.style.left = Math.random() * 100 + '%';
      fl.style.fontSize = (5 + Math.random() * 11) + 'px';
      fl.style.animationDuration = (8 + Math.random() * 10) + 's';
      fl.style.animationDelay = (-Math.random() * 15) + 's';
      fl.style.setProperty('--derive', (Math.random() * 80 - 40) + 'px');
      n.appendChild(fl);
    }
  }

  document.getElementById('fermer').addEventListener('click', function () {
    document.getElementById('fenetre').close();
  });
  document.getElementById('fenetre').addEventListener('click', function (e) {
    if (e.target === this) this.close(); // clic sur le fond
  });

  // Point de sauvegarde en ligne, pour savoir ce que les visiteurs ont sous les yeux
  if (D.version) {
    var dc = (D.construit || '').split('T');
    document.getElementById('version').textContent = 'Version ' + D.version +
      (dc[0] ? ' · construite le ' + dc[0].split('-').reverse().join('/') + ' à ' + (dc[1] || '').replace(':', 'h') : '') +
      ' · ' + (D.mode === 'soiree' ? 'mode soirée (1 cadeau / 5 min)' : 'rythme normal (1 cadeau / jour)');
  }

  if (D.mode === 'soiree') {
    document.getElementById('rythme').textContent = 'Mode soirée : un cadeau s\'ouvre toutes les 5 minutes, heure de Paris.';
  }

  bandeauDev();
  messageDuJour();
  construireSapin();
  neige();
})();
