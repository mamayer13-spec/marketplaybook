/* Weitere Scroll-Stationen.

   Beide haengen an der SCROLLPOSITION, nicht an einer Uhr - zurueckscrollen
   spielt sie rueckwaerts. Dasselbe Prinzip wie Ringflug und Coin.

   1. Sieb   - ein Feld aus Punkten wird ausgeduennt, sechs bleiben stehen
               und ordnen sich in eine Reihe. Selbst gerechnete Perspektive,
               keine Bibliothek.
   2. Satz   - ein Satz baut sich Wort fuer Wort auf, waehrend der Abschnitt
               klebt. Kein Canvas, reine Typografie als Gegengewicht.
*/
(function () {
  "use strict";
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Kleiner deterministischer Zufall - gleiche Anordnung bei jedem Laden. */
  function wuerfel(s) {
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function klemm(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function weich(v) { return v * v * (3 - 2 * v); }

  /* Fortschritt eines klebenden Abschnitts: 0 am Anfang, 1 am Ende. */
  function fortschritt(abschnitt) {
    var r = abschnitt.getBoundingClientRect();
    var weg = abschnitt.offsetHeight - window.innerHeight;
    if (weg <= 0) return 0.5;
    return klemm(-r.top / weg);
  }

  /* ================= 1. Sieb ================= */
  (function () {
    var cv = document.getElementById("sieb-canvas");
    var abschnitt = document.getElementById("sieb");
    if (!cv || !abschnitt) return;
    var ctx = cv.getContext("2d");
    var vorAbschnitt = abschnitt.previousElementSibling;
    var vorher = abschnitt.querySelector("[data-sieb-vorher]");
    var nachher = abschnitt.querySelector("[data-sieb-nachher]");

    var N = 700;          // Punkte im Feld
    var BLEIBT = 6;       // sechs Signale 2026 - der Wert steht auch im Text
    var F = 1150;         // Brennweite
    var REIHE = 250;      // Abstand der sechs in der Schlussreihe

    // Feld einmal aufbauen. z ist die Tiefe, x/y die Streuung.
    var rnd = wuerfel(20260828);
    var P = [];
    for (var i = 0; i < N; i++) {
      // Streuung waechst mit der Tiefe (Kegel statt Quader). Bei einem
      // Quader schrumpft das Feld nach hinten und man sieht seine Kante -
      // so reicht es in jeder Ebene ueber den Bildrand hinaus.
      var z0 = 500 + rnd() * 3400;
      var auf = z0 / 900;
      P.push({
        x: (rnd() - 0.5) * 3400 * auf,
        y: (rnd() - 0.5) * 2300 * auf,
        z: z0,
        r: rnd(),                 // Rang: bestimmt, wann der Punkt faellt
        g: 0.9 + rnd() * 1.3,     // Groesse
        bleibt: false,
        px: 0, py: 0
      });
    }
    // Die sechs Ueberlebenden gleichmaessig ueber das Feld verteilen, damit
    // das Aussieben nicht nur an einer Ecke passiert.
    P.slice().sort(function (a, b) { return a.x - b.x; })
      .filter(function (p, k) { return k % Math.floor(N / BLEIBT) === 0; })
      .slice(0, BLEIBT)
      .forEach(function (p, k) { p.bleibt = true; p.platz = k; });

    var w = 0, h = 0, mx = 0, my = 0, sk = 1;
    function passe() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mx = w / 2; my = h / 2;
      // Die Schlussreihe soll rund 72 % der Breite einnehmen, nie breiter
      // als das Fenster - deshalb an der kleineren Seite mitmessen.
      sk = Math.min(w * 0.72 / (REIHE * (BLEIBT - 1) * (F / 1400)), Math.min(w, h) / 620);
    }

    function zeichne(t) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      // Die Leinwand ragt in den Abschnitt darueber hinein, damit das Feld
      // schon sichtbar ist, bevor der Abschnitt oben anliegt - sonst wirkt
      // die Seite beim Runterscrollen kurz zu Ende. In diesem Ueberlappungs-
      // bereich steht aber noch fremder Text, deshalb laufen die Punkte
      // dort von null an und drehen erst unterhalb des Textes voll auf.
      // Gemessen wird am Ende des Abschnitts davor, nicht am eigenen: die
      // Leinwand ist erst angeheftet, wenn der Abschnitt oben anliegt.
      var kante = -1, saum = 180;
      if (vorAbschnitt) {
        kante = vorAbschnitt.getBoundingClientRect().bottom - cv.getBoundingClientRect().top;
      }
      var zug = weich(klemm((t - 0.46) / 0.5));    // Sammeln der Sechs
      // Die Drehung laeuft beim Sammeln aus. Bliebe sie stehen, waere die
      // Schlussreihe um z*sin(dreh) aus der Bildmitte geschoben.
      // Flach gehalten: je staerker die Y-Drehung, desto weiter schiebt
      // sich das Feld aus dem Bild und laesst eine Seite leer.
      var dreh = (-0.16 + t * 0.26) * (1 - zug);
      var sy = Math.sin(dreh), cy = Math.cos(dreh);
      var kam = 1400 - t * 260;                    // Kamera faehrt leicht hinein

      var sicht = [];
      for (var i = 0; i < N; i++) {
        var p = P[i];
        var a = 1;
        if (p.bleibt) {
          a = 1;
        } else {
          // Jeder Punkt hat seine eigene Schwelle. Dadurch duennt das Feld
          // fortlaufend aus statt auf einen Schlag zu verschwinden.
          var schwelle = 0.2 + p.r * 0.5;
          a = 1 - weich(klemm((t - schwelle) / 0.12));
          if (a <= 0.002) continue;
        }

        var x = p.x, y = p.y, z = p.z;
        if (p.bleibt && zug > 0) {
          // Zielposition in der Reihe, mittig vor der Kamera.
          var zx = (p.platz - (BLEIBT - 1) / 2) * REIHE;
          // Hoeher als die Bildmitte: darunter steht jetzt der Satz mit
          // den drei Kennzahlen, der mehr Platz braucht als die eine Zeile
          // vorher.
          x += (zx - x) * zug; y += (300 - y) * zug; z += (1400 - z) * zug;
        } else if (!p.bleibt) {
          // Aussortierte sacken beim Ausblenden leicht nach unten.
          y += (1 - a) * 260;
        }

        var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        var zz = z1 + kam;
        if (zz < 60) continue;
        var k = F / zz;
        var bx = mx + x1 * k * sk, by = my - y * k * sk;
        if (kante > 0) {
          a *= by < kante ? klemm(by / kante) * 0.42
             : by < kante + saum ? 0.42 + 0.58 * ((by - kante) / saum)
             : 1;
        }
        sicht.push({
          sx: bx,
          sy: by,
          // Die Sechs sind gleichrangig, also gleichen sich ihre Groessen
          // beim Sammeln an - unterschiedlich grosse Punkte in einer Reihe
          // wuerden eine Rangfolge behaupten, die es nicht gibt.
          r: Math.max(0.5, (p.bleibt ? p.g + (1.5 - p.g) * zug : p.g) * k * sk * 2.4)
             * (p.bleibt ? 1 + zug * 1.5 : 1),
          a: a * (p.bleibt ? 1 : 0.78 * klemm(2600 / zz)),
          bleibt: p.bleibt,
          z: zz
        });
      }
      sicht.sort(function (a2, b2) { return b2.z - a2.z; });

      // Verbindungslinie zwischen den Sechs, sobald sie in der Reihe stehen.
      if (zug > 0.35) {
        var reihe = sicht.filter(function (s) { return s.bleibt; })
                         .sort(function (a2, b2) { return a2.sx - b2.sx; });
        if (reihe.length > 1) {
          ctx.beginPath();
          ctx.moveTo(reihe[0].sx, reihe[0].sy);
          for (var j = 1; j < reihe.length; j++) ctx.lineTo(reihe[j].sx, reihe[j].sy);
          ctx.strokeStyle = "rgba(179,197,255," + (0.28 * (zug - 0.35) / 0.65).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      for (var m = 0; m < sicht.length; m++) {
        var s = sicht[m];
        if (s.bleibt) {
          if (zug > 0.5) {
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, s.r * 3.2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(179,197,255," + (0.3 * (zug - 0.5) / 0.5).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(179,197,255," + (0.7 + 0.3 * zug).toFixed(3) + ")";
        } else {
          ctx.fillStyle = "rgba(198,206,222," + s.a.toFixed(3) + ")";
        }
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (vorher) vorher.style.opacity = ((kante > 0 ? 0 : 1) * (1 - weich(klemm((t - 0.38) / 0.16)))).toFixed(3);

      if (nachher) nachher.style.opacity = weich(klemm((t - 0.58) / 0.2)).toFixed(3);
    }

    passe();
    if (ruhig) { zeichne(1); return; }

    var offen = false, sichtbar = true;
    function rahmen() { offen = false; if (sichtbar) zeichne(fortschritt(abschnitt)); }
    function anstossen() { if (!offen) { offen = true; requestAnimationFrame(rahmen); } }
    new IntersectionObserver(function (e) {
      sichtbar = e[0].isIntersecting;
      if (sichtbar) anstossen();
    }, { rootMargin: "120px" }).observe(abschnitt);
    window.addEventListener("scroll", anstossen, { passive: true });
    window.addEventListener("resize", function () { passe(); zeichne(fortschritt(abschnitt)); });
    zeichne(fortschritt(abschnitt));
  })();

  /* ================= 2. Karten ================= */
  /* Die Listen treten gestaffelt auf, sobald ihr Block ins Bild kommt -
     nicht alle vier auf einen Schlag, das wirkt wie ein Umschalten. */
  (function () {
    /* .stapel gehoert dazu, seit die drei Punkte im Vision-Abschnitt in
       der rechten Spalte stehen statt in einer eigenen .spalten-Reihe.
       Fehlt der Selektor, bleiben sie unsichtbar: das CSS setzt jedes
       .feld auf opacity 0 und wartet auf die Klasse, die hier vergeben
       wird. */
    var bloecke = document.querySelectorAll(
      ".auftritt ul.punkte, .auftritt ol.nummern, .auftritt .spalten, .auftritt .stapel"
    );
    if (!bloecke.length) return;
    if (ruhig) {
      [].forEach.call(document.querySelectorAll(
        ".auftritt ul.punkte li, .auftritt ol.nummern li, .auftritt .feld"
      ), function (k) { k.classList.add("da"); });
      return;
    }
    var beo = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var karten = e.target.querySelectorAll(":scope > li, :scope > .feld");
        [].forEach.call(karten, function (k, i) {
          setTimeout(function () { k.classList.add("da"); }, i * 95);
        });
        beo.unobserve(e.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -60px" });
    [].forEach.call(bloecke, function (b) { beo.observe(b); });
  })();

  /* ================= 3. Saetze ================= */
  /* Laeuft ueber ALLE .satz-Abschnitte, jeder mit seiner eigenen
     Scrollstrecke. Neuer Satz = neuer Abschnitt im HTML, hier nichts. */
  [].forEach.call(document.querySelectorAll(".satz"), function (abschnitt) {
    var p = abschnitt.querySelector("[data-satz]");
    if (!p) return;

    // Nur Textknoten zerlegen, damit <em> und <br> heil bleiben.
    var woerter = [];
    (function teile(el) {
      [].slice.call(el.childNodes).forEach(function (k) {
        if (k.nodeType === 3) {
          var stuecke = k.nodeValue.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          stuecke.forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
            var sp = document.createElement("span");
            sp.className = "satz-wort";
            sp.textContent = t;
            frag.appendChild(sp);
            woerter.push(sp);
          });
          el.replaceChild(frag, k);
        } else if (k.nodeType === 1 && k.tagName !== "BR") {
          teile(k);
        }
      });
    })(p);

    if (ruhig || !woerter.length) {
      woerter.forEach(function (s) { s.style.opacity = 1; });
      return;
    }

    var block = abschnitt.querySelector(".satz-block");
    function stellen() {
      // Die Woerter verteilen sich ueber die ersten 78 % der Strecke, der
      // Rest ist Ruhe, damit der fertige Satz einen Moment lang steht.
      var t = fortschritt(abschnitt);
      // Marke und Linie ziehen sich vor dem Satz auf und tragen ihn -
      // dadurch scrollt man nicht mehr in eine leere Flaeche hinein.
      if (block) block.style.setProperty("--auf", weich(klemm(t / 0.3)).toFixed(3));
      var n = woerter.length;
      for (var i = 0; i < n; i++) {
        var ab = (i / n) * 0.78;
        var f = weich(klemm((t - ab) / 0.16));
        var s = woerter[i];
        s.style.opacity = f.toFixed(3);
        s.style.transform = "translateY(" + ((1 - f) * 14).toFixed(2) + "px)";
        s.style.filter = f > 0.995 ? "none" : "blur(" + ((1 - f) * 5).toFixed(2) + "px)";
      }
    }

    var offen = false;
    function anstossen() { if (!offen) { offen = true; requestAnimationFrame(function () { offen = false; stellen(); }); } }
    window.addEventListener("scroll", anstossen, { passive: true });
    window.addEventListener("resize", anstossen, { passive: true });
    stellen();
  });
})();
