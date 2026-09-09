/*
 * Startseite: Hero-Ring, Vergleichschart, Kerzenchart, Sparklines,
 * Zeitleiste, Kopfleiste, Mausleuchten. Keine Bibliothek, alles SVG.
 *
 * DATEN: Die Reihen unten sind SCHEMATISCH. Sie treffen die belegten
 * Endstaende (+515 %, -6 %, -40 %) und die Zeitpunkte der drei
 * Entscheidungen, nicht die Werte dazwischen. Echte Monats- oder
 * Wochenwerte: nur die Arrays tauschen, der Rest rechnet sich um.
 */
(function () {
  "use strict";

  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, inhalt, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = inhalt;
    return t;
  }
  function beobachten(ziel, cb, schwelle) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var w = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { w.unobserve(e.target); cb(); } });
    }, { threshold: schwelle || 0.35 });
    w.observe(ziel);
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* Catmull-Rom zu Bezier: weiche Kurve durch alle Punkte, ohne Ueberschwingen
     an den Enden. */
  function weichePfad(p) {
    if (p.length < 2) return "";
    var d = "M " + p[0].x + " " + p[0].y;
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + ", " + c2x.toFixed(1) + " " + c2y.toFixed(1) + ", " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
    }
    return d;
  }
  function zeichnen(pfad, dauer, verzoegerung) {
    var len = pfad.getTotalLength();
    pfad.style.strokeDasharray = len;
    if (ruhig) { pfad.style.strokeDashoffset = 0; return; }
    pfad.style.strokeDashoffset = len;
    pfad.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: dauer, delay: verzoegerung || 0, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" });
  }

  /* ================= 1. Kopfleiste ================= */
  (function () {
    var kopf = document.getElementById("kopf");
    if (!kopf) return;
    var letzte = scrollY, laeuft = false;
    addEventListener("scroll", function () {
      if (laeuft) return;
      laeuft = true;
      requestAnimationFrame(function () {
        laeuft = false;
        var y = scrollY;
        if (y > letzte + 4 && y > 160) kopf.classList.add("weg");
        else if (y < letzte - 4) kopf.classList.remove("weg");
        letzte = y;
      });
    }, { passive: true });
  })();

  /* ================= 2. Mausleuchten ================= */
  (function () {
    var m = document.querySelector(".maus");
    if (!m || ruhig || !matchMedia("(pointer: fine)").matches) return;
    var zx = innerWidth / 2, zy = innerHeight / 3, x = zx, y = zy, aktiv = false;
    addEventListener("pointermove", function (e) { zx = e.clientX; zy = e.clientY; if (!aktiv) { aktiv = true; requestAnimationFrame(schritt); } }, { passive: true });
    function schritt() {
      x += (zx - x) * 0.12; y += (zy - y) * 0.12;
      m.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      if (Math.abs(zx - x) > 0.5 || Math.abs(zy - y) > 0.5) requestAnimationFrame(schritt); else aktiv = false;
    }
  })();

  /* ================= 3. Ring ================= */
  (function () {
    var box = document.getElementById("ring");
    if (!box) return;
    var G = 480, c = 240, R = 190, rArc = 168, rKnoten = 100;
    var svg = el("svg", { viewBox: "0 0 " + G + " " + G }, box);
    var PHASEN = ["Akkumulation", "Expansion", "Überhitzung", "Korrektur"];
    var QUELLEN = ["Bilanz", "Makro", "Zyklus"];

    function punkt(r, grad) {
      var a = (grad - 90) * Math.PI / 180;
      return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
    }
    function bogen(r, von, bis) {
      var p1 = punkt(r, von), p2 = punkt(r, bis);
      var gross = bis - von > 180 ? 1 : 0;
      return "M " + p1.x.toFixed(2) + " " + p1.y.toFixed(2) + " A " + r + " " + r + " 0 " + gross + " 1 " + p2.x.toFixed(2) + " " + p2.y.toFixed(2);
    }

    // Aussenkreis
    var kreis = el("circle", { class: "kreis", cx: c, cy: c, r: R }, svg);
    zeichnen(kreis, 1600, 100);

    // Ticks
    var ticks = [];
    for (var i = 0; i < 72; i++) {
      var g = i * 5, gross = i % 18 === 0, l = gross ? 14 : 6;
      var a = punkt(R, g), b = punkt(R - l, g);
      var t = el("line", { class: "tick" + (gross ? " gross" : ""), x1: a.x, y1: a.y, x2: b.x, y2: b.y }, svg);
      ticks.push(t);
    }
    ticks.forEach(function (t, i) {
      if (ruhig) { t.style.opacity = 1; return; }
      t.style.transition = "opacity 400ms ease";
      setTimeout(function () { t.style.opacity = 1; }, 300 + i * 14);
    });

    // Phasenboegen und Labels
    var arcs = [], labels = [];
    PHASEN.forEach(function (name, k) {
      var von = k * 90 + 4, bis = (k + 1) * 90 - 4;
      var p = el("path", { class: "phase", d: bogen(rArc, von, bis) }, svg);
      zeichnen(p, 1000, 900 + k * 180);
      arcs.push(p);
      var lp = punkt(212, k * 90 + 45);
      var anker = k === 0 || k === 1 ? "start" : "end";
      if (k === 1) anker = "start";
      // Quadrant: rechts oben / rechts unten / links unten / links oben
      var tx = el("text", { class: "phasen-label", x: lp.x, y: lp.y + 3, "text-anchor": (k < 2 ? "start" : "end") }, svg);
      tx.textContent = name;
      labels.push(tx);
    });

    // Speichen, Knoten, Labels der Signalquellen
    var knoten = [], pulse = [];
    QUELLEN.forEach(function (name, k) {
      var g = k * 120, p = punkt(rKnoten, g);
      var sp = el("line", { class: "speiche", x1: c, y1: c, x2: p.x, y2: p.y }, svg);
      zeichnen(sp, 700, 1500 + k * 150);
      var pu = el("circle", { class: "knoten-puls", cx: p.x, cy: p.y, r: 5 }, svg);
      var kn = el("circle", { class: "knoten", cx: p.x, cy: p.y, r: 4 }, svg);
      kn.style.opacity = ruhig ? 1 : 0;
      if (!ruhig) { kn.style.transition = "opacity 400ms ease"; setTimeout(function () { kn.style.opacity = 1; }, 1900 + k * 150); }
      var lpos = punkt(rKnoten + 22, g);
      var anker = g === 0 ? "middle" : (g < 180 ? "start" : "end");
      var lt = el("text", { class: "knoten-label", x: lpos.x, y: lpos.y + (g === 0 ? -2 : 4), "text-anchor": anker }, svg);
      lt.textContent = name;
      knoten.push(kn); pulse.push(pu);
    });

    // Mitte
    var eyebrow = text(svg, c, c - 10, "Marktphase", { class: "mitte-eyebrow", "text-anchor": "middle" });
    var wert = text(svg, c, c + 16, PHASEN[0], { class: "mitte-wert", "text-anchor": "middle" });

    // Spur und Marker
    var spur = el("path", { class: "spur", d: "" }, svg);
    var hof = el("circle", { class: "marker-hof", cx: 0, cy: 0, r: 14 }, svg);
    var marker = el("circle", { class: "marker", cx: 0, cy: 0, r: 4.5 }, svg);
    [spur, hof, marker].forEach(function (e) { e.style.opacity = 0; e.style.transition = "opacity 500ms ease"; });

    var aktivePhase = -1;
    function stellen(grad) {
      var p = punkt(rArc, grad);
      marker.setAttribute("cx", p.x); marker.setAttribute("cy", p.y);
      hof.setAttribute("cx", p.x); hof.setAttribute("cy", p.y);
      var von = grad - 38; if (von < 0) von += 360;
      spur.setAttribute("d", von < grad ? bogen(rArc, von, grad) : bogen(rArc, von, grad + 360));
      var phase = Math.floor((grad % 360) / 90);
      if (phase !== aktivePhase) {
        aktivePhase = phase;
        arcs.forEach(function (a, k) { a.classList.toggle("aktiv", k === phase); });
        labels.forEach(function (l, k) { l.classList.toggle("aktiv", k === phase); });
        wert.textContent = PHASEN[phase];
      }
    }

    if (ruhig) { stellen(45); [spur, hof, marker].forEach(function (e) { e.style.opacity = 1; }); return; }

    var start = null, sichtbar = true, letztePulse = -1;
    function schritt(zeit) {
      if (start === null) start = zeit;
      var t = zeit - start;
      stellen((t / 42000 * 360) % 360);
      // Knoten pulsen nacheinander, alle 2,4 s einer
      var n = Math.floor(t / 2400) % 3, phase = (t % 2400) / 2400;
      if (n !== letztePulse) { letztePulse = n; knoten.forEach(function (k, i) { k.classList.toggle("an", i === n); }); }
      pulse.forEach(function (p, i) {
        if (i !== n) { p.style.opacity = 0; return; }
        var f = Math.min(1, phase / 0.55);
        p.setAttribute("r", 5 + 18 * ease(f));
        p.style.opacity = (0.6 * (1 - f)).toFixed(3);
      });
      if (sichtbar && !document.hidden) requestAnimationFrame(schritt);
    }
    setTimeout(function () {
      [spur, hof, marker].forEach(function (e) { e.style.opacity = 1; });
      requestAnimationFrame(schritt);
    }, 2200);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var war = sichtbar; sichtbar = e.isIntersecting;
          if (sichtbar && !war) { start = null; requestAnimationFrame(schritt); }
        });
      }).observe(box);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden && sichtbar) { start = null; requestAnimationFrame(schritt); } });
  })();

  /* ================= 3b. Spline-Szene ================= *
   * Laedt die Szene erst, wenn der Hero im Bild ist, und nur dann,
   * wenn eine URL eingetragen ist. Schlaegt etwas fehl, bleibt der
   * gezeichnete Ring stehen — er ist der Normalfall, nicht der
   * Notnagel.
   */
  (function () {
    var box = document.getElementById("hero-grafik");
    if (!box) return;
    var url = (box.getAttribute("data-spline") || "").trim();
    if (!url) return;
    if (ruhig) return;                       // Bewegung abbestellt: Ring bleibt

    // WebGL vorhanden? Sonst gar nicht erst laden.
    try {
      var pruef = document.createElement("canvas");
      if (!(pruef.getContext("webgl2") || pruef.getContext("webgl"))) return;
    } catch (e) { return; }

    var gestartet = false;
    function laden() {
      if (gestartet) return;
      gestartet = true;
      var s = document.createElement("script");
      s.type = "module";
      // Spline empfiehlt inzwischen das eigene CDN; unpkg 1.9.28 war veraltet.
      s.src = "https://cdn.spline.design/@splinetool/viewer@2.0.9/build/spline-viewer.js";
      s.onerror = function () { box.classList.remove("spline-da"); };
      document.head.appendChild(s);

      var viewer = document.createElement("spline-viewer");
      viewer.setAttribute("url", url);
      viewer.setAttribute("loading-anim-type", "none");
      // Nicht auf das load-Ereignis allein verlassen: die Erkennung stammt
      // aus Viewer 1.9.28, wir laden 2.0.9. Feuert es dort nicht mehr unter
      // diesem Namen, flog die Szene raus, obwohl sie laeuft. Deshalb wird
      // zusaetzlich geprueft, ob der Viewer wirklich ein Canvas gerendert hat.
      viewer.addEventListener("load", function () { box.classList.add("spline-da"); });
      var versuche = 0;
      var puls = setInterval(function () {
        versuche++;
        var gemalt = viewer.shadowRoot && viewer.shadowRoot.querySelector("canvas");
        if (gemalt) { box.classList.add("spline-da"); clearInterval(puls); return; }
        if (versuche > 40) {                 // 40 x 300 ms = 12 s
          clearInterval(puls);
          if (!box.classList.contains("spline-da")) viewer.remove();
        }
      }, 300);
      box.appendChild(viewer);
    }

    if ("IntersectionObserver" in window) {
      var w = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { w.disconnect(); laden(); } });
      }, { rootMargin: "200px" });
      w.observe(box);
    } else laden();
  })();

  /* ================= 7. Zeitleiste ================= */
  (function () {
    var liste = document.getElementById("zeitleiste");
    if (!liste) return;
    var strich = liste.querySelector(".strich"), punkte = liste.querySelectorAll("li");
    if (ruhig) { strich.style.setProperty("--fortschritt", 1); [].forEach.call(punkte, function (li) { li.classList.add("an"); }); return; }
    var laeuft = false;
    function stellen() {
      laeuft = false;
      var r = liste.getBoundingClientRect();
      var ziel = innerHeight * 0.62;
      var f = Math.max(0, Math.min(1, (ziel - r.top) / r.height));
      strich.style.setProperty("--fortschritt", f.toFixed(3));
      // Nach Fortschritt schalten, nicht nach Y-Position: quer liegen alle
      // drei auf derselben Hoehe und wuerden gleichzeitig aufleuchten.
      [].forEach.call(punkte, function (li, i) {
        li.classList.toggle("an", f > (i + 0.15) / punkte.length);
      });
    }
    addEventListener("scroll", function () { if (!laeuft) { laeuft = true; requestAnimationFrame(stellen); } }, { passive: true });
    addEventListener("resize", stellen, { passive: true });
    stellen();
  })();
})();

