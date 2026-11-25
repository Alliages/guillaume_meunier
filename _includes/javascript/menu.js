/* Menu mobile : bouton accessible (aria-expanded), fermeture avec Échap.
   ATTENTION : le layout « compress » met tout sur une ligne : uniquement des commentaires en bloc. */
(function () {
  var bouton = document.querySelector('.mobile-nav');
  var nav = document.querySelector('.navigation');
  var entete = document.querySelector('header.main-header');
  if (!bouton || !nav) { return; }

  function basculer(ouvrir) {
    nav.classList.toggle('show', ouvrir);
    bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
    bouton.textContent = ouvrir ? '\u00d7 Fermer' : 'Menu';
    document.body.classList.toggle('prevent-scroll-mobile', ouvrir);
    if (entete) { entete.classList.toggle('header-prevent-hide', ouvrir); }
  }

  bouton.addEventListener('click', function () {
    basculer(!nav.classList.contains('show'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('show')) {
      basculer(false);
      bouton.focus();
    }
  });
}());
