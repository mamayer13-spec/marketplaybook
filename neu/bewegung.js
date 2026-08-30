/* Bewegung auf der Startseite.

   1. Wort-Einlauf der Hero-Ueberschrift beim Laden.
   2. Kennzahlen, die an der SCROLLPOSITION haengen statt an einem Zeitgeber:
      rueckwaerts scrollen zaehlt sie zurueck, und jede der vier hat eine
      eigene Kurve, damit sie nicht im Gleichschritt laufen.

   3. Ringflug: der Durchflug beim Runterscrollen. Er ist WIEDER hier und
      nicht in Spline: ein Scroll-Event in einer eingebetteten Szene
      reagiert auf Scrollen IM Viewer, nicht auf das der Seite - im
      523px-Panel des Hero wird es nie ausgeloest.

   Beides respektiert prefers-reduced-motion. */
(function () {
  "use strict";
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WEICH = function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); };
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

  /* ================= 2. Ringflug ================= */
  (function () {
    var abschnitt = document.getElementById("flug");
    var cv = document.getElementById("flug-ring");
    if (!abschnitt || !cv) return;
    var ctx = cv.getContext("2d");
    var textEl = abschnitt.querySelector(".flug-text");
    var zeilen = [].slice.call(abschnitt.querySelectorAll("[data-flug]"));

    var F = 900;        // Brennweite
    var R = 520;        // Aussenradius des Rings
    var RI = 0.63;      // Innenradius als Anteil
    var Z_START = 3600; // weit weg
    // Nur knapp hinter die Kamera. Mit -650 war der Ring schon bei 85 % der
    // Scrollstrecke vorbei und das letzte Fuenftel lief ins Leere.
    var Z_ENDE = -150;
    var NAH = 60;       // alles naeher als das wird abgeschnitten
    var SEG = 220;      // Stuetzpunkte je Ring

    var w = 0, h = 0, cx = 0, cy = 0;
    function passe() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2; cy = h / 2;
    }

    function fortschritt() {
      var r = abschnitt.getBoundingClientRect();
      var weg = abschnitt.offsetHeight - window.innerHeight;
      if (weg <= 0) return 0;
      return KLEMM(-r.top / weg, 0, 1);
    }

    // Ein Punkt auf dem geneigten Ring, projiziert. null = hinter der Kamera.
    function pkt(radius, a, z, neig) {
      var s = Math.sin(a), c = Math.cos(a);
      var X = radius * c;
      var Y = radius * s * Math.cos(neig);
      var Z = z + radius * s * Math.sin(neig);
      if (Z < NAH) return null;
      return [cx + F * X / Z, cy - F * Y / Z, Z];
    }

    function bogen(radius, z, neig, dreh) {
      ctx.beginPath();
      var auf = false;
      for (var i = 0; i <= SEG; i++) {
        var p = pkt(radius, (i / SEG) * Math.PI * 2 + dreh, z, neig);
        if (!p) { auf = false; continue; }   // Stift heben, wo der Ring hinter uns ist
        if (!auf) { ctx.moveTo(p[0], p[1]); auf = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    function zeichne(p) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      var z = Z_START + (Z_ENDE - Z_START) * p;
      // Der Ring oeffnet sich beim Naeherkommen: erst fast von der Kante,
      // dann weiter aufgestellt. Sonst sieht man am Ende nur einen Strich.
      var neig = (80 - 34 * WEICH(p)) * Math.PI / 180;
      var dreh = p * 1.15;
      // Ein- und ausblenden, damit der Durchflug nicht abrupt endet.
      var sicht = Math.min(1, p / 0.10) * Math.min(1, (1 - p) / 0.06);
      if (sicht <= 0) return;

      ctx.lineWidth = 1;

      // Feine Teilung am Aussenrand.
      ctx.strokeStyle = "rgba(240,242,246," + (0.16 * sicht).toFixed(3) + ")";
      for (var t = 0; t < 60; t++) {
        var a = (t / 60) * Math.PI * 2 + dreh;
        var p1 = pkt(R * 0.94, a, z, neig), p2 = pkt(R, a, z, neig);
        if (!p1 || !p2) continue;
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }

      // Die vier Marktphasen als laengere Marken.
      ctx.strokeStyle = "rgba(240,242,246," + (0.42 * sicht).toFixed(3) + ")";
      ctx.lineWidth = 1.4;
      for (var q = 0; q < 4; q++) {
        var aq = (q / 4) * Math.PI * 2 + dreh;
        var q1 = pkt(R * 0.70, aq, z, neig), q2 = pkt(R * 1.10, aq, z, neig);
        if (!q1 || !q2) continue;
        ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
      }

      // Die beiden Ringkanten.
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "rgba(240,242,246," + (0.30 * sicht).toFixed(3) + ")";
      bogen(R, z, neig, dreh);
      ctx.strokeStyle = "rgba(240,242,246," + (0.18 * sicht).toFixed(3) + ")";
      bogen(R * RI, z, neig, dreh);

      // Die drei Signalquellen.
      ctx.fillStyle = "rgba(179,197,255," + (0.85 * sicht).toFixed(3) + ")";
      for (var s = 0; s < 3; s++) {
        var as = (s / 3) * Math.PI * 2 + dreh * 0.6;
        var ps = pkt(R, as, z, neig);
        if (!ps) continue;
        var gr = KLEMM(F / ps[2] * 4.5, 1.2, 34);
        ctx.beginPath(); ctx.arc(ps[0], ps[1], gr, 0, Math.PI * 2); ctx.fill();
      }

      // Die Beschriftung laeuft mit dem Durchflug mit: Hut, dann die drei
      // Quellen nacheinander, zuletzt der Schluss. Vorher stand hier nur
      // ein Satz, der die drei Punkte am Ring nicht erklaert hat.
      if (zeilen.length) {
        for (var zi = 0; zi < zeilen.length; zi++) {
          var ab = 0.18 + zi * 0.115;
          var an = KLEMM((p - ab) / 0.1, 0, 1);
          var aus = KLEMM((0.94 - p) / 0.08, 0, 1);
          var f = an * aus;
          zeilen[zi].style.opacity = (f * f * (3 - 2 * f)).toFixed(3);
        }
      }
    }

    passe();
    window.addEventListener("resize", function () { passe(); zeichne(fortschritt()); });

    if (ruhig) { zeichne(0.42); return; }

    // Nur rechnen, solange der Abschnitt zu sehen ist.
    var sichtbar = false, offen = false;
    function rahmen() {
      offen = false;
      if (sichtbar) zeichne(fortschritt());
    }
    function anstossen() {
      if (offen) return;
      offen = true;
      requestAnimationFrame(rahmen);
    }
    new IntersectionObserver(function (e) {
      sichtbar = e[0].isIntersecting;
      if (sichtbar) anstossen();
    }, { threshold: 0 }).observe(abschnitt);
    window.addEventListener("scroll", anstossen, { passive: true });
    zeichne(fortschritt());
  })();

  /* ================= 3. Kennzahlen an der Scrollposition ================= */
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