/* ============================================================
   Stimmen — Reiterwechsel.

   Bauform von mercury.com. Reine Tastatur- und Klicksteuerung, kein
   Automatiklauf: ein Karussell, das von selbst weiterspringt, nimmt
   dem Leser die Nachricht weg, die er gerade liest.

   Pfeiltasten wandern durch die Reiter, Pos1/Ende springen an den Rand
   — so verlangt es das Tab-Muster, und ohne das ist die Leiste mit der
   Tastatur eine Sackgasse.
   ============================================================ */
(function () {
  "use strict";

  var block = document.querySelector(".stimmen-block");
  if (!block) return;

  var reiter = [].slice.call(block.querySelectorAll('[role="tab"]'));
  if (!reiter.length) return;

  function zeigen(i, fokus) {
    reiter.forEach(function (r, j) {
      var an = j === i;
      r.setAttribute("aria-selected", an ? "true" : "false");
      r.tabIndex = an ? 0 : -1;
      var feld = document.getElementById(r.getAttribute("aria-controls"));
      if (!feld) return;
      feld.hidden = !an;
      /* Das Einblenden gehoert zum Wechsel, nicht zum Laden - siehe die
         Notiz zu .stimme.wechsel in startseite.css. */
      feld.classList.remove("wechsel");
      if (an) { void feld.offsetWidth; feld.classList.add("wechsel"); }
    });
    if (fokus) reiter[i].focus();
    /* Bei schmalem Schirm liegt der gewaehlte Reiter sonst ausserhalb
       der Leiste, wenn man mit der Tastatur wandert. */
    if (reiter[i].scrollIntoView) {
      reiter[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  reiter.forEach(function (r, i) {
    r.addEventListener("click", function () { zeigen(i, false); });
    r.addEventListener("keydown", function (e) {
      var ziel = null;
      if (e.key === "ArrowRight") ziel = (i + 1) % reiter.length;
      else if (e.key === "ArrowLeft") ziel = (i - 1 + reiter.length) % reiter.length;
      else if (e.key === "Home") ziel = 0;
      else if (e.key === "End") ziel = reiter.length - 1;
      if (ziel === null) return;
      e.preventDefault();
      zeigen(ziel, true);
    });
  });
})();
