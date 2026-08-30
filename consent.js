/* Cookie-Banner und Analytics-Freigabe, gemeinsam fuer alle Seiten.

   Seit 30.8.2026 in den Farben und der Schrift des aktuellen Designsystems
   (brain/06-knowledge/licht-auf-dunklem-grund.md) - Haarlinie statt
   blauer Oberkante, Periwinkle statt Electric Blue, Inter 300 statt
   Space Grotesk 700.
   Angelegt am 30.8.2026. */
/*
 * Cookie-Consent und Analytics für alle Seiten.
 *
 * Vorher lag das gtag-Snippet fest im <head> jeder Seite und lief damit
 * sofort los — der Banner konnte gar nichts mehr verhindern, "Ablehnen"
 * war folgenlos. Hier wird Google Analytics erst nachgeladen, wenn
 * jemand zugestimmt hat. Vor der Zustimmung geht keine Anfrage an Google
 * raus.
 *
 * Der Banner wird bewusst hier im Skript aufgebaut statt im Markup jeder
 * einzelnen Seite: Er muss überall dort stehen, wo Analytics laufen kann,
 * und das ist jede Seite. Gestylt ist er mit festen Werten statt mit
 * Tailwind-Klassen, weil `gradient-button` und die Material-Symbols nur
 * auf einem Teil der Seiten definiert sind — mit Klassen sähe er auf
 * Impressum und AGB kaputt aus.
 */
(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-W87P1Z4F6X";
  var STORAGE_KEY = "cookie-consent";
  var analyticsLoaded = false;

  /* localStorage kann werfen (Privatmodus, blockierte Cookies). In dem
     Fall behandeln wir es wie "noch nicht entschieden" und laden nichts. */
  function readConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* Ohne Speicher fragen wir beim nächsten Aufruf halt erneut. */
    }
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
  }

  /* Global, weil die Seiten-Skripte (CTA- und Conversion-Tracking in
     index.html) darauf zugreifen. Ohne Zustimmung existiert kein gtag,
     dann verfällt das Event stillschweigend. */
  window.trackEvent = function (name, params) {
    if (window.gtag) {
      window.gtag("event", name, params || {});
    }
  };

  function buildBanner() {
    var wrap = document.createElement("div");
    wrap.id = "cookie-banner";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-live", "polite");
    wrap.setAttribute("aria-label", "Hinweis zu Datenschutz und Cookies");
    wrap.style.cssText = [
      "position:fixed",
      "left:1.5rem",
      "right:1.5rem",
      "bottom:1.5rem",
      "z-index:100",
      "max-width:28rem",
      "margin-left:auto",
      "background:rgba(20,32,52,0.92)",
      "backdrop-filter:blur(12px)",
      "-webkit-backdrop-filter:blur(12px)",
      "border:1px solid #2e323d",
      "border-top:1px solid rgba(179,197,255,0.55)",
      "border-radius:1rem",
      "box-shadow:0 20px 45px rgba(0,0,0,0.45)",
      "padding:1.5rem",
      "color:#f0f2f6",
      "font-family:Inter,system-ui,sans-serif",
      "line-height:1.6",
      "opacity:0",
      "transform:translateY(1rem)",
      "transition:opacity .5s ease-out,transform .5s ease-out",
    ].join(";");

    var title = document.createElement("h4");
    title.textContent = "Datenschutz & Cookies";
    title.style.cssText =
      "margin:0 0 .5rem;font-family:Inter,system-ui,sans-serif;font-weight:300;font-size:1.05rem;letter-spacing:-.01em;color:#f0f2f6";

    var text = document.createElement("p");
    text.textContent =
      "Wir nutzen Cookies, um unsere Website zu analysieren und Ihr Erlebnis zu verbessern. " +
      "Mit Ihrer Zustimmung helfen Sie uns, unser Angebot weiter zu optimieren.";
    text.style.cssText =
      "margin:0 0 1rem;font-size:.875rem;color:#a2a8b5";

    var row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:.75rem";

    var accept = document.createElement("button");
    accept.type = "button";
    accept.id = "accept-cookies";
    accept.textContent = "Alle akzeptieren";
    accept.style.cssText =
      "padding:.55rem 1.5rem;border:0;border-radius:.75rem;background:#b3c5ff;color:#0b0d12;" +
      "font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.12em;cursor:pointer";

    var reject = document.createElement("button");
    reject.type = "button";
    reject.id = "reject-cookies";
    reject.textContent = "Ablehnen";
    reject.style.cssText =
      "padding:.55rem 1.5rem;border:1px solid #2e323d;border-radius:.75rem;" +
      "background:transparent;color:#a2a8b5;font-size:.75rem;font-weight:500;" +
      "text-transform:uppercase;letter-spacing:.12em;cursor:pointer";

    row.appendChild(accept);
    row.appendChild(reject);

    var note = document.createElement("p");
    note.style.cssText = "margin:1rem 0 0;font-size:.68rem;color:#767d8c";
    note.innerHTML =
      'Mehr Infos in unserer <a href="/datenschutz.html" style="color:#b3c5ff;text-decoration:underline">Datenschutzerklärung</a>.';

    wrap.appendChild(title);
    wrap.appendChild(text);
    wrap.appendChild(row);
    wrap.appendChild(note);

    function hide() {
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(1rem)";
      window.setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 500);
    }

    accept.addEventListener("click", function () {
      storeConsent("accepted");
      hide();
      loadAnalytics();
      window.trackEvent("consent_given", { type: "all" });
    });

    reject.addEventListener("click", function () {
      storeConsent("rejected");
      hide();
    });

    document.body.appendChild(wrap);

    /* Zwei Frames warten, damit der Übergang auch wirklich animiert. */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        wrap.style.opacity = "1";
        wrap.style.transform = "translateY(0)";
      });
    });
  }

  function init() {
    var consent = readConsent();

    if (consent === "accepted") {
      loadAnalytics();
      return;
    }
    if (consent === "rejected") {
      return;
    }

    window.setTimeout(buildBanner, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
