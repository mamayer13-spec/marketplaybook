/*
 * Gemeinsames Verhalten aller Seiten im Hausdesign, Stand 28.8.2026.
 *
 * Bewusst klein und ohne Bibliothek: Lesefortschritt, Einlauf beim
 * Scrollen, hochzaehlende Kennzahlen, Abschnittsnummern.
 *
 * Zwei Dinge, die beim Bauen Zeit gekostet haben und deshalb hier
 * stehen:
 *  - Die Einlauf-Regel greift nur, wenn dieses Skript laeuft
 *    (Klasse `bewegt` am <html>). Sonst waere der halbe Seiteninhalt
 *    unsichtbar, falls das Skript blockiert wird.
 *  - Dazu ein Sicherheitsnetz: Was der Beobachter nach zwei Sekunden
 *    nicht eingeblendet hat, wird trotzdem sichtbar gemacht.
 */
(function () {
  "use strict";

  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lesefortschritt ---------- */
  var linie = document.getElementById("fortschritt");
  if (linie) {
    var laeuft = false;
    var stellen = function () {
      laeuft = false;
      var hoehe = document.documentElement.scrollHeight - innerHeight;
      var anteil = hoehe > 0 ? Math.min(1, scrollY / hoehe) : 0;
      linie.style.width = (anteil * 100).toFixed(2) + "%";
    };
    addEventListener("scroll", function () {
      if (laeuft) return;
      laeuft = true;
      requestAnimationFrame(stellen);
    }, { passive: true });
    addEventListener("resize", stellen, { passive: true });
    stellen();
  }

  /* ---------- Abschnittsnummern ---------- */
  var teile = [].slice.call(document.querySelectorAll(".auftritt"));
  teile.forEach(function (t, i) {
    var h = t.querySelector("h2");
    if (!h || h.querySelector(".zahl") || t.hasAttribute("data-ohne-nummer")) return;
    var z = document.createElement("span");
    z.className = "zahl";
    z.textContent = ("0" + (i + 1)).slice(-2);
    h.insertBefore(z, h.firstChild);
  });

  /* ---------- Einlauf ---------- */
  if (ruhig || !("IntersectionObserver" in window)) {
    teile.forEach(function (t) { t.classList.add("da"); });
  } else {
    document.documentElement.classList.add("bewegt");
    setTimeout(function () {
      teile.forEach(function (t) { t.classList.add("da"); });
    }, 2000);
    var wache = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("da");
        wache.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    teile.forEach(function (t) { wache.observe(t); });
  }

  /* ---------- Kennzahlen zaehlen einmal hoch ---------- */
  // Kennzahlen in einem Block mit data-scroll laufen NICHT per Zeitgeber,
  // sondern haengen an der Scrollposition (bewegung.js). Hier deshalb
  // ueberspringen. Alle anderen Seiten bleiben unveraendert.
  var werte = [].slice.call(document.querySelectorAll(".kennzahl .wert"))
    .filter(function (w) { return !w.closest(".kennzahlen[data-scroll]"); });
  if (werte.length && !ruhig && "IntersectionObserver" in window) {
    var zaehler = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        zaehler.unobserve(e.target);
        var ziel = e.target.textContent.trim();
        var treffer = ziel.match(/-?[0-9]+([.,][0-9]+)?/);
        if (!treffer) return;
        var zahl = parseFloat(treffer[0].replace(",", "."));
        var vorn = ziel.slice(0, treffer.index);
        var hinten = ziel.slice(treffer.index + treffer[0].length);
        var start = null, dauer = 1100;
        var schritt = function (zeit) {
          if (start === null) start = zeit;
          var t = Math.min(1, (zeit - start) / dauer);
          var weich = 1 - Math.pow(1 - t, 3);
          e.target.textContent = vorn + Math.round(zahl * weich) + hinten;
          if (t < 1) requestAnimationFrame(schritt);
          else e.target.textContent = ziel;
        };
        requestAnimationFrame(schritt);
      });
    }, { threshold: 0.6 });
    werte.forEach(function (w) { zaehler.observe(w); });
  }
})();
