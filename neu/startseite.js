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

  /* ================= DATEN (schematisch) ================= */
  var MONATE = [];
  (function () {
    var namen = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    for (var j = 2024; j <= 2026; j++) for (var m = 0; m < 12; m++) {
      if (j === 2026 && m > 7) break;
      MONATE.push(namen[m] + " " + String(j).slice(2));
    }
  })();
  var REIHEN = [
    { key: "mp", name: "Market Playbook", klasse: "haupt",
      werte: [0, 8, 18, 30, 45, 62, 80, 95, 110, 130, 150, 175, 200, 230, 255, 270, 285, 300, 320, 345, 370, 400, 430, 460, 470, 455, 440, 460, 480, 500, 510, 515] },
    { key: "btc", name: "BTC halten", klasse: "neben",
      werte: [0, 10, 25, 40, 35, 20, 10, 5, 0, -5, -2, 8, 15, 22, 18, 10, -8, -15, -10, -6, -2, 4, 8, 3, -4, -10, -14, -12, -9, -8, -7, -6] },
    { key: "alt", name: "Altcoins halten", klasse: "schwach",
      werte: [0, 5, 12, 20, 10, -5, -15, -25, -30, -35, -32, -25, -20, -15, -22, -30, -40, -45, -50, -48, -44, -40, -38, -42, -48, -52, -55, -50, -46, -44, -42, -40] }
  ];
  var BTC = {
    schluss: [94, 97, 102, 105, 107, 104, 99, 96, 92, 88, 84, 80, 78, 82, 86, 90, 95, 99, 103, 106, 108, 110, 109, 112, 115, 118, 116, 119, 121, 124, 126, 123, 118, 112, 105, 98, 90, 84, 78, 72, 68, 66, 63, 65, 67, 64, 66, 68],
    marker: [
      { i: 4, text: "Exit ~107K", oben: true, satz: "Überhitzung in den On-Chain-Daten. Ausstieg, danach Rückgang auf 78K." },
      { i: 13, text: "Einstieg ~82K", oben: false, satz: "Bodenbildung bestätigt, Akkumulation sichtbar. Einstieg, danach Anstieg auf 126K." },
      { i: 33, text: "Exit ~112K", oben: true, satz: "Korrektur nach dem Höchststand als Signal gewertet. Ausstieg, danach Rückgang auf 63K." }
    ]
  };

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
    var QUELLEN = ["On-Chain", "Makro", "Zyklus"];

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

  /* ================= 4. Sparklines ================= */
  [].forEach.call(document.querySelectorAll(".kennzahl[data-spark]"), function (k) {
    var w = k.getAttribute("data-spark").split(",").map(Number);
    var svg = el("svg", { class: "spark", viewBox: "0 0 64 28" }, k);
    var min = Math.min.apply(null, w), max = Math.max.apply(null, w), sp = max - min || 1;
    var pts = w.map(function (v, i) { return { x: i * (64 / (w.length - 1)), y: 26 - (v - min) / sp * 24 }; });
    var p = el("path", { d: weichePfad(pts) }, svg);
    // In einem Block mit data-scroll zeichnet bewegung.js die Linie aus der
    // Scrollposition. Hier nur vorbereiten, sonst wuerde die einmalige
    // Zeitanimation dagegenhalten (fill: forwards schlaegt Inline-Stil).
    if (k.closest(".kennzahlen[data-scroll]")) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = ruhig ? 0 : len;
    } else {
      beobachten(k, function () { zeichnen(p, 1100, 200); }, 0.6);
    }
  });

  /* ================= 5. Vergleichschart ================= */
  (function () {
    var box = document.getElementById("chart-vergleich");
    if (!box) return;
    var W = 900, H = 340, L = 56, Rr = 96, T = 18, B = 34;
    var pw = W - L - Rr, ph = H - T - B;
    var yMin = -100, yMax = 560;
    var n = MONATE.length;
    function X(i) { return L + i * (pw / (n - 1)); }
    function Y(v) { return T + (yMax - v) / (yMax - yMin) * ph; }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H }, box);
    var defs = el("defs", {}, svg);
    var grad = el("linearGradient", { id: "flaeche-verlauf", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", "stop-color": "#b3c5ff", "stop-opacity": 0.16 }, grad);
    el("stop", { offset: "100%", "stop-color": "#b3c5ff", "stop-opacity": 0 }, grad);

    // Raster
    [-100, 0, 100, 200, 300, 400, 500].forEach(function (v) {
      el("line", { class: "achse" + (v === 0 ? " achse-null" : ""), x1: L, x2: W - Rr, y1: Y(v), y2: Y(v) }, svg);
      text(svg, L - 10, Y(v) + 3, (v > 0 ? "+" : "") + v + " %", { "text-anchor": "end" });
    });
    [0, 6, 12, 18, 24, 31].forEach(function (i) { text(svg, X(i), H - 8, MONATE[i], { "text-anchor": i === 31 ? "end" : (i === 0 ? "start" : "middle") }); });

    // Reihen
    var pfade = {}, endwerte = {}, flaeche = null;
    REIHEN.slice().reverse().forEach(function (r) {
      var pts = r.werte.map(function (v, i) { return { x: X(i), y: Y(v) }; });
      var d = weichePfad(pts);
      if (r.klasse === "haupt") {
        flaeche = el("path", { class: "flaeche", d: d + " L " + X(n - 1) + " " + Y(0) + " L " + X(0) + " " + Y(0) + " Z" }, svg);
        flaeche.style.opacity = 0;
      }
      pfade[r.key] = el("path", { class: "kurve " + r.klasse, d: d }, svg);
      var letzte = r.werte[n - 1];
      endwerte[r.key] = text(svg, X(n - 1) + 10, Y(letzte) + 4, (letzte > 0 ? "+" : "") + letzte + " %", { class: "endwert " + r.klasse });
      endwerte[r.key].style.opacity = 0;
    });

    beobachten(box, function () {
      var v = 0;
      ["alt", "btc", "mp"].forEach(function (k) { zeichnen(pfade[k], 1600, v); v += 250; });
      setTimeout(function () {
        if (flaeche) { flaeche.style.transition = "opacity 900ms ease"; flaeche.style.opacity = 0.9; }
        for (var k in endwerte) { endwerte[k].style.transition = "opacity 600ms ease"; endwerte[k].style.opacity = 1; }
      }, ruhig ? 0 : 1500);
    });

    // Legende
    var legende = box.querySelector("[data-legende]");
    REIHEN.forEach(function (r) {
      var b = document.createElement("button");
      b.className = r.klasse; b.type = "button";
      b.innerHTML = "<i></i>" + r.name + ", " + (r.werte[n - 1] > 0 ? "+" : "") + r.werte[n - 1] + " %";
      b.addEventListener("click", function () {
        var aus = b.classList.toggle("aus");
        pfade[r.key].classList.toggle("aus", aus);
        endwerte[r.key].classList.toggle("aus", aus);
        if (r.klasse === "haupt" && flaeche) flaeche.classList.toggle("aus", aus);
      });
      legende.appendChild(b);
    });

    // Fadenkreuz und Tooltip
    var kreuz = el("line", { class: "fadenkreuz", x1: 0, x2: 0, y1: T, y2: T + ph }, svg);
    var punkte = {};
    REIHEN.forEach(function (r) {
      punkte[r.key] = el("circle", { class: "fadenpunkt", r: 3.5, stroke: r.klasse === "haupt" ? "#b3c5ff" : "#a2a8b5" }, svg);
    });
    var tip = document.createElement("div"); tip.className = "tooltip"; box.appendChild(tip);
    var fang = el("rect", { x: L, y: T, width: pw, height: ph, fill: "transparent" }, svg);

    function zeigen(e) {
      var rect = svg.getBoundingClientRect();
      var sx = (e.clientX - rect.left) / rect.width * W;
      var i = Math.round((sx - L) / (pw / (n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      var x = X(i);
      kreuz.setAttribute("x1", x); kreuz.setAttribute("x2", x); kreuz.style.opacity = 0.5;
      var html = '<div class="t-kopf">' + MONATE[i] + "</div>";
      REIHEN.forEach(function (r) {
        var v = r.werte[i], p = punkte[r.key];
        p.setAttribute("cx", x); p.setAttribute("cy", Y(v)); p.style.opacity = pfade[r.key].classList.contains("aus") ? 0 : 1;
        html += '<div class="t-zeile ' + r.klasse + '"><span>' + r.name + "</span><b>" + (v > 0 ? "+" : "") + v + " %</b></div>";
      });
      tip.innerHTML = html;
      var bx = box.getBoundingClientRect();
      var px = rect.left - bx.left + x / W * rect.width;
      var py = rect.top - bx.top + Y(REIHEN[0].werte[i]) / H * rect.height;
      // am rechten Rand nach links kippen
      tip.style.left = Math.min(Math.max(px, 90), bx.width - 90) + "px";
      tip.style.top = py + "px";
      tip.classList.add("an");
    }
    function weg() { kreuz.style.opacity = 0; for (var k in punkte) punkte[k].style.opacity = 0; tip.classList.remove("an"); }
    fang.addEventListener("pointermove", zeigen);
    fang.addEventListener("pointerdown", zeigen);
    fang.addEventListener("pointerleave", weg);
  })();

  /* ================= 6. Kerzenchart ================= */
  (function () {
    var box = document.getElementById("chart-btc");
    if (!box) return;
    /* B ist groesser als beim Vergleichschart: das Label des Einstiegs
       steht unter der Kurve und braucht Luft zur Monatsachse. */
    var W = 900, H = 360, L = 56, Rr = 24, T = 30, B = 52;
    var pw = W - L - Rr, ph = H - T - B;
    var s = BTC.schluss, n = s.length;
    var yMin = 55, yMax = 135;
    var schritt = pw / n, breite = Math.max(5, schritt * 0.55);
    function X(i) { return L + i * schritt + schritt / 2; }
    function Y(v) { return T + (yMax - v) / (yMax - yMin) * ph; }
    var DOCHT = [1.6, 2.4, 1.9, 3.1, 2.2, 1.4, 2.8, 2.0];

    var kerzen = s.map(function (c, i) {
      var o = i === 0 ? 92 : s[i - 1];
      var d = DOCHT[i % DOCHT.length];
      return { o: o, c: c, h: Math.max(o, c) + d, l: Math.min(o, c) - d * 0.8 };
    });
    var MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    function monat(i) { return MON[Math.min(11, Math.floor(i / 4))]; }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H }, box);
    [60, 80, 100, 120].forEach(function (v) {
      el("line", { class: "achse", x1: L, x2: W - Rr, y1: Y(v), y2: Y(v) }, svg);
      text(svg, L - 10, Y(v) + 3, v + "K", { "text-anchor": "end" });
    });
    for (var m = 0; m < 12; m += 2) text(svg, X(m * 4), H - 8, MON[m] + " 25", { "text-anchor": "middle" });

    var gruppen = kerzen.map(function (k, i) {
      var g = el("g", { class: "kerze " + (k.c >= k.o ? "auf" : "ab") }, svg);
      el("line", { class: "kerze-docht", x1: X(i), x2: X(i), y1: Y(k.h), y2: Y(k.l) }, g);
      var top = Y(Math.max(k.o, k.c)), hh = Math.max(1.5, Math.abs(Y(k.o) - Y(k.c)));
      el("rect", { class: "kerze-koerper", x: X(i) - breite / 2, y: top, width: breite, height: hh, rx: 1 }, g);
      return g;
    });

    // Marker mit Fuehrungslinie
    var markerEls = BTC.marker.map(function (mk, idx) {
      var i = mk.i, k = kerzen[i], x = X(i), y = Y(k.c);
      var yText = mk.oben ? T - 8 : T + ph + 2;
      var g = el("g", { class: "marke" }, svg);
      var linie = el("line", { class: "marke-linie", x1: x, x2: x, y1: y, y2: mk.oben ? T + 6 : T + ph - 6 }, g);
      var hofEl = el("circle", { class: "marke-hof", cx: x, cy: y, r: 6 }, g);
      var p = el("circle", { class: "marke-punkt", cx: x, cy: y, r: 4.5, "data-i": idx }, g);
      var anker = x > W - 120 ? "end" : (x < L + 80 ? "start" : "middle");
      var t = text(svg, x, yText + (mk.oben ? 0 : 12), mk.text, { class: "marke-text", "text-anchor": anker });
      g.style.opacity = 0; t.style.opacity = 0;
      return { g: g, t: t, p: p, hof: hofEl, x: x, y: y, mk: mk };
    });

    beobachten(box, function () {
      gruppen.forEach(function (g, i) { setTimeout(function () { g.classList.add("da"); }, ruhig ? 0 : i * 26); });
      markerEls.forEach(function (m, k) {
        setTimeout(function () {
          m.g.style.transition = m.t.style.transition = "opacity 500ms ease";
          m.g.style.opacity = 1; m.t.style.opacity = 1;
          if (!ruhig) m.hof.animate([{ r: 6, opacity: 0.7 }, { r: 26, opacity: 0 }], { duration: 1100, easing: "cubic-bezier(0.16,1,0.3,1)" });
        }, ruhig ? 0 : 400 + m.mk.i * 26);
      });
    }, 0.3);

    // Marker <-> Liste
    var liste = document.querySelectorAll("#entscheidungen li[data-marker]");
    var tip = document.createElement("div"); tip.className = "tooltip"; box.appendChild(tip);
    var bx;
    function tipAn(px, py, html) {
      bx = box.getBoundingClientRect();
      tip.innerHTML = html;
      tip.style.left = Math.min(Math.max(px, 90), bx.width - 90) + "px";
      tip.style.top = py + "px";
      tip.classList.add("an");
    }
    function svgZuPx(x, y) {
      var r = svg.getBoundingClientRect(), b = box.getBoundingClientRect();
      return { x: r.left - b.left + x / W * r.width, y: r.top - b.top + y / H * r.height };
    }
    function markerAktiv(idx, an) {
      markerEls.forEach(function (m, k) { m.p.classList.toggle("aktiv", an && k === idx); m.p.setAttribute("r", an && k === idx ? 6 : 4.5); });
      [].forEach.call(liste, function (li, k) { li.classList.toggle("aktiv", an && k === idx); });
      if (an) {
        var m = markerEls[idx], pt = svgZuPx(m.x, m.y);
        tipAn(pt.x, pt.y, '<div class="t-kopf">' + monat(m.mk.i) + " 2025 · " + m.mk.text + '</div><div class="t-satz">' + m.mk.satz + "</div>");
        if (!ruhig) m.hof.animate([{ r: 6, opacity: 0.7 }, { r: 22, opacity: 0 }], { duration: 900, easing: "ease-out" });
      } else tip.classList.remove("an");
    }
    markerEls.forEach(function (m, idx) {
      m.p.addEventListener("pointerenter", function () { markerAktiv(idx, true); });
      m.p.addEventListener("pointerleave", function () { markerAktiv(idx, false); });
    });
    [].forEach.call(liste, function (li, idx) {
      li.addEventListener("mouseenter", function () { markerAktiv(idx, true); });
      li.addEventListener("mouseleave", function () { markerAktiv(idx, false); });
    });

    // Fadenkreuz ueber den Kerzen
    var kreuz = el("line", { class: "fadenkreuz", x1: 0, x2: 0, y1: T, y2: T + ph }, svg);
    var fang = el("rect", { x: L, y: T, width: pw, height: ph, fill: "transparent" }, svg);
    var aktiveKerze = -1;
    fang.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect();
      var sx = (e.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(n - 1, Math.floor((sx - L) / schritt)));
      if (i !== aktiveKerze) { if (aktiveKerze >= 0) gruppen[aktiveKerze].classList.remove("aktiv"); gruppen[i].classList.add("aktiv"); aktiveKerze = i; }
      var k = kerzen[i], x = X(i);
      kreuz.setAttribute("x1", x); kreuz.setAttribute("x2", x); kreuz.style.opacity = 0.5;
      var pt = svgZuPx(x, Y(k.h));
      tipAn(pt.x, pt.y,
        '<div class="t-kopf">Woche ' + (i + 1) + " · " + monat(i) + " 2025</div>" +
        '<div class="t-zeile"><span>Eröffnung</span><b>' + k.o + "K</b></div>" +
        '<div class="t-zeile"><span>Hoch</span><b>' + k.h.toFixed(1) + "K</b></div>" +
        '<div class="t-zeile"><span>Tief</span><b>' + k.l.toFixed(1) + "K</b></div>" +
        '<div class="t-zeile haupt"><span>Schluss</span><b>' + k.c + "K</b></div>");
    });
    fang.addEventListener("pointerleave", function () {
      kreuz.style.opacity = 0; tip.classList.remove("an");
      if (aktiveKerze >= 0) gruppen[aktiveKerze].classList.remove("aktiv"); aktiveKerze = -1;
    });
    // Marker liegen ueber dem Fangrechteck, damit sie klickbar bleiben
    markerEls.forEach(function (m) { svg.appendChild(m.g); svg.appendChild(m.t); });
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
