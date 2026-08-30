/* Chartlinien im Hero der Startseite.

   Die Kamera steht am ENTSTEHUNGSPUNKT und wandert mit ihm mit: ein neuer
   Punkt erscheint immer an derselben Stelle im Bild, gross und nah. Weil die
   Kamera weiterwandert, faellt jeder Punkt mit zunehmendem Alter nach hinten
   weg - kleiner, blasser, Richtung Fluchtpunkt links. Nichts kommt auf den
   Betrachter zu.

   Die Tiefenachse ist damit das ALTER der Daten. Buendelung und Anstieg
   haengen an der Datenstrecke, nicht am Alter: ein einmal geschriebener
   Punkt aendert seine Form nie wieder. Deshalb sieht man hinten die
   Streuung von damals und vorne den Strang von jetzt - ohne Morph-Effekt.

   Ersetzt den frueheren Ring. Die Ring-Funktion in startseite.js beginnt
   mit `if (!box) return;` und schaltet sich selbst ab, weil es das Element
   `#ring` nicht mehr gibt. Bewusst KEIN Spline-Viewer: fuer eine reine
   2D-Grafik waere ein WebGL-Bundle von unpkg unverhaeltnismaessig, und die
   Mesh-Aufloesung von Spline war auf 128 Stuetzpunkte begrenzt.

   Die Reihen sind SCHEMATISCH und zeigen keine echten Kurse.
*/
(function () {
  "use strict";
  // ===== Gemeinsame Mathematik. Wird woertlich in die Seite eingesetzt und
  // ===== von der Node-Pruefung geladen - eine Quelle, keine zwei Fassungen.
  
  // --- Raum ---------------------------------------------------------------
  const YAW   = 34 * Math.PI / 180;  // Flucht nach links
  const PITCH = -6 * Math.PI / 180;  // senkt den Fluchtpunkt, damit die Ferne faellt
  const D0    = 900;                 // Abstand zum Entstehungspunkt
  const ZMAX  = 16000;               // wie weit die Geschichte zurueckreicht
  const XOFF  = 820;                 // Kamera steht seitlich neben der Achse
  const YOFF  = 260;                 // Flaeche liegt UEBER der Kamera - sonst
                                     // steigt sie perspektivisch zum Horizont an
                                     // und der Chart faellt statt zu steigen.
  const ALTER = 2.4;                 // sichtbares Alter in Datenstrecke
  const ZS    = (ZMAX - D0) / ALTER;
  const WSK   = 1.15;                // Wert -> Welteinheiten
  const SPUR  = 55;                  // seitlicher Versatz der zwoelf Linien
  const N     = 420;                 // Stuetzpunkte in die Tiefe
  
  // --- Zeit ---------------------------------------------------------------
  // Halbiert gegenueber der vorigen Fassung: ein Punkt braucht jetzt gut
  // 53 Sekunden von vorne bis ganz nach hinten.
  const TEMPO = 0.045;               // Datenstrecke je Sekunde
  const PER   = 3.2;                 // Laenge eines Durchgangs in Datenstrecke
  
  // --- Erzaehlung, als Funktion der DATENSTRECKE ---------------------------
  // Entscheidend: bund und stieg haengen an d, also daran, WANN ein Punkt
  // entstanden ist - nicht an seinem Alter. Ein einmal geschriebener Punkt
  // aendert seine Form nie wieder, er wandert nur nach hinten und nach unten.
  const glatt = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rampe = (x, a, b) => glatt((x - a) / (b - a));
  
  // Beide muessen bei u = 0 und u = 1 denselben Wert haben, sonst gibt es
  // einen harten Bruch im Strang, wo ein Durchgang auf den naechsten trifft.
  const bundU  = (u) => rampe(u, 0.10, 0.30) - rampe(u, 0.82, 1.00);
  const stiegU = (u) => rampe(u, 0.34, 0.55) - rampe(u, 0.80, 0.95);
  
  // Der Anstieg muss aufsummiert werden: einmal gestiegen bleibt gestiegen.
  // Dasselbe fuer die Streuung - solange die Linien ungebuendelt sind, laufen
  // sie weiter auseinander. Beides ueber eine Tabelle je Durchgang.
  const TAB = 512;
  const IB = new Float64Array(TAB + 1);   // Integral von bundU (unbenutzt, s. u.)
  const IS = new Float64Array(TAB + 1);   // Integral von stiegU
  for (let i = 1; i <= TAB; i++) {
      const u0 = (i - 1) / TAB, u1 = i / TAB, du = 1 / TAB;
      IB[i] = IB[i - 1] + 0.5 * (bundU(u0) + bundU(u1)) * du;
      IS[i] = IS[i - 1] + 0.5 * (stiegU(u0) + stiegU(u1)) * du;
  }
  const tab = (T, u) => {
      const x = u * TAB, i = Math.min(TAB - 1, Math.max(0, Math.floor(x))), f = x - i;
      return T[i] + (T[i + 1] - T[i]) * f;
  };
  
  const STEIGRATE = 620;   // wieviel der Trend je Durchgang gewinnt
  const SPREIZ    = 0.25;  // Gesamtmass der Streuung im Chaos
  const MDIV      = 62;    // wie weit die Kurven im Chaos auseinanderlaufen
  const MFREQ     = 0.7;   // wie langsam jede Linie ihre Richtung aendert
  const RESTSTREU = 0.05;  // wie eng der Strang im gebuendelten Zustand ist
  
  // Alles, was ein Punkt bei der Datenstrecke d ueber sich weiss.
  const zustand = (d) => {
      const x = d / PER, n = Math.floor(x), u = x - n;
      const bund  = bundU(u);
      const stieg = stiegU(u);
      const is = PER * (n * IS[TAB] + tab(IS, u));
      return {
          bund,
          streu: 1 - (1 - RESTSTREU) * bund,
          trend: STEIGRATE * is                        // aufsummierter Anstieg
      };
  };
  
  // --- Kurven -------------------------------------------------------------
  const lcg = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hsh = (n, s) => { const v = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  // Lineare Interpolation: die harten Knicke unterscheiden eine Kursreihe
  // von einer Sinuswelle.
  const rausch = (x, s) => { const i = Math.floor(x), f = x - i, a = hsh(i, s), b = hsh(i + 1, s);
      return (a + (b - a) * f) * 2 - 1; };
  
  const CC = [5, 15, 47, 115], AA = [110, 55, 34, 14], SD = [11, 27, 43, 61];
  const markt = (d) => AA[0]*rausch(d*CC[0],SD[0]) + AA[1]*rausch(d*CC[1],SD[1])
                     + AA[2]*rausch(d*CC[2],SD[2]) + AA[3]*rausch(d*CC[3],SD[3]);
  
  const GRUPPEN = [
      { m: -0.85, y:  140 }, { m:  0.75, y: -150 }, { m: -0.35, y:  -40 },
      { m:  0.85, y:   70 }, { m: -0.60, y: -105 }, { m:  0.20, y:  170 }
  ];
  const LINIEN = (() => {
      const out = [];
      const mach = (anzahl, seed, leit) => {
          const rng = lcg(seed);
          for (let k = 0; k < anzahl; k++) {
              const g = GRUPPEN[k % GRUPPEN.length];
              out.push({ sa: 100 + k*7 + seed*0.01, sb: 500 + k*13 + seed*0.01,
                  dAmp: 40 + rng()*55, m: g.m + (rng()-0.5)*0.16,
                  y0: (g.y + (rng()-0.5)*50) * SPREIZ, vr: 0.92 + rng()*0.16, leit });
          }
      };
      mach(7, 1337, false); mach(5, 909, true);
      for (let i = 0; i < out.length; i++) out[i].spur = (i/(out.length-1) - 0.5) * SPUR;
      return out;
  })();
  
  // Der Wert einer Linie an der Datenstrecke d, relativ zum jetzigen Trend.
  // z ist der Zustand bei d, zJetzt der Zustand am Entstehungspunkt.
  const wert = (L, d, z, trendJetzt) => {
      const q = d * L.vr;
      const abw = L.dAmp * rausch(q*18, L.sa)
                + L.dAmp * 0.45 * rausch(q*41, L.sb)
                + L.dAmp * 0.22 * rausch(q*95, L.sa + 7);
      // (z.trend - trendJetzt) ist negativ fuer aeltere Punkte: die
      // Vergangenheit liegt tiefer, weil der Trend seither gestiegen ist.
      return (z.trend - trendJetzt)
           + z.bund * markt(d)
           + z.streu * (L.y0 + L.m * MDIV * rausch(d * MFREQ, L.sa + 31) + abw);
  };
  
  // --- Tiefenstaffelung und Projektion ------------------------------------
  // Logarithmisch, damit die Stuetzpunkte auf dem BILD gleichmaessig liegen
  // statt vorne grob und hinten als Matsch.
  const ZJ = new Float64Array(N), AJ = new Float64Array(N);
  for (let j = 0; j < N; j++) {
      ZJ[j] = D0 * Math.pow(ZMAX / D0, j / (N - 1));
      AJ[j] = (ZJ[j] - D0) / ZS;
  }
  const sinY = Math.sin(YAW), cosY = Math.cos(YAW);
  const sinP = Math.sin(PITCH), cosP = Math.cos(PITCH);
  // Die von der Hoehe unabhaengigen Teile einmal vorberechnen.
  const X1 = new Float64Array(LINIEN.length * N);
  const Z1 = new Float64Array(LINIEN.length * N);
  for (let i = 0; i < LINIEN.length; i++) {
      const X = XOFF + LINIEN[i].spur;
      for (let j = 0; j < N; j++) {
          X1[i*N + j] = X * cosY - ZJ[j] * sinY;
          Z1[i*N + j] = X * sinY + ZJ[j] * cosY;
      }
  }
  
  // ===== Zeichnen ==========================================================
  const cv = document.getElementById("hero-chart");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  // Feste Einpassung, ueber zehn Minuten Laufzeit ausgemessen. Fest, damit
  // das Bild NICHT mitatmet, wenn sich die Kurven aendern.
  const XMIN = -0.6121, XMAX = 0.1627, YMIN = -0.2042, YMAX = 0.2808;
  // Wie stark das Band sein quadratisches Feld ausfuellt. Ueber 1 laeuft die
  // Ferne links aus dem Bild - dort ist sie ohnehin winzig und ausgeblendet.
  const FUELLE = 1.42;   // wie stark das Band den Platz fuellt
  // Nach links geschoben, damit der Entstehungspunkt nicht am Rand klebt.
  // Zusammen ergibt das: Spitze bei rund 88 % der Feldbreite.
  const VERSATZ = -0.30;
  
  let w = 0, h = 0, SK = 0, ox = 0, oy = 0;
  const passe = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Der Platz ist quadratisch, das Band hat 1,6:1 - auf die Breite
      // einpassen und senkrecht mittig setzen.
      SK = (w * 0.94 * FUELLE) / (XMAX - XMIN);
      ox = w * (0.03 + VERSATZ) - XMIN * SK;
      oy = h / 2 + ((YMAX + YMIN) / 2) * SK;
  };
  
  // Tiefenbaender: je Band ein Zug mit eigener Helligkeit und Staerke. Ein Zug
  // je Segment waere sauberer, aber 5000 Zuege je Bild zu teuer.
  const BAENDER = 6;
  const ZUST = new Array(N);
  
  const zeichne = (t) => {
      if (!w || !h) return;
      const dNow = t * TEMPO;
      const tj = zustand(dNow).trend;
      for (let j = 0; j < N; j++) ZUST[j] = zustand(dNow - AJ[j]);
  
      ctx.clearRect(0, 0, w, h);
  
      for (let i = 0; i < LINIEN.length; i++) {
          const L = LINIEN[i], off = i * N;
          for (let b = 0; b < BAENDER; b++) {
              const j0 = Math.floor(b * (N - 1) / BAENDER);
              const j1 = Math.floor((b + 1) * (N - 1) / BAENDER);
              const nah = 1 - b / BAENDER;
              ctx.beginPath();
              let auf = false;
              for (let j = j0; j <= j1; j++) {
                  const Y = wert(L, dNow - AJ[j], ZUST[j], tj) * WSK + YOFF;
                  const z1 = Z1[off + j];
                  const y2 = Y * cosP + z1 * sinP;
                  const z2 = -Y * sinP + z1 * cosP;
                  if (z2 < 1) continue;
                  const sx = ox + (X1[off + j] / z2) * SK, sy = oy - (y2 / z2) * SK;
                  if (!auf) { ctx.moveTo(sx, sy); auf = true; } else ctx.lineTo(sx, sy);
              }
              ctx.lineWidth = L.leit ? (0.7 + 1.3 * nah) : (0.5 + 0.7 * nah);
              const al = L.leit ? (0.10 + 0.68 * nah * nah) : (0.05 + 0.28 * nah * nah);
              // Hausfarben: Akzent b3c5ff fuer die fuehrenden Linien,
              // Muted a2a8b5 fuer das Feld dahinter.
              ctx.strokeStyle = (L.leit ? "rgba(179,197,255," : "rgba(162,168,181,")
                              + al.toFixed(3) + ")";
              ctx.stroke();
          }
      }
  
      // Keine Beschriftung im Bild. "Ohne/mit Strategie" war eine
      // Behauptung, die das Bild nicht halten konnte: die Buendelung laeuft
      // periodisch durch, also stimmte die Zuordnung immer nur zeitweise.
      // Was die Grafik zeigt, steht jetzt als ruhige Zeile darunter im HTML -
      // echte Schrift statt Canvas-Text.

      // Der Entstehungspunkt selbst.
      for (let i = 0; i < LINIEN.length; i++) {
          const L = LINIEN[i];
          if (!L.leit) continue;
          const Y = wert(L, dNow, ZUST[0], tj) * WSK + YOFF;
          const z1 = Z1[i * N];
          const y2 = Y * cosP + z1 * sinP, z2 = -Y * sinP + z1 * cosP;
          if (z2 < 1) continue;
          ctx.beginPath();
          ctx.arc(ox + (X1[i * N] / z2) * SK, oy - (y2 / z2) * SK, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(240,242,246,.92)";
          ctx.fill();
      }
  };
  
  let laeuft = false, raf = 0;
  const t0 = performance.now();
  const tick = (now) => { zeichne((now - t0) / 1000); raf = requestAnimationFrame(tick); };
  const anfang = () => { if (laeuft) return; laeuft = true; raf = requestAnimationFrame(tick); };
  const stopp = () => { laeuft = false; cancelAnimationFrame(raf); };
  
  passe();
  window.addEventListener("resize", () => { passe(); if (!laeuft) zeichne(45); });
  
  if (ruhig) {
      zeichne(45);   // Standbild: gebuendelt und gestiegen
  } else {
      new IntersectionObserver((e) => (e[0].isIntersecting ? anfang() : stopp()),
          { threshold: 0 }).observe(cv);
      document.addEventListener("visibilitychange",
          () => (document.hidden ? stopp() : anfang()));
  }
})();
