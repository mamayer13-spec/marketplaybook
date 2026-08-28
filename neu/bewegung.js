/* Bewegung auf der Startseite.

   1. Wort-Einlauf der Hero-Ueberschrift beim Laden.
   2. Kennzahlen, die an der SCROLLPOSITION haengen statt an einem Zeitgeber:
      rueckwaerts scrollen zaehlt sie zurueck, und jede der vier hat eine
      eigene Kurve, damit sie nicht im Gleichschritt laufen.

   Der frueher hier gebaute Ringflug ist entfallen - der Durchflug kommt
   jetzt aus der Spline-Szene im Hero, zwei waeren doppelt gemoppelt.

   Beides respektiert prefers-reduced-motion. */
(function () {
  "use strict";
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KLEMM = function (x, a, b) { return x < a ? a : x > b ? b : x; };

  /* ================= 1. Auftritt des Hero ================= */
  (function () {
    var h1 = document.querySelector(".hero-text h1");
    if (!h1 || ruhig) return;

    // Nur TEXTKNOTEN zerlegen. <em> und <br> muessen stehen bleiben, sonst
    // verliert "Struktur" seine Akzentfarbe und der Umbruch geht verloren.
    var knoten = [];
    (function sammle(k) {
      for (var i = 0; i < k.childNodes.length; i++) {
        var n = k.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.trim()) knoten.push(n);
        else if (n.nodeType === 1 && n.tagName !== "BR") sammle(n);
      }
    })(h1);

    knoten.forEach(function (n) {
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
        var aussen = document.createElement("span");
        aussen.className = "wort";
        var innen = document.createElement("span");
        innen.className = "wort-i";
        innen.textContent = t;
        aussen.appendChild(innen);
        frag.appendChild(aussen);
      });
      n.parentNode.replaceChild(frag, n);
    });

    var woerter = [].slice.call(h1.querySelectorAll(".wort-i"));
    if (!woerter.length) return;
    h1.classList.add("wort-bereit");

    // UNGLEICHE Abstaende. Ein fester Versatz je Wort tickt wie ein Metronom -
    // daran erkennt man eine Vorlage. Die Folge bleibt monoton steigend,
    // wirkt aber von Hand gesetzt.
    var takt = [], t = 0;
    woerter.forEach(function (w, i) {
      takt.push(t);
      t += 46 + (i % 3) * 21 + (i % 5 === 4 ? 40 : 0);
      w.style.transitionDelay = takt[i] + "ms";
    });

    // Das Akzentwort faerbt sich erst ein, NACHDEM es gelandet ist. Ein
    // Detail, das nur an dieser einen Stelle vorkommt.
    var em = h1.querySelector("em");
    if (em) {
      var innenEm = em.querySelector(".wort-i");
      var idx = innenEm ? woerter.indexOf(innenEm) : -1;
      em.classList.add("akzent-spaet");
      if (idx >= 0) em.style.transitionDelay = (takt[idx] + 640) + "ms";
    }

    // Absatz und Knoepfe folgen, jeder mit eigenem Abstand.
    var ende = takt[takt.length - 1];
    var nach = [];
    var absatz = document.querySelector(".hero-text > p");
    if (absatz) { absatz.classList.add("nach-h1"); absatz.style.transitionDelay = (ende + 200) + "ms"; nach.push(absatz); }
    [].forEach.call(document.querySelectorAll(".hero-knoepfe .knopf"), function (b, i) {
      b.classList.add("nach-h1");
      b.style.transitionDelay = (ende + 360 + i * 140) + "ms";
      nach.push(b);
    });

    // Die Grafik daneben kommt parallel dazu, nicht danach.
    var cv = document.getElementById("hero-chart");
    if (cv) cv.classList.add("grafik-auftritt");

    // Zwei Frames warten, sonst setzt der Browser Start- und Zielzustand in
    // denselben Stilrechenlauf und es gibt gar keinen Uebergang.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        h1.classList.add("wort-ein");
        if (em) em.classList.add("ein");
        nach.forEach(function (e) { e.classList.add("da"); });
        if (cv) cv.classList.add("da");
      });
    });
  })();

  /* ================= 2. Kennzahlen an der Scrollposition ================= */
  (function () {
    var block = document.querySelector(".kennzahlen[data-scroll]");
    if (!block) return;

    // Vier verschiedene Kurven und vier ungleiche Startpunkte. Liefen alle
    // Zahlen mit derselben Kurve und demselben Versatz hoch, saehe es aus
    // wie eine Schleife - das ist der eigentliche Vorlagen-Look.
    function kurve(n, t) {
      if (n === 0) return 1 - Math.pow(1 - t, 3);
      if (n === 1) return t * t * (3 - 2 * t);
      if (n === 2) return 1 - Math.pow(1 - t, 2.1);
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    var AB = [0, 0.09, 0.19, 0.28];
    var SPANNE = [0.60, 0.56, 0.64, 0.52];

    var posten = [].slice.call(block.querySelectorAll(".kennzahl")).map(function (k, i) {
      var wEl = k.querySelector(".wert");
      var ziel = wEl ? wEl.textContent.trim() : "";
      var m = ziel.match(/-?[0-9]+([.,][0-9]+)?/);
      var pfad = k.querySelector(".spark path");
      return {
        el: wEl, ziel: ziel,
        zahl: m ? parseFloat(m[0].replace(",", ".")) : null,
        vorn: m ? ziel.slice(0, m.index) : "",
        hinten: m ? ziel.slice(m.index + m[0].length) : "",
        pfad: pfad, laenge: pfad ? pfad.getTotalLength() : 0,
        ab: AB[i % 4], spanne: SPANNE[i % 4], k: i % 4
      };
    });
    if (!posten.length) return;

    if (ruhig) {
      posten.forEach(function (o) {
        if (o.el) o.el.textContent = o.ziel;
        if (o.pfad) o.pfad.style.strokeDashoffset = 0;
      });
      return;
    }

    function fortschritt() {
      var r = block.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0, wenn die Oberkante bei 88 % der Fensterhoehe steht, 1 bei 38 %.
      return KLEMM((vh * 0.88 - r.top) / (vh * 0.50), 0, 1);
    }

    var letzte = -1;
    function male() {
      var p = fortschritt();
      if (Math.abs(p - letzte) < 0.0015) return;
      letzte = p;
      posten.forEach(function (o) {
        var t = KLEMM((p - o.ab) / o.spanne, 0, 1);
        var e = kurve(o.k, t);
        if (o.el && o.zahl !== null) {
          o.el.textContent = t >= 1 ? o.ziel : o.vorn + Math.round(o.zahl * e) + o.hinten;
        }
        if (o.pfad) o.pfad.style.strokeDashoffset = (o.laenge * (1 - e)).toFixed(2);
      });
    }

    var offen = false;
    function anstossen() {
      if (offen) return;
      offen = true;
      requestAnimationFrame(function () { offen = false; male(); });
    }
    window.addEventListener("scroll", anstossen, { passive: true });
    window.addEventListener("resize", anstossen, { passive: true });
    male();
  })();
})();
