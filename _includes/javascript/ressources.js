/* Page Ressources : frise, recherche et filtres.
   ATTENTION : le layout « compress » met tout le HTML sur une ligne.
   Donc uniquement des commentaires en bloc et des points-virgules partout. */
(function () {
  /* ── Paramètres ─────────────────────────────────────────────────────────── */
  var RACINE = document.querySelector('.ressources');
  var URL_DONNEES = RACINE.getAttribute('data-source');
  var TAILLE_PAQUET = 100;              /* cartes affichées à chaque « Voir plus » */
  var ANNEE_DEBUT = 2011;
  var ANNEE_FIN = new Date().getFullYear();
  var SOURCES = {                       /* ordre d'empilement et libellés */
    linkedin:  'Posts LinkedIn',
    article:   'Articles longs',
    blog:      'Blog',
    lien:      'Presse et vidéos',
    ressource: 'Outils du site'
  };
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  var el = {
    chiffres:   RACINE.querySelector('[data-chiffres]'),
    phases:     RACINE.querySelector('[data-phases]'),
    barres:     RACINE.querySelector('[data-barres]'),
    recherche:  RACINE.querySelector('[data-recherche]'),
    sources:    RACINE.querySelector('[data-sources]'),
    categories: RACINE.querySelector('[data-categories]'),
    compteur:   RACINE.querySelector('[data-compteur]'),
    reset:      RACINE.querySelector('[data-reset]'),
    liste:      RACINE.querySelector('[data-liste]'),
    plus:       RACINE.querySelector('[data-plus]')
  };

  /* État des filtres, synchronisé avec l'URL (?q=…&annee=…&cat=…&source=…) */
  var etat = { q: '', annee: '', cat: '', source: '' };
  var donnees = null;
  var resultats = [];
  var affiches = 0;

  /* ── Outils ─────────────────────────────────────────────────────────────── */
  function normaliser(texte) {
    return (texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'");
  }
  function echapper(texte) {
    return (texte || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function formaterDate(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' ' + MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function phaseDe(annee) {
    var trouvee = donnees.phases.filter(function (ph) { return annee >= ph.debut && annee <= ph.fin; });
    return trouvee.length ? trouvee[0].nom : '';
  }
  function puce(libelle, valeur, active, attribut, classe) {
    return '<button type="button" class="puce ' + (classe || '') + '" ' + attribut + '="' + echapper(valeur) +
      '" aria-pressed="' + active + '">' + echapper(libelle) + '</button>';
  }

  /* ── URL ↔ état ─────────────────────────────────────────────────────────── */
  function lireUrl() {
    var params = new URLSearchParams(location.search);
    Object.keys(etat).forEach(function (cle) { etat[cle] = params.get(cle) || ''; });
    el.recherche.value = etat.q;
  }
  function ecrireUrl() {
    var params = new URLSearchParams();
    Object.keys(etat).forEach(function (cle) { if (etat[cle]) { params.set(cle, etat[cle]); } });
    var chaine = params.toString();
    history.replaceState(null, '', location.pathname + (chaine ? '?' + chaine : ''));
  }

  /* ── Filtrage ───────────────────────────────────────────────────────────── */
  function correspond(item, sauf) {
    if (sauf !== 'annee' && etat.annee && item.date.slice(0, 4) !== etat.annee) { return false; }
    if (sauf !== 'cat' && etat.cat && item.categorie !== etat.cat) { return false; }
    if (sauf !== 'source' && etat.source && item.source !== etat.source) { return false; }
    if (etat.q) {
      var mots = normaliser(etat.q).split(/\s+/).filter(Boolean);
      return mots.every(function (m) { return item._index.indexOf(m) !== -1; });
    }
    return true;
  }

  /* ── Rendu : frise ──────────────────────────────────────────────────────── */
  function rendreFrise() {
    /* Comptes par année et par source, hors filtre année (la frise sert à le choisir) */
    var comptes = {};
    var max = 1;
    for (var a = ANNEE_DEBUT; a <= ANNEE_FIN; a++) { comptes[a] = { total: 0 }; }
    donnees.items.forEach(function (it) {
      var an = parseInt(it.date.slice(0, 4), 10);
      if (!comptes[an] || !correspond(it, 'annee')) { return; }
      comptes[an][it.source] = (comptes[an][it.source] || 0) + 1;
      comptes[an].total++;
    });
    Object.keys(comptes).forEach(function (an) { max = Math.max(max, comptes[an].total); });

    el.barres.innerHTML = Object.keys(comptes).map(function (an) {
      var c = comptes[an];
      var segments = Object.keys(SOURCES).map(function (s) {
        return c[s] ? '<span class="seg seg--' + s + '" style="height:' + (100 * c[s] / max) + '%"></span>' : '';
      }).join('');
      return '<button type="button" class="barre" data-annee="' + an + '" aria-pressed="' + (etat.annee === an) +
        '" title="' + an + ' : ' + c.total + ' publication(s)"><span class="barre-pile">' + segments +
        '</span><span class="barre-an">' + an.slice(4) + '</span></button>';
    }).join('');

    /* Bandeau des phases : largeur proportionnelle au nombre d'années */
    var nbAnnees = ANNEE_FIN - ANNEE_DEBUT + 1;
    el.phases.innerHTML = donnees.phases.map(function (ph) {
      var fin = Math.min(ph.fin, ANNEE_FIN);
      return '<span class="phase" style="width:' + (100 * (fin - ph.debut + 1) / nbAnnees) + '%">' + echapper(ph.nom) + '</span>';
    }).join('');
  }

  /* ── Rendu : puces de filtre ────────────────────────────────────────────── */
  function rendrePuces() {
    el.sources.innerHTML = Object.keys(SOURCES).map(function (s) {
      return puce(SOURCES[s], s, etat.source === s, 'data-filtre-source', 'puce--' + s);
    }).join('');
    el.categories.innerHTML = donnees.categories.map(function (c) {
      return puce(c, c, etat.cat === c, 'data-filtre-cat', '');
    }).join('');
  }

  /* ── Rendu : liste ──────────────────────────────────────────────────────── */
  function carte(it) {
    return '<article class="carte carte--' + it.source + '">' +
      '<p class="carte-meta"><time datetime="' + it.date + '">' +
      (it.source === 'ressource' ? 'Outil du site' : formaterDate(it.date)) + '</time>' +
      ' · ' + SOURCES[it.source] + (it.categorie ? ' · ' + echapper(it.categorie) : '') + '</p>' +
      '<h3 class="carte-titre"><a href="' + echapper(it.lien) + '" target="_blank" rel="noopener">' + echapper(it.titre) + '</a></h3>' +
      (it.extrait && it.extrait !== it.titre ? '<p class="carte-extrait">' + echapper(it.extrait) + '</p>' : '') +
      '</article>';
  }
  function rendrePaquet() {
    var html = '';
    var anneePrecedente = affiches ? resultats[affiches - 1].date.slice(0, 4) : '';
    resultats.slice(affiches, affiches + TAILLE_PAQUET).forEach(function (it) {
      var an = it.date.slice(0, 4);
      if (an !== anneePrecedente) {
        html += '<h2 class="annee-titre"><span>' + an + '</span> <small>' + echapper(phaseDe(parseInt(an, 10))) + '</small></h2>';
        anneePrecedente = an;
      }
      html += carte(it);
    });
    el.liste.insertAdjacentHTML('beforeend', html);
    affiches = Math.min(affiches + TAILLE_PAQUET, resultats.length);
    el.plus.hidden = affiches >= resultats.length;
  }
  function rendre() {
    resultats = donnees.items.filter(function (it) { return correspond(it); });
    affiches = 0;
    el.liste.innerHTML = resultats.length ? '' : '<p class="ressources-vide">Aucun résultat.</p>';
    el.compteur.textContent = resultats.length + ' publication' + (resultats.length > 1 ? 's' : '');
    el.reset.hidden = !(etat.q || etat.annee || etat.cat || etat.source);
    rendreFrise();
    rendrePuces();
    if (resultats.length) { rendrePaquet(); }
    ecrireUrl();
  }

  /* ── Événements ─────────────────────────────────────────────────────────── */
  function basculer(cle, valeur) {
    etat[cle] = etat[cle] === valeur ? '' : valeur;
    rendre();
  }
  RACINE.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) { return; }
    if (b.hasAttribute('data-annee')) { basculer('annee', b.getAttribute('data-annee')); }
    else if (b.hasAttribute('data-filtre-source')) { basculer('source', b.getAttribute('data-filtre-source')); }
    else if (b.hasAttribute('data-filtre-cat')) { basculer('cat', b.getAttribute('data-filtre-cat')); }
    else if (b === el.plus) { rendrePaquet(); }
    else if (b === el.reset) {
      etat = { q: '', annee: '', cat: '', source: '' };
      el.recherche.value = '';
      rendre();
    }
  });
  var minuterie;
  el.recherche.addEventListener('input', function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () { etat.q = el.recherche.value.trim(); rendre(); }, 200);
  });

  /* ── Chargement ─────────────────────────────────────────────────────────── */
  fetch(URL_DONNEES).then(function (r) { return r.json(); }).then(function (json) {
    donnees = json;
    donnees.items.forEach(function (it) {
      it._index = normaliser(it.titre + ' ' + it.extrait + ' ' + it.categorie);
    });
    var nbItems = donnees.items.length;
    el.chiffres.textContent = nbItems + ' publications · ' + ANNEE_DEBUT + '-' + ANNEE_FIN + ' · ' +
      donnees.categories.length + ' thèmes';
    lireUrl();
    rendre();
  }).catch(function () {
    el.liste.innerHTML = '<p class="ressources-vide">Les données n\'ont pas pu être chargées.</p>';
  });
}());
