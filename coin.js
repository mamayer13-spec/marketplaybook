/* Coin-Szene.

   Echte 3D-Geometrie, selbst gerechnet: ein Zylinder aus SEG Segmenten wird
   gedreht, perspektivisch projiziert und pro Flaeche beleuchtet. Kein
   Fremdcode, keine 3D-Bibliothek - dasselbe Vorgehen wie beim Ringflug.

   Die Drehung haengt an der SCROLLPOSITION, nicht an einem Zeitgeber:
   zurueckscrollen dreht zurueck. Dadurch steuert der Nutzer die Bewegung
   und der kurze Moment auf der Kante liest sich als Wenden, nicht als
   Aussetzer.

   Damit das Metall nicht billig wirkt:
   - der Mantel ist geriffelt wie eine echte Muenzkante, jede zweite Kerbe
     blitzt auf, wenn sie ins Licht dreht,
   - jede Praegung ist Relief: eine helle Lichtkante und eine dunkle
     Schattenkante, versetzt in Richtung des Lichts,
   - ueber die Flaeche wandert ein schmales Glanzband mit der Drehung.

   Die Muenzflaeche wird nicht Punkt fuer Punkt projiziert, sondern ueber
   eine Transformationsmatrix gezeichnet: die beiden Basisvektoren der
   gedrehten Scheibe spannen ein 2D-System auf, in dem Ringe, Kerben und
   Schrift ganz normal in Muenzkoordinaten gezeichnet werden koennen.
*/
(function () {
  "use strict";
  var cv = document.getElementById("coin-canvas");
  var abschnitt = document.getElementById("coin-szene");
  if (!cv || !abschnitt) return;
  var ctx = cv.getContext("2d");
  var ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var zeilen = [].slice.call(abschnitt.querySelectorAll("[data-zeile]"));

  var SEG = 200;       // Segmente am Mantel
  var R = 235;         // Radius
  var T = 30;          // halbe Dicke
  var F = 1400;        // Brennweite
  var DIST = 1250;     // Kameraabstand
  var KIPP = 15 * Math.PI / 180;
  var SK = Math.sin(KIPP), CK = Math.cos(KIPP);

  // Licht von links oben vorne.
  var LX = -0.52, LY = 0.62, LZ = 0.59;

  var CX = new Float64Array(SEG), CY = new Float64Array(SEG);
  for (var i = 0; i < SEG; i++) {
    var a = (i / SEG) * Math.PI * 2;
    CX[i] = Math.cos(a); CY[i] = Math.sin(a);
  }

  var w = 0, h = 0, mx = 0, my = 0, sk = 1, schmal = false;
  function passe() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    schmal = w < 900;
    // Breit: Coin links, Kennzahlen rechts daneben. Schmal: Coin oben.
    mx = schmal ? w / 2 : w * 0.30;
    my = schmal ? h * 0.30 : h / 2;
    var platz = schmal ? Math.min(w * 0.8, h * 0.5) : Math.min(w * 0.46, h);
    sk = (platz * 0.66) / (2 * R * (F / DIST));
  }

  function proj(x, y, z, sy, cy) {
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    var y2 = y * CK - z1 * SK;
    var z2 = y * SK + z1 * CK + DIST;
    var k = F / z2;
    return [mx + x1 * k * sk, my - y2 * k * sk, z2];
  }

  // Dreht nur eine Normale mit - fuer die Beleuchtung.
  function norm(nx0, ny0, nz0, sy, cy) {
    var nx = nx0 * cy + nz0 * sy;
    var nz = -nx0 * sy + nz0 * cy;
    var ny = ny0 * CK - nz * SK;
    var nzz = ny0 * SK + nz * CK;
    var l = Math.sqrt(nx * nx + ny * ny + nzz * nzz) || 1;
    return [nx / l, ny / l, nzz / l];
  }
  function lambert(n) { return Math.max(0, n[0] * LX + n[1] * LY + n[2] * LZ); }

  var koernung = (function () {
    var c = document.createElement("canvas");
    c.width = c.height = 140;
    var k = c.getContext("2d");
    var bild = k.createImageData(140, 140);
    for (var i0 = 0; i0 < bild.data.length; i0 += 4) {
      var v = 118 + Math.random() * 74;
      bild.data[i0] = bild.data[i0 + 1] = bild.data[i0 + 2] = v;
      bild.data[i0 + 3] = 255;
    }
    k.putImageData(bild, 0, 0);
    return c;
  })();

  function metall(hell) {
    var c = Math.max(0, Math.min(1, hell));
    var v = Math.round(255 * c);
    return "rgb(" + Math.round(v * 0.83) + "," + Math.round(v * 0.88) + "," + v + ")";
  }

  function zeichne(t) {
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    var dreh = -0.35 + t * (Math.PI * 2 + 0.7);
    var sy = Math.sin(dreh), cy = Math.cos(dreh);

    // Welche Scheibenseite zeigt zur Kamera? Naeher heisst kleineres z.
    // Ohne diese Fallunterscheidung liegt das Gesicht bei jeder halben
    // Umdrehung hinter dem Mantel.
    var zs = cy > 0 ? -T : T;
    var vor = zs > 0 ? 1 : -1;          // Richtung "aus der Flaeche heraus"

    /* ---------- abgewandte Seite als dunkle Silhouette ---------- */
    ctx.beginPath();
    for (var q = 0; q < SEG; q++) {
      var pb = proj(CX[q] * R, CY[q] * R, -zs, sy, cy);
      if (q) ctx.lineTo(pb[0], pb[1]); else ctx.moveTo(pb[0], pb[1]);
    }
    ctx.closePath();
    ctx.fillStyle = "#070a10";
    ctx.fill();

    /* ---------- Mantel, geriffelt ---------- */
    var flaechen = [];
    for (var i2 = 0; i2 < SEG; i2++) {
      var j = (i2 + 1) % SEG;
      var p1 = proj(CX[i2] * R, CY[i2] * R,  T, sy, cy);
      var p2 = proj(CX[j] * R,  CY[j] * R,   T, sy, cy);
      var p3 = proj(CX[j] * R,  CY[j] * R,  -T, sy, cy);
      var p4 = proj(CX[i2] * R, CY[i2] * R, -T, sy, cy);
      var rx = (CX[i2] + CX[j]) / 2, ry = (CY[i2] + CY[j]) / 2;
      // Riffelung: die Normale kippt abwechselnd tangential nach links und
      // rechts, wie die Kerben einer echten Muenzkante.
      var k = (i2 % 2 === 0 ? 1 : -1) * 0.6;
      var n = norm(rx - ry * k, ry + rx * k, 0, sy, cy);
      var lam = lambert(n);
      flaechen.push({
        p: [p1, p2, p3, p4],
        z: (p1[2] + p2[2] + p3[2] + p4[2]) / 4,
        hell: 0.06 + lam * 0.50 + Math.pow(lam, 26) * 0.34
      });
    }
    flaechen.sort(function (a2, b2) { return b2.z - a2.z; });
    for (var f = 0; f < flaechen.length; f++) {
      var s = flaechen[f];
      ctx.beginPath();
      ctx.moveTo(s.p[0][0], s.p[0][1]);
      ctx.lineTo(s.p[1][0], s.p[1][1]);
      ctx.lineTo(s.p[2][0], s.p[2][1]);
      ctx.lineTo(s.p[3][0], s.p[3][1]);
      ctx.closePath();
      ctx.fillStyle = metall(s.hell);
      ctx.fill();
      // Bei 200 Segmenten blitzen sonst haarfeine Fugen zwischen den
      // Flaechen auf - der gleichfarbige Strich schliesst sie.
      ctx.lineWidth = 0.7; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
    }

    /* ---------- Gesicht ---------- */
    // Basisvektoren der Scheibenebene im Bild. Die Scheibe ist flach,
    // deshalb ist diese affine Abbildung praktisch exakt.
    var o = proj(0, 0, zs, sy, cy);
    var pu = proj(R, 0, zs, sy, cy);
    var pv = proj(0, R, zs, sy, cy);
    var ux = (pu[0] - o[0]) / R, uy = (pu[1] - o[1]) / R;
    var vx = (pv[0] - o[0]) / R, vy = (pv[1] - o[1]) / R;
    var det = ux * vy - uy * vx;
    if (Math.abs(det) < 0.0006) return;   // steht auf der Kante, kein Gesicht
    // Zeigt die Rueckseite zur Kamera, ist die Abbildung spiegelverkehrt.
    // Bei Ringen faellt das nicht auf, bei Schrift sofort - deshalb wird
    // die Laufrichtung hier bestimmt und nicht aus dem Drehwinkel geraten.
    var sp = det < 0 ? -1 : 1;

    ctx.save();
    ctx.transform(ux, uy, vx, vy, o[0], o[1]);
    // Ab hier wird in Muenzkoordinaten gezeichnet: Mittelpunkt 0, Rand R.

    // Wohin zeigt das Licht innerhalb der Flaeche? Aus dieser Richtung
    // kommen alle Lichtkanten der Praegungen.
    var lu = LX * ux + LY * (-uy), lv = LX * vx + LY * (-vy);
    var ll = Math.sqrt(lu * lu + lv * lv) || 1;
    lu /= ll; lv /= ll;
    var relief = 3.2;

    // Grundton: Verlauf entlang der Lichtrichtung, wandert also mit.
    var g = ctx.createLinearGradient(-lu * R, -lv * R, lu * R, lv * R);
    g.addColorStop(0, "#dfe5f2");
    g.addColorStop(0.32, "#b3bccf");
    g.addColorStop(0.60, "#7c8599");
    g.addColorStop(0.86, "#4d5568");
    g.addColorStop(1, "#363d4c");
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // Vertieftes Innenfeld: dunkler Kern, damit der Wulst am Rand traegt.
    var gi = ctx.createRadialGradient(lu * R * 0.3, lv * R * 0.3, 0, 0, 0, R * 0.88);
    gi.addColorStop(0, "rgba(255,255,255,0.10)");
    gi.addColorStop(1, "rgba(0,0,0,0.30)");
    ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = gi; ctx.fill();

    // Praegung: derselbe Pfad zweimal, dunkel gegen das Licht versetzt und
    // hell zum Licht hin. Das ist der ganze Trick hinter dem Relief.
    function praegen(pfad, breite, staerke) {
      ctx.lineWidth = breite;
      ctx.save();
      ctx.translate(-lu * relief, -lv * relief);
      ctx.strokeStyle = "rgba(10,14,24," + (0.55 * staerke).toFixed(2) + ")";
      pfad(); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(lu * relief * 0.7, lv * relief * 0.7);
      ctx.strokeStyle = "rgba(255,255,255," + (0.72 * staerke).toFixed(2) + ")";
      pfad(); ctx.stroke();
      ctx.restore();
    }
    function kreis(rr) { return function () { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); }; }

    praegen(kreis(R * 0.90), 5, 1);      // Wulst

    // Perlkranz statt zweitem Ring. Konzentrische Ringe plus Kreuzkerben
    // sehen aus wie ein Zahnrad aus der Standardbibliothek - der Perlkranz
    // ist das, was echte gepraegte Muenzen an dieser Stelle haben.
    var perlen = 72, rp = R * 0.845;
    for (var pk = 0; pk < perlen; pk++) {
      var wp = (pk / perlen) * Math.PI * 2;
      var px2 = Math.cos(wp) * rp, py2 = Math.sin(wp) * rp;
      ctx.beginPath();
      ctx.arc(px2 - lu * 1.6, py2 - lv * 1.6, 3.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,14,24,0.42)"; ctx.fill();
      ctx.beginPath();
      ctx.arc(px2 + lu * 1.1, py2 + lv * 1.1, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
    }

    // Motiv: das Buch-Zeichen der Marke, gepraegt. Dieselbe Geometrie wie
    // in logo/buch/zeichen-hell.svg - die beiden Bezierdeckel, hier von
    // Hand in Muenzkoordinaten nachgezogen. Das SVG hat den Ursprung oben
    // links und y nach unten; die Muenzflaeche hat y nach oben, deshalb
    // wird y gespiegelt.
    var LOGO_B = 27.6;                 // Breite des Zeichens im SVG-Feld
    var lf = (R * 0.98) / LOGO_B;      // Zeichen auf knapp Feldbreite
    function lx(x) { return (x - 16) * lf; }
    function ly(y) { return -((y + 0.95) - 16.5) * lf; }

    function deckelVorne() {
      ctx.beginPath();
      ctx.moveTo(lx(14.4), ly(9));
      ctx.bezierCurveTo(lx(10), ly(5.5), lx(6.2), ly(4.6), lx(2.8), ly(5.5));
      ctx.lineTo(lx(2.8), ly(21.5));
      ctx.bezierCurveTo(lx(6.2), ly(20.8), lx(10), ly(21.6), lx(14.4), ly(25.5));
      ctx.closePath();
    }
    function deckelHinten() {
      ctx.beginPath();
      ctx.moveTo(lx(17.6), ly(9));
      ctx.bezierCurveTo(lx(22), ly(5.5), lx(25.8), ly(4.6), lx(29.2), ly(5.5));
      ctx.lineTo(lx(29.2), ly(21.5));
      ctx.bezierCurveTo(lx(25.8), ly(20.8), lx(22), ly(21.6), lx(17.6), ly(25.5));
      ctx.closePath();
    }

    // Erhaben statt eingeritzt: Schlagschatten gegen das Licht, Flaeche,
    // Lichtkante zum Licht hin. Der hintere Deckel bleibt dunkler - auf
    // gepraegtem Metall macht die Tiefe den Unterschied, nicht die Farbe.
    function praegeFlaeche(pfad, ton) {
      ctx.save();
      ctx.translate(-lu * 4.4, -lv * 4.4);
      ctx.fillStyle = "rgba(8,12,20,0.55)";
      pfad(); ctx.fill();
      ctx.restore();

      pfad();
      ctx.fillStyle = ton;
      ctx.fill();

      ctx.save();
      ctx.translate(lu * 1.5, lv * 1.5);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      pfad(); ctx.stroke();
      ctx.restore();
    }
    praegeFlaeche(deckelHinten, "rgba(150,160,182,0.95)");
    praegeFlaeche(deckelVorne, "rgba(214,222,238,0.97)");

    // Umlaufende Schrift wie auf einer gepraegten Muenze: zwei Boegen.
    // Ein durchlaufender Kreis wuerde die untere Haelfte kopfstehen
    // lassen - deshalb steht "MARKET" oben und "PLAYBOOK" unten, und der
    // untere Bogen ist um 180 Grad gedreht, damit er von aussen lesbar ist.
    ctx.font = "500 26px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var rs = R * 0.755;
    function bogen(wort, mittelwinkel, unten) {
      var n2 = wort.length, da = 0.175;
      for (var c2 = 0; c2 < n2; c2++) {
        var versatz = (c2 - (n2 - 1) / 2) * da;
        var wi = mittelwinkel + sp * (unten ? -versatz : versatz);
        ctx.save();
        ctx.translate(Math.cos(wi) * rs, Math.sin(wi) * rs);
        ctx.rotate(wi + Math.PI / 2 + (unten ? Math.PI : 0));
        ctx.scale(sp, 1);                 // spiegelt die Abbildung zurueck
        ctx.fillStyle = "rgba(10,14,24,0.5)";
        ctx.fillText(wort.charAt(c2), -lu * 2.2, -lv * 2.2);
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.fillText(wort.charAt(c2), lu * 1.4, lv * 1.4);
        ctx.restore();
      }
    }
    bogen("MARKET", Math.PI / 2, false);
    bogen("PLAYBOOK", -Math.PI / 2, true);

    // Glanzband: ein schmaler heller Streifen quer ueber das Metall.
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
    var bg = ctx.createLinearGradient(-lu * R, -lv * R, lu * R, lv * R);
    bg.addColorStop(0, "rgba(255,255,255,0)");
    bg.addColorStop(0.34, "rgba(255,255,255,0)");
    bg.addColorStop(0.44, "rgba(255,255,255,0.17)");
    bg.addColorStop(0.5, "rgba(255,255,255,0)");
    bg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();

    // Feine Koernung ueber die ganze Flaeche - gepraegtes Metall ist nie
    // spiegelglatt, und diese Unruhe nimmt dem Bild das Gerechnete.
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.985, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.14;
    ctx.globalCompositeOperation = "overlay";
    var mst = ctx.createPattern(koernung, "repeat");
    ctx.fillStyle = mst;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();

    // Lichtkante am Aussenrand, auf der dem Licht zugewandten Seite.
    var wl = Math.atan2(lv, lu);
    ctx.beginPath();
    ctx.arc(0, 0, R - 1.5, wl - 1.15, wl + 1.15);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.stroke();

    ctx.restore();
  }

  /* ---------- Kennzahlen daneben, gestaffelt mit der Scrollstrecke ---------- */
  function texte(t) {
    for (var i3 = 0; i3 < zeilen.length; i3++) {
      var ab = 0.14 + i3 * 0.16;
      var f = Math.max(0, Math.min(1, (t - ab) / 0.14));
      f = f * f * (3 - 2 * f);
      zeilen[i3].style.opacity = f.toFixed(3);
      zeilen[i3].style.transform = "translateY(" + ((1 - f) * 18).toFixed(2) + "px)";
    }
  }

  function fortschritt() {
    var r = abschnitt.getBoundingClientRect();
    var weg = abschnitt.offsetHeight - window.innerHeight;
    if (weg <= 0) return 0.5;
    var p = -r.top / weg;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  function alles(t) { zeichne(t); texte(t); }

  passe();
  window.addEventListener("resize", function () { passe(); alles(fortschritt()); });
  if (ruhig) {
    zeichne(0.08);
    zeilen.forEach(function (z) { z.style.opacity = 1; z.style.transform = "none"; });
    return;
  }

  var sichtbar = false, offen = false;
  function rahmen() { offen = false; if (sichtbar) alles(fortschritt()); }
  function anstossen() { if (offen) return; offen = true; requestAnimationFrame(rahmen); }
  new IntersectionObserver(function (e) {
    sichtbar = e[0].isIntersecting;
    if (sichtbar) anstossen();
  }, { threshold: 0 }).observe(abschnitt);
  window.addEventListener("scroll", anstossen, { passive: true });
  alles(fortschritt());
})();
