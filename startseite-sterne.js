/* Sternen-Stationen fuer den Mobbin-Entwurf.

   Alle vier haengen an der Scrollposition, nicht an einer Uhr -
   zurueckscrollen spielt sie rueckwaerts. Gleiche Bauart wie auf der
   alten Startseite (bewegung.js, stationen.js), selbst gerechnete
   Perspektive, keine Bibliothek.

   1. Ringflug   - drei Quellen am Ring, fliegen zu einem Licht zusammen (#st-flug)
   2. Sieb       - Punkte fallen durch vier Kriterien-Schichten (#st-sieb)
   3. Sternbild  - vier Sterne verbinden sich zum Ablauf (#st-bild)
   4. Sternflug  - Flug durch den Himmel, am Ende der Satz (#st-warp)
*/
(function () {
  "use strict";
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function wuerfel(s) {
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function klemm(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function weich(v) { v = klemm(v); return v * v * (3 - 2 * v); }
  function fortschritt(abschnitt) {
    var r = abschnitt.getBoundingClientRect();
    var weg = abschnitt.offsetHeight - innerHeight;
    if (weg <= 0) return 0.5;
    return klemm(-r.top / weg);
  }

  /* Gemeinsames Geruest: Leinwand an die Groesse anpassen, nur zeichnen,
     solange der Abschnitt zu sehen ist, und nur einmal pro Frame. */
  function station(id, bau) {
    var abschnitt = document.getElementById(id);
    if (!abschnitt) return;
    var cv = abschnitt.querySelector("canvas");
    var ctx = cv.getContext("2d");
    var g = { w: 0, h: 0, ctx: ctx, abschnitt: abschnitt };
    var zeichne = bau(g);
    (window.__sterne = window.__sterne || {})[id] = function (p) { zeichne(p); };  /* fuer Messungen */
    function passe() {
      var dpr = Math.min(devicePixelRatio || 1, 1.5);
      var r = cv.getBoundingClientRect();
      g.w = r.width; g.h = r.height;
      if (!g.w || !g.h) return;
      cv.width = Math.round(g.w * dpr); cv.height = Math.round(g.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (g.neu) g.neu();
    }
    passe();
    if (ruhig) { zeichne(g.ruhe != null ? g.ruhe : 1); addEventListener("resize", function () { passe(); zeichne(g.ruhe != null ? g.ruhe : 1); }); return; }
    /* Nachlauf: die Animation folgt der Scrollposition gedaempft statt
       ruckartig. Ein Mausrad springt in Stufen von ~100 px - ohne Daempfung
       springt das Bild mit. So gleitet es jeder Stufe hinterher. */
    var offen = false, sichtbar = true, jetzt = fortschritt(abschnitt);
    function rahmen() {
      offen = false;
      if (!sichtbar) return;
      var ziel = fortschritt(abschnitt), d = ziel - jetzt;
      jetzt = Math.abs(d) < 0.0004 ? ziel : jetzt + d * 0.12;
      zeichne(jetzt);
      if (jetzt !== ziel) anstossen();
    }
    function anstossen() { if (!offen) { offen = true; requestAnimationFrame(rahmen); } }
    new IntersectionObserver(function (e) {
      var war = sichtbar;
      sichtbar = e[0].isIntersecting;
      /* Wer von weit her springt (Anker, Tastatur), soll nicht die ganze
         Strecke nachgespielt bekommen. */
      if (sichtbar && !war) jetzt = fortschritt(abschnitt);
      if (sichtbar) anstossen();
    }, { rootMargin: "120px" }).observe(abschnitt);
    addEventListener("scroll", anstossen, { passive: true });
    addEventListener("resize", function () { passe(); zeichne(jetzt); });
    zeichne(jetzt);
  }

  /* Text erscheint wie im Sternenflug: aus der Unschaerfe, leicht von unten. */
  function auftritt(el, f) {
    el.style.opacity = f.toFixed(3);
    el.style.transform = "translateY(" + ((1 - f) * 12).toFixed(1) + "px)";
    /* Keine CSS-Unschaerfe: pro Frame neu berechnet liess sie den Rechner haken (Manuel 23.9.) */
  }

  /* Abgerundetes Rechteck als Pfad - ctx.roundRect fehlt in aelteren Safaris */
  function rund(ctx, x, y, b, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + b - r, y); ctx.arcTo(x + b, y, x + b, y + r, r);
    ctx.lineTo(x + b, y + h - r); ctx.arcTo(x + b, y + h, x + b - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function licht(ctx, x, y, r, alpha) {
    var h = ctx.createRadialGradient(x, y, 0, x, y, r);
    h.addColorStop(0, "rgba(179,197,255," + alpha.toFixed(3) + ")");
    h.addColorStop(1, "rgba(179,197,255,0)");
    ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  /* ================= 1. Ringflug =================
     Umbau 24.9. (Manuel: Punkte ohne Bezug zu den Woertern, am Anfang
     passiert zu lange nichts): Der Ring steht von Anfang an gross im Bild.
     Jede Quelle ist ein Lichtpunkt mit ihrem eigenen Wort. Dann fliegen
     die drei Punkte in die Mitte, werden ein Licht, und das zieht sich zu
     einer Lichtkante auseinander - darunter kommt das Fenster
     "Alles an einem Ort." */
  station("st-flug", function (g) {
    var ctx = g.ctx;
    var hut = g.abschnitt.querySelector("[data-flug-hut]");
    var marken = [].slice.call(g.abschnitt.querySelectorAll("[data-flug-marke]"));
    var schluss = g.abschnitt.querySelector("[data-flug-schluss]");
    var F = 900, R = 520, RI = 0.66, NAH = 60, SEG = 150;
    /* hinten oben, vorne links, vorne rechts */
    var WINKEL = [Math.PI / 2, Math.PI / 2 + 2.3, Math.PI / 2 - 2.3];
    var rnd = wuerfel(20260923), STAUB = [], mass = [];
    for (var i = 0; i < 260; i++) STAUB.push({ x: rnd(), y: rnd(), g: 0.35 + rnd() * 0.9, t: rnd() * 6.28 });
    g.ruhe = 0.46;
    function pkt(radius, a, z, neig) {
      var s = Math.sin(a), c = Math.cos(a);
      var X = radius * c, Y = radius * s * Math.cos(neig), Z = z + radius * s * Math.sin(neig);
      if (Z < NAH) return null;
      var k = F / Z * g.sk;
      return [g.w / 2 + X * k, g.h / 2 - Y * k, Z];
    }
    g.neu = function () {
      /* schmaler als 900: vorne rechts lag der dritte Punkt am Handy am Rand */
      g.sk = Math.min(1, g.w / 1050);
      mass = marken.map(function (m) { return [m.offsetWidth, m.offsetHeight]; });
    };
    g.neu();
    function kante(radius, z, neig, dreh, alpha, breite, glanz) {
      ctx.beginPath();
      var auf = false;
      for (var i = 0; i <= SEG; i++) {
        var p = pkt(radius, (i / SEG) * Math.PI * 2 + dreh, z, neig);
        if (!p) { auf = false; continue; }
        if (!auf) { ctx.moveTo(p[0], p[1]); auf = true; } else ctx.lineTo(p[0], p[1]);
      }
      if (glanz) { ctx.lineWidth = breite * 5; ctx.strokeStyle = "rgba(140,165,255," + (alpha * 0.18).toFixed(3) + ")"; ctx.stroke(); }
      ctx.lineWidth = breite; ctx.strokeStyle = "rgba(203,214,255," + alpha.toFixed(3) + ")"; ctx.stroke();
    }
    function band(z, neig, dreh, alpha) {
      ctx.beginPath();
      var auf = false, i, p;
      for (i = 0; i <= SEG; i++) { p = pkt(R, (i / SEG) * Math.PI * 2 + dreh, z, neig); if (!p) { return; } if (!auf) { ctx.moveTo(p[0], p[1]); auf = true; } else ctx.lineTo(p[0], p[1]); }
      for (i = SEG; i >= 0; i--) { p = pkt(R * RI, (i / SEG) * Math.PI * 2 + dreh, z, neig); if (!p) return; ctx.lineTo(p[0], p[1]); }
      ctx.closePath();
      ctx.fillStyle = "rgba(114,136,206," + alpha.toFixed(3) + ")";
      ctx.fill("evenodd");
    }
    return function (p) {
      if (!g.w) return;
      ctx.clearRect(0, 0, g.w, g.h);
      for (var s0 = 0; s0 < STAUB.length; s0++) {
        var st = STAUB[s0];
        var y = ((st.y - p * 0.16 * st.g) % 1 + 1) % 1;
        ctx.fillStyle = "rgba(198,206,222," + (0.4 * st.g * Math.min(1, p / 0.06 + 0.25) * (0.6 + 0.4 * Math.sin(st.t + p * 11))).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(st.x * g.w, y * g.h, st.g, 0, 7); ctx.fill();
      }
      var mx = g.w / 2, my = g.h / 2;
      var nah = weich(p / 0.55);
      var z = 1700 - 550 * nah;
      var neig = (78 - 14 * nah) * Math.PI / 180;
      var dreh = 0.2 + p * 0.6;
      var ring = weich(p / 0.05) * (1 - weich((p - 0.6) / 0.18));
      var zug = weich((p - 0.58) / 0.2);   /* Quellen fliegen zur Mitte */
      var eins = weich((p - 0.76) / 0.05);  /* ... und sind ein Licht */
      var breit = weich((p - 0.8) / 0.12);  /* das Licht zieht sich zur Kante */

      if (ring > 0.002) {
        band(z, neig, dreh, 0.06 * ring);
        ctx.lineWidth = 1;
        [true, false].forEach(function (lang) {
          ctx.beginPath();
          for (var t = lang ? 0 : 1; t < 120; t += lang ? 5 : 1) {
            if (!lang && t % 5 === 0) continue;
            var a = (t / 120) * Math.PI * 2 + dreh;
            var p1 = pkt(R * (lang ? 0.90 : 0.945), a, z, neig), p2 = pkt(R, a, z, neig);
            if (!p1 || !p2) continue;
            ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
          }
          ctx.strokeStyle = "rgba(240,242,246," + ((lang ? 0.3 : 0.13) * ring).toFixed(3) + ")";
          ctx.stroke();
        });
        kante(R, z, neig, dreh, 0.42 * ring, 1.4, true);
        kante(R * RI, z, neig, dreh, 0.2 * ring, 1);
      }

      var lagen = [];
      for (var q = 0; q < 3; q++) {
        var da = weich((p - (0.08 + q * 0.08)) / 0.06);
        var ps = da > 0 ? pkt(R, WINKEL[q] + dreh * 0.25, z, neig) : null;
        if (!ps) { lagen.push(null); continue; }
        var ort = function (f) {
          return [ps[0] + (mx - ps[0]) * f, ps[1] + (my - ps[1]) * f - Math.sin(f * Math.PI) * 40 * g.sk];
        };
        var jetzt = ort(zug);
        /* Leitlinie zur Mitte, kurz bevor die Punkte losfliegen */
        var leit = weich((p - 0.46) / 0.1) * (1 - zug);
        if (leit > 0.002) {
          var lg = ctx.createLinearGradient(ps[0], ps[1], mx, my);
          lg.addColorStop(0, "rgba(179,197,255," + (0.4 * leit).toFixed(3) + ")");
          lg.addColorStop(1, "rgba(179,197,255,0)");
          ctx.strokeStyle = lg; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ps[0], ps[1]); ctx.lineTo(mx, my); ctx.stroke();
        }
        /* Schweif waehrend des Flugs */
        if (zug > 0.01 && zug < 0.99) {
          ctx.lineWidth = 2 * Math.max(0.7, g.sk);
          for (var sw = 1; sw <= 5; sw++) {
            var v1 = ort(Math.max(0, zug - sw * 0.035)), v0 = ort(Math.max(0, zug - (sw - 1) * 0.035));
            ctx.strokeStyle = "rgba(179,197,255," + (0.4 * (1 - sw / 6)).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(v0[0], v0[1]); ctx.lineTo(v1[0], v1[1]); ctx.stroke();
          }
        }
        var gr = (3.4 + 1.4 * (1 - zug)) * Math.max(0.7, g.sk) * da * (1 - eins);
        if (gr > 0.05) {
          licht(ctx, jetzt[0], jetzt[1], gr * 6, 0.5);
          ctx.fillStyle = "rgba(233,238,255,.95)";
          ctx.beginPath(); ctx.arc(jetzt[0], jetzt[1], gr, 0, 7); ctx.fill();
        }
        /* Beim Auftauchen ein Ring, der sich ausbreitet */
        if (da > 0 && da < 1) {
          ctx.strokeStyle = "rgba(179,197,255," + (0.5 * (1 - da)).toFixed(3) + ")"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(jetzt[0], jetzt[1], 6 + da * 26, 0, 7); ctx.stroke();
        }
        lagen.push([jetzt[0], jetzt[1], da]);
      }

      /* Die Woerter haengen an ihrem Punkt */
      marken.forEach(function (el, q) {
        var l = lagen[q];
        /* Alle drei stehen mindestens ~40 % Bildschirmhoehe lang voll da */
        var f = l ? l[2] * (1 - weich((p - 0.54) / 0.06)) : 0;
        el.style.opacity = f.toFixed(3);
        if (!l || f <= 0 || !mass[q]) return;
        var b = mass[q][0], h = mass[q][1];
        var x = Math.max(12, Math.min(g.w - b - 12, l[0] - b / 2));
        var y = l[1] - h - 18 + (1 - l[2]) * 8;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });

      /* Ein Licht in der Mitte, das sich zur Kante auszieht */
      if (eins > 0) {
        var kr = (6 + 6 * eins) * Math.max(0.7, g.sk) * (1 - breit * 0.75);
        licht(ctx, mx, my, kr * 5, 0.45 * eins);
        if (breit > 0) {
          var halb = breit * Math.min(g.w * 0.62, 880) / 2;
          ctx.save(); ctx.translate(mx, my); ctx.scale(Math.max(halb, 1) / 60, 1);
          licht(ctx, 0, 0, 60, 0.22 * breit);
          ctx.restore();
          var kl = ctx.createLinearGradient(mx - halb, 0, mx + halb, 0);
          kl.addColorStop(0, "rgba(203,214,255,0)");
          kl.addColorStop(0.5, "rgba(233,238,255," + (0.9 * breit).toFixed(3) + ")");
          kl.addColorStop(1, "rgba(203,214,255,0)");
          ctx.strokeStyle = kl; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(mx - halb, my); ctx.lineTo(mx + halb, my); ctx.stroke();
        }
        ctx.fillStyle = "rgba(240,243,255," + (0.95 * eins).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(mx, my, kr, 0, 7); ctx.fill();
      }
      auftritt(hut, weich((p - 0.03) / 0.06) * (1 - weich((p - 0.54) / 0.06)));
      auftritt(schluss, weich((p - 0.8) / 0.08));
    };
  });

  /* ================= 2. Sieb =================
     Umbau 24.9.: vorher fielen im Hintergrund zufaellige Sterne weg, man
     sah nicht, DASS gefiltert wird. Jetzt vier Glasschichten, je eine pro
     Kriterium. Punkte fallen von oben durch, jede Schicht haelt sichtbar
     welche zurueck, unten kommen nur wenige an. Keine Stueckzahlen - die
     waeren erfunden. */
  station("st-sieb", function (g) {
    var ctx = g.ctx;
    var vorher = g.abschnitt.querySelector("[data-sieb-vorher]");
    var nachher = g.abschnitt.querySelector("[data-sieb-nachher]");
    var krit = [].slice.call(g.abschnitt.querySelectorAll("[data-krit]"));
    /* 24.9. spaet: Manuel fand das Sieb zu schnell - Abschnitt 300 statt 212 vh,
       Fallphase ueber gut 60 % der Strecke statt knapp 50 % */
    var N = 150, BLEIBT = 5, S0 = 0.06, STREU = 0.3, WEG = 0.3, ENDE = S0 + STREU + WEG;
    var rnd = wuerfel(20260924), P = [], HIMMEL = [], L = {};
    for (var i = 0; i < N; i++) {
      var r = rnd();
      /* An welcher Schicht der Punkt haengen bleibt: 0-3, 4 = kommt durch */
      P.push({ x: rnd(), d: rnd(), j: rnd(), g: 0.8 + rnd() * 0.6, k: r < 0.34 ? 0 : r < 0.6 ? 1 : r < 0.82 ? 2 : 3 });
      /* Anteile gleichmaessiger als vorher (42/28/18): sonst lagen die meisten
         schon auf Schicht 1 und 2, und in der Mitte bewegte sich kaum noch was */
    }
    var reihe = P.slice().sort(function (a, b) { return a.d - b.d; });
    var bleiben = [];
    for (i = 0; i < BLEIBT; i++) bleiben.push(reihe[Math.round((i + 0.5) * N / BLEIBT)]);
    bleiben.sort(function (a, b) { return a.x - b.x; }).forEach(function (p, k) { p.k = 4; p.platz = k; });
    for (i = 0; i < 90; i++) HIMMEL.push({ x: rnd(), y: rnd(), g: 0.3 + rnd() * 0.8 });
    g.ruhe = 1;
    g.neu = function () {
      L.b = Math.min(620, g.w * 0.84); L.x = (g.w - L.b) / 2;
      /* Alles etwas hoeher, damit das Fazit UNTER den Uebrigen Platz hat -
         dort schaut man am Ende hin (Manuel 24.9.) */
      L.start = g.h * 0.26; L.ende = g.h * 0.74;
      L.y = [0.33, 0.43, 0.53, 0.63].map(function (f) { return g.h * f; });
      L.u = L.y.map(function (y) { return (y - L.start) / (L.ende - L.start); });
      L.fach = Math.min(64, L.b / 6);
      krit.forEach(function (el, k) { el.style.transform = "translate(-50%," + (L.y[k] + 14).toFixed(0) + "px)"; });
    };
    g.neu();
    return function (t) {
      if (!g.w) return;
      ctx.clearRect(0, 0, g.w, g.h);
      var ein = weich(t / 0.08), weg = L.ende - L.start;
      ctx.fillStyle = "rgba(198,206,222," + (0.28 * ein).toFixed(3) + ")";
      ctx.beginPath();
      HIMMEL.forEach(function (s) { ctx.moveTo(s.x * g.w + s.g, s.y * g.h); ctx.arc(s.x * g.w, s.y * g.h, s.g, 0, 7); });
      ctx.fill();

      /* Welche Schicht gerade arbeitet: ab dem Moment, in dem die ersten Punkte ankommen */
      var A = L.u.map(function (u) { return S0 + WEG * u + 0.04; });
      A.push(ENDE);
      for (var k = 0; k < 4; k++) {
        var da = weich((t - 0.02 - k * 0.025) / 0.06);
        var an = weich((t - A[k]) / 0.03) * (1 - weich((t - A[k + 1]) / 0.03));
        krit[k].style.opacity = da.toFixed(3);
        krit[k].classList.toggle("an", an > 0.5);
        krit[k].classList.toggle("fertig", t >= A[k + 1]);
        if (da <= 0) continue;
        var y = L.y[k];
        rund(ctx, L.x, y - 6, L.b, 12, 6);
        if (an > 0.01) { ctx.lineWidth = 9; ctx.strokeStyle = "rgba(140,165,255," + (0.07 * an * da).toFixed(3) + ")"; ctx.stroke(); }
        ctx.fillStyle = "rgba(114,136,206," + ((0.07 + 0.07 * an) * da).toFixed(3) + ")"; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = "rgba(179,197,255," + ((0.17 + 0.3 * an) * da).toFixed(3) + ")"; ctx.stroke();
        ctx.strokeStyle = "rgba(233,238,255," + (0.14 * da).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(L.x + 14, y - 6); ctx.lineTo(L.x + L.b - 14, y - 6); ctx.stroke();
      }

      /* die Uebrigen leuchten schon auf, waehrend sie ankommen - vorher lag
         dazwischen eine Strecke, in der sich nur 5 Punkte bewegten */
      var zug = weich((t - (ENDE - 0.12)) / 0.16);
      for (i = 0; i < N; i++) {
        var p = P[i], s = S0 + p.d * STREU;
        if (t <= s) continue;
        var u = klemm((t - s) / WEG);
        var x = L.x + L.b * (0.04 + p.x * 0.92), yy, a, rad = 1.9 * p.g, blau = false;
        if (p.k < 4) {
          var uk = L.u[p.k];
          if (u < uk) { yy = L.start + weg * u; a = 0.85; }
          else { yy = L.y[p.k] - 8.5 - p.j * 5; a = 0.85 - 0.6 * weich((u - uk) / 0.2); }
        } else {
          yy = L.start + weg * u;
          var hin = weich((u - L.u[3]) / (1 - L.u[3]));
          x += (g.w / 2 + (p.platz - (BLEIBT - 1) / 2) * L.fach - x) * hin;
          a = 0.95; blau = u > L.u[3];
          rad *= 1 + 1.8 * zug;
        }
        a *= weich(u / 0.05);
        /* Durchgang durch eine Schicht: kurzes Aufleuchten an der Stelle */
        for (var sk = 0; sk < Math.min(p.k, 4); sk++) {
          var dk = Math.abs(u - L.u[sk]);
          if (dk < 0.025) {
            ctx.fillStyle = "rgba(179,197,255," + (0.16 * (1 - dk / 0.025)).toFixed(3) + ")";
            ctx.beginPath(); ctx.arc(x, L.y[sk], 11, 0, 7); ctx.fill();
          }
        }
        if (p.k === 4 && zug > 0) {
          licht(ctx, x, yy, 26, 0.5 * zug);
          ctx.strokeStyle = "rgba(179,197,255," + (0.35 * zug).toFixed(3) + ")"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, yy, rad * 3, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = (blau ? "rgba(179,197,255," : "rgba(198,206,222,") + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(x, yy, rad, 0, 7); ctx.fill();
      }
      auftritt(vorher, weich((t - 0.02) / 0.07) * (1 - weich((t - (ENDE - 0.02)) / 0.06)));
      auftritt(nachher, weich((t - (ENDE + 0.04)) / 0.1));
    };
  });

  /* ================= 3. Sternbild ================= */
  station("st-bild", function (g) {
    var ctx = g.ctx;
    var marken = [].slice.call(g.abschnitt.querySelectorAll("[data-stern]"));
    var titel = g.abschnitt.querySelector("[data-bild-titel]");
    var fuss = g.abschnitt.querySelector("[data-bild-fuss]");
    var n = marken.length;
    var rnd = wuerfel(419), HIMMEL = [];
    for (var i = 0; i < 320; i++) HIMMEL.push({ x: rnd(), y: rnd(), g: 0.3 + rnd() * 1.1, t: rnd() * 6.28, tiefe: 0.3 + rnd() * 0.7 });
    var LAGE_BREIT = [[0.10, 0.64], [0.30, 0.40], [0.50, 0.62], [0.70, 0.38], [0.90, 0.60]];
    /* schmal: senkrechte Linie links, alle Texte rechts daneben -
       im Zickzack kreuzten die Linien die Beschriftung */
    var LAGE_SCHMAL = [[0.15, 0.26], [0.15, 0.39], [0.15, 0.52], [0.15, 0.65], [0.15, 0.78]];
    /* Abstand der Sterne in der Scrollstrecke: der letzte steht bei 0.72 voll, egal wie viele es sind */
    var TAKT = 0.58 / Math.max(1, n - 1);
    var lage = [];
    g.ruhe = 1;
    g.neu = function () {
      var schmal = g.w < 720;
      lage = (schmal ? LAGE_SCHMAL : LAGE_BREIT).map(function (l) { return [l[0] * g.w, l[1] * g.h]; });
      marken.forEach(function (el, k) {
        el.classList.toggle("links", false);
        el.classList.toggle("rechts", schmal);
        el.style.left = lage[k][0] + "px";
        el.style.top = lage[k][1] + "px";
      });
    };
    g.neu();
    return function (p) {
      if (!g.w) return;
      ctx.clearRect(0, 0, g.w, g.h);
      /* Himmel: leichtes Funkeln und etwas Tiefe beim Scrollen */
      for (var i = 0; i < HIMMEL.length; i++) {
        var s = HIMMEL[i];
        var y = ((s.y + (0.5 - p) * 0.12 * s.tiefe) % 1 + 1) % 1;
        var a = 0.22 + 0.3 * s.tiefe * (0.55 + 0.45 * Math.sin(s.t + p * 14));
        ctx.fillStyle = "rgba(198,206,222," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(s.x * g.w, y * g.h, s.g, 0, 7); ctx.fill();
      }
      var an = [];
      for (var k = 0; k < n; k++) an.push(weich((p - (0.14 + k * TAKT)) / 0.1));
      /* Linien ziehen sich von Stern zu Stern */
      ctx.lineWidth = 1.2;
      for (var k2 = 1; k2 < n; k2++) {
        var f = weich((p - (0.14 + k2 * TAKT) + 0.1) / 0.1);
        if (f <= 0) continue;
        var a0 = lage[k2 - 1], b0 = lage[k2];
        var grad = ctx.createLinearGradient(a0[0], a0[1], b0[0], b0[1]);
        grad.addColorStop(0, "rgba(179,197,255,.55)"); grad.addColorStop(1, "rgba(179,197,255,.25)");
        ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.moveTo(a0[0], a0[1]);
        ctx.lineTo(a0[0] + (b0[0] - a0[0]) * f, a0[1] + (b0[1] - a0[1]) * f); ctx.stroke();
      }
      /* Die Sterne: erst ein schwacher Punkt, dann Licht und Ring */
      var ende = weich((p - 0.86) / 0.1);
      for (var k3 = 0; k3 < n; k3++) {
        var l = lage[k3], e = an[k3];
        var halo = ctx.createRadialGradient(l[0], l[1], 0, l[0], l[1], 46 + 20 * ende);
        halo.addColorStop(0, "rgba(179,197,255," + (0.34 * e + 0.12 * ende).toFixed(3) + ")");
        halo.addColorStop(1, "rgba(179,197,255,0)");
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(l[0], l[1], 66, 0, 7); ctx.fill();
        if (e > 0.3) {
          ctx.strokeStyle = "rgba(179,197,255," + (0.35 * (e - 0.3) / 0.7).toFixed(3) + ")"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(l[0], l[1], 8 + 6 * e, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = "rgba(" + (e > 0.5 ? "223,230,255" : "179,197,255") + "," + (0.35 + 0.65 * e).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(l[0], l[1], 2 + 2.2 * e, 0, 7); ctx.fill();
        marken[k3].style.opacity = e.toFixed(3);
        
        marken[k3].style.setProperty("--auf", e.toFixed(3));
      }
      if (titel) auftritt(titel, weich(p / 0.1));
      if (fuss) auftritt(fuss, weich((p - 0.84) / 0.1));
    };
  });

  /* ================= 4. Sternflug ================= */
  station("st-warp", function (g) {
    var ctx = g.ctx;
    var zeilen = [].slice.call(g.abschnitt.querySelectorAll("[data-warp]"));
    var N = 900, TIEFE = 4000, F = 520;
    var rnd = wuerfel(7), S = [];
    for (var i = 0; i < N; i++) {
      /* Streuung in einem Kegel, damit die Mitte frei bleibt, wo der Satz steht */
      var w = rnd() * Math.PI * 2, r = 120 + Math.pow(rnd(), 0.6) * 2600;
      S.push({ x: Math.cos(w) * r, y: Math.sin(w) * r, z: rnd() * TIEFE, g: 0.5 + rnd() * 1.2, b: rnd() < 0.12 });
    }
    g.ruhe = 1;
    /* Weg der Kamera: beschleunigt, rast, bremst sanft ab. Ableitung = Tempo. */
    var WEG = 6000;
    function weg(p) { return WEG * (p - Math.sin(2 * Math.PI * p) / (2 * Math.PI)); }
    function tempo(p) { return 1 - Math.cos(2 * Math.PI * p); }
    return function (p) {
      if (!g.w) return;
      ctx.clearRect(0, 0, g.w, g.h);
      var fahrt = klemm(p / 0.78);                 /* Flug in den ersten 78 %, danach steht der Himmel */
      var d = weg(fahrt), v = tempo(fahrt);
      var sk = Math.max(g.w, g.h) / 1100;
      var ein = weich(p / 0.06);
      var mx = g.w / 2, my = g.h / 2;
      ctx.lineCap = "round";
      for (var i = 0; i < N; i++) {
        var s = S[i];
        var z = ((s.z - d) % TIEFE + TIEFE) % TIEFE + 40;
        var k = F / z * sk;
        var x = mx + s.x * k, y = my + s.y * k;
        if (x < -40 || x > g.w + 40 || y < -40 || y > g.h + 40) continue;
        var nah = klemm(1 - z / TIEFE);
        var a = ein * (0.14 + 0.66 * nah) * (s.b ? 1 : 0.75);
        var rad = Math.min(1.6, Math.max(0.4, s.g * (0.35 + 1.1 * nah) * sk));
        /* Schweif: wo der Stern kurz vorher war */
        var zs = z + v * 150 * (0.4 + nah);
        var ks = F / zs * sk;
        var xs = mx + s.x * ks, ys = my + s.y * ks;
        ctx.strokeStyle = (s.b ? "rgba(179,197,255," : "rgba(214,220,234,") + a.toFixed(3) + ")";
        ctx.lineWidth = rad * 1.6;
        if (Math.abs(xs - x) + Math.abs(ys - y) < 1.5) {
          /* Stillstand: ein Punkt statt eines Strichs der Laenge null */
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
        } else { ctx.beginPath(); ctx.moveTo(xs, ys); ctx.lineTo(x, y); ctx.stroke(); }
      }
      /* Leuchten in der Mitte, sobald der Flug ausrollt */
      var ruhe = weich((p - 0.7) / 0.2);
      if (ruhe > 0) {
        var gl = ctx.createRadialGradient(mx, my, 0, mx, my, Math.min(g.w, g.h) * 0.55);
        gl.addColorStop(0, "rgba(114,136,206," + (0.22 * ruhe).toFixed(3) + ")");
        gl.addColorStop(1, "rgba(114,136,206,0)");
        ctx.fillStyle = gl; ctx.fillRect(0, 0, g.w, g.h);
      }
      zeilen.forEach(function (el, zi) {
        var f = weich((p - (0.62 + zi * 0.06)) / 0.12);
        el.style.opacity = f.toFixed(3);
        el.style.transform = "translateY(" + ((1 - f) * 14).toFixed(1) + "px)";
        if (el.classList.contains("warp-knoepfe")) el.classList.toggle("klickbar", f > 0.6);
        
      });
    };
  });
})();
