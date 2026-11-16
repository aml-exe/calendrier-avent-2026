(function () {
  'use strict';

  // Données injectées par build.ps1 : seules les cases déjà arrivées ont un contenu.
  var D = JSON.parse(document.getElementById('donnees').textContent);
  var AUJ = D.aujourdhui; // "AAAA-MM-JJ", date de Paris au moment du build (ou date simulée)
  var parJour = {};
  D.cases.forEach(function (c) { parJour[c.jour] = c; });

  var COULEURS = [
    ['#d93a3a', '#b02a2a', '#f5c542'], // rouge, ruban or
    ['#2f6fd6', '#2458ad', '#e8eef7'], // bleu, ruban argent
    ['#2e9e5b', '#227a45', '#d93a3a'], // vert, ruban rouge
    ['#e9b730', '#c79a1f', '#b02a2a'], // or, ruban rouge
    ['#8a4fc7', '#6e3ba3', '#f5c542'], // violet, ruban or
    ['#f2f2f2', '#d6d6d6', '#d93a3a']  // blanc, ruban rouge
  ];
  // Rangées du sapin, du sommet vers le bas ; la dernière est posée au pied
  var RANGEES = [[1, 2], [3, 4, 5], [6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19, 20]];
  var PIED = [21, 22, 23, 24];

  function dateDe(jour) {
    return D.annee + '-12-' + (jour < 10 ? '0' : '') + jour;
  }
  function etatDe(jour) {
    var d = dateDe(jour);
    if (AUJ < d) return 'fermee';
    if (AUJ === d) return 'dujour';
    return 'ouverte';
  }
  function jourEnLettres(jour) {
    return (jour === 1 ? '1er' : String(jour)) + ' décembre';
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
    if (etat === 'fermee') return nom + ', pas encore disponible : s\'ouvre le ' + jourEnLettres(jour) + ' à minuit';
    if (etat === 'dujour') return nom + ', cadeau du jour : à ouvrir !';
    return nom + ', déjà ouvert : à relire';
  }

  function creerCadeau(jour) {
    var etat = etatDe(jour);
    var c = parJour[jour] || {};
    var coul = COULEURS[(jour * 7) % COULEURS.length];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cadeau ' + etat + (c.manquant ? ' manquant' : '');
    b.dataset.jour = jour;
    b.style.setProperty('--c', coul[0]);
    b.style.setProperty('--c2', coul[1]);
    b.style.setProperty('--r', coul[2]);
    b.setAttribute('aria-label', libelle(jour, etat) + (c.manquant ? ' (contenu manquant)' : ''));
    b.title = libelle(jour, etat);
    if (etat === 'fermee') b.setAttribute('aria-disabled', 'true');
    b.innerHTML =
      '<span class="boite"></span><span class="couvercle"></span><span class="noeud"></span>' +
      '<span class="num" aria-hidden="true">' + jour + '</span>' +
      '<span class="badge" aria-hidden="true">' + ICONES[etat] + '</span>' +
      (c.manquant ? '<span class="alerte" aria-hidden="true">⚠</span>' : '');
    return b;
  }

  function creerEtoile() {
    var etat = etatDe(25);
    var c = parJour[25] || {};
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
    sapin.appendChild(creerEtoile());

    var feuillage = document.createElement('div');
    feuillage.className = 'feuillage';
    feuillage.innerHTML =
      '<svg class="fond" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon points="50,0 74,40 26,40" fill="var(--sapin-1)"/>' +
      '<polygon points="50,16 86,70 14,70" fill="var(--sapin-2)"/>' +
      '<polygon points="50,42 100,100 0,100" fill="var(--sapin-3)"/>' +
      '<polygon points="50,0 74,40 62,40" fill="#ffffff" opacity=".05"/>' +
      '<g fill="none" stroke="#f5c542" stroke-width="2.5" vector-effect="non-scaling-stroke" opacity=".85">' +
      '<path d="M33,30 Q50,40 67,30" vector-effect="non-scaling-stroke"/>' +
      '<path d="M22,58 Q50,72 78,58" vector-effect="non-scaling-stroke"/>' +
      '<path d="M10,88 Q50,102 90,88" vector-effect="non-scaling-stroke"/>' +
      '</g></svg>';
    RANGEES.forEach(function (r) {
      var ligne = document.createElement('div');
      ligne.className = 'rangee';
      r.forEach(function (j) { ligne.appendChild(creerCadeau(j)); });
      feuillage.appendChild(ligne);
    });
    ajouterLumieres(feuillage);
    sapin.appendChild(feuillage);

    var tronc = document.createElement('div');
    tronc.className = 'tronc';
    sapin.appendChild(tronc);

    var pied = document.createElement('div');
    pied.className = 'rangee pied-sapin';
    PIED.forEach(function (j) { pied.appendChild(creerCadeau(j)); });
    sapin.appendChild(pied);

    sapin.addEventListener('click', function (e) {
      var b = e.target.closest('[data-jour]');
      if (b) cliquer(+b.dataset.jour, b);
    });
  }

  function ajouterLumieres(feuillage) {
    var teintes = ['#ffd34d', '#ff6b6b', '#7fd3ff', '#b6ff8a', '#ffffff'];
    for (var i = 0; i < 26; i++) {
      // un point au hasard dans le triangle du sapin
      var y = 8 + Math.random() * 88;
      var demi = (y / 100) * 46;
      var x = 50 + (Math.random() * 2 - 1) * demi;
      var l = document.createElement('span');
      l.className = 'lumiere';
      l.style.left = x + '%';
      l.style.top = y + '%';
      l.style.setProperty('--l', teintes[i % teintes.length]);
      l.style.setProperty('--d', (Math.random() * 1.8).toFixed(2) + 's');
      feuillage.appendChild(l);
    }
  }

  var minuteur;
  function annoncer(texte) {
    var a = document.getElementById('annonce');
    a.textContent = texte;
    a.classList.add('visible');
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { a.classList.remove('visible'); }, 3500);
  }

  function cliquer(jour, bouton) {
    var etat = etatDe(jour);
    if (etat === 'fermee') {
      bouton.classList.remove('secoue');
      void bouton.offsetWidth;
      bouton.classList.add('secoue');
      annoncer('🔒 Patience ! ' + (jour === 25 ? "L'étoile" : 'Le cadeau n°' + jour) +
        ' s\'ouvrira le ' + jourEnLettres(jour) + ' à minuit (heure de Paris).');
      return;
    }
    ouvrir(parJour[jour] || { jour: jour, manquant: true });
  }

  // Ouverture : le Père Noël et ses lutins tirent la nouvelle sur un bandeau, puis le cadeau s'ouvre
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ouvrir(c) {
    if (reduit || c.manquant) { afficherFenetre(c); return; }
    var scene = document.getElementById('scene');
    var cortege = document.getElementById('cortege');
    document.getElementById('bandeau-texte').textContent =
      (c.emoji ? c.emoji + ' ' : '') + c.titre;
    scene.hidden = false;
    scene.classList.remove('joue');
    void scene.offsetWidth; // relance l'animation
    scene.classList.add('joue');
    if (musique.active()) musique.carillon();

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
    scene.addEventListener('click', terminer);
    document.addEventListener('keydown', surTouche);
  }

  // ---------- Musique : « Jingle Bells » (domaine public), jouée au synthétiseur ----------
  var musique = (function () {
    var ctx = null, sortie = null, prochain = null, bruit = null;
    var NOTES = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880, Cg: 261.63, Gg: 196 };
    var refrain = [
      ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['G', 1], ['C', 1.5], ['D', .5], ['E', 4],
      ['F', 1], ['F', 1], ['F', 1.5], ['F', .5], ['F', 1], ['E', 1], ['E', 1], ['E', .5], ['E', .5],
      ['E', 1], ['D', 1], ['D', 1], ['E', 1], ['D', 2], ['G', 2],
      ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['G', 1], ['C', 1.5], ['D', .5], ['E', 4],
      ['F', 1], ['F', 1], ['F', 1.5], ['F', .5], ['F', 1], ['E', 1], ['E', 1], ['E', .5], ['E', .5],
      ['G', 1], ['G', 1], ['F', 1], ['D', 1], ['C', 4]
    ];
    var TEMPS = 0.3; // durée d'une noire, en secondes

    function cloche(freq, t, duree, volume) {
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(duree * 1.5, 0.45));
      g.connect(sortie);
      [[1, 1, 'sine'], [2, 0.3, 'sine'], [3.01, 0.08, 'triangle']].forEach(function (h) {
        var o = ctx.createOscillator();
        var gh = ctx.createGain();
        o.type = h[2];
        o.frequency.value = freq * h[0];
        gh.gain.value = h[1];
        o.connect(gh); gh.connect(g);
        o.start(t); o.stop(t + Math.max(duree * 1.5, 0.45) + 0.05);
      });
    }
    function grelot(t) {
      var s = ctx.createBufferSource();
      s.buffer = bruit;
      var f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 6000;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      s.connect(f); f.connect(g); g.connect(sortie);
      s.start(t); s.stop(t + 0.1);
    }
    function programmer(debut) {
      var t = debut;
      refrain.forEach(function (n) {
        cloche(NOTES[n[0]], t, n[1] * TEMPS, 0.5);
        t += n[1] * TEMPS;
      });
      var temps = Math.round((t - debut) / TEMPS);
      for (var i = 0; i < temps; i++) {
        grelot(debut + i * TEMPS);
        if (i % 2 === 0) cloche(i % 4 === 0 ? NOTES.Cg : NOTES.Gg, debut + i * TEMPS, TEMPS, 0.18);
      }
      var fin = t + TEMPS * 2;
      prochain = setTimeout(function () { programmer(fin); }, (fin - ctx.currentTime - 0.5) * 1000);
    }
    function demarrer() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      sortie = ctx.createGain();
      sortie.gain.value = 0.25;
      sortie.connect(ctx.destination);
      bruit = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      var d = bruit.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      programmer(ctx.currentTime + 0.1);
      return true;
    }
    function arreter() {
      clearTimeout(prochain);
      if (ctx) ctx.close();
      ctx = null;
    }
    return {
      active: function () { return !!ctx; },
      basculer: function () { if (ctx) { arreter(); return false; } return demarrer(); },
      carillon: function () {
        if (!ctx) return;
        var t = ctx.currentTime + 0.05;
        ['G', 'C', 'E', 'G'].forEach(function (n, i) { cloche(NOTES[n] * 2, t + i * 0.12, 0.3, 0.3); });
      }
    };
  })();

  document.getElementById('musique').addEventListener('click', function () {
    var on = musique.basculer();
    this.setAttribute('aria-pressed', String(on));
    this.querySelector('.libelle').textContent = on ? 'Musique : en route' : 'Musique';
  });

  function afficherFenetre(c) {
    var f = document.getElementById('fenetre');
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
    f.showModal();
  }

  function messageDuJour() {
    var m = document.getElementById('message-jour');
    var debut = dateDe(1);
    if (AUJ < debut) {
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
      m.innerHTML = '<strong>Joyeux Noël et belle année ' + (D.annee + 1) + ' !</strong> ' +
        'Les 25 bonnes nouvelles restent ouvertes, à relire sans modération.';
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var n = document.querySelector('.neige');
    for (var i = 0; i < 40; i++) {
      var f = document.createElement('span');
      f.className = 'flocon';
      f.textContent = i % 3 ? '•' : '❄';
      f.style.left = Math.random() * 100 + '%';
      f.style.fontSize = (6 + Math.random() * 12) + 'px';
      f.style.animationDuration = (7 + Math.random() * 10) + 's';
      f.style.animationDelay = (-Math.random() * 15) + 's';
      f.style.setProperty('--derive', (Math.random() * 80 - 40) + 'px');
      n.appendChild(f);
    }
  }

  document.getElementById('fermer').addEventListener('click', function () {
    document.getElementById('fenetre').close();
  });
  document.getElementById('fenetre').addEventListener('click', function (e) {
    if (e.target === this) this.close(); // clic sur le fond
  });

  bandeauDev();
  messageDuJour();
  construireSapin();
  neige();
})();
