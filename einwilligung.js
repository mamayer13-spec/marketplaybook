/* Cookie-Einwilligung und Meta-Pixel (seit 6.11.2026).
   Das Pixel laedt erst nach "Zustimmen" (§ 25 TDDDG). Vorher geht nichts an Meta.
   Seiten melden eine Eintragung mit window.mpLead(); ohne Zustimmung passiert dabei nichts.
   Widerruf: window.mpEinwilligungAendern(), verlinkt in der Datenschutzerklaerung. */
(function () {
  "use strict";
  var PIXEL = "439334373624197"; // Datensatz "Market Playbook Website", Portfolio The Market Playbook - Fzco
  var SCHLUESSEL = "mp-einwilligung";
  var GUELTIG_MS = 365 * 24 * 60 * 60 * 1000;
  var geladen = false;

  function lesen() {
    try {
      var w = JSON.parse(localStorage.getItem(SCHLUESSEL) || "null");
      if (!w || (w.wert !== "ja" && w.wert !== "nein")) return null;
      if (Date.now() - w.zeit > GUELTIG_MS) return null;
      return w.wert;
    } catch (e) { return null; }
  }
  function schreiben(wert) {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify({ wert: wert, zeit: Date.now() })); } catch (e) {}
  }

  // Meta-Standardcode, nur in eine Funktion gelegt, damit er erst nach der Zustimmung laeuft.
  function pixelLaden() {
    if (geladen) return;
    geladen = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL);
    window.fbq("track", "PageView");
  }

  function eventId() {
    return "lead-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // Eine Eintragung. Die ID gibt die Seite spaeter an den Server weiter, damit Browser- und Serverereignis
  // (Conversions API) als eines zaehlen. Rueckgabe: die ID, auch ohne Zustimmung.
  window.mpLead = function (id) {
    id = id || eventId();
    if (geladen && typeof window.fbq === "function") window.fbq("track", "Lead", {}, { eventID: id });
    return id;
  };

  var STIL =
    ".mp-ew{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:440px;margin-left:auto;" +
    "background:#151821;color:#f0f2f6;border:1px solid rgba(240,242,246,.12);border-radius:14px;padding:18px 18px 16px;" +
    "box-shadow:0 18px 50px rgba(0,0,0,.35);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}" +
    ".mp-ew p{margin:0 0 14px}.mp-ew a{color:#b3c5ff}" +
    ".mp-ew .mp-ew-knoepfe{display:flex;gap:10px}" +
    ".mp-ew button{flex:1;font:inherit;font-weight:600;padding:11px 12px;border-radius:10px;cursor:pointer;" +
    "border:1px solid rgba(240,242,246,.22);background:transparent;color:#f0f2f6}" +
    ".mp-ew button.mp-ew-ja{background:#f0f2f6;color:#0b0d12;border-color:#f0f2f6}";

  function bannerZeigen() {
    if (document.querySelector(".mp-ew")) return;
    var stil = document.createElement("style");
    stil.textContent = STIL;
    document.head.appendChild(stil);
    var box = document.createElement("div");
    box.className = "mp-ew";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Cookie-Einwilligung");
    box.innerHTML =
      "<p>Wir möchten mit dem Meta-Pixel messen, welche Werbung bei uns ankommt. Dafür setzt Meta Cookies, " +
      "und Daten gehen an Meta. Das passiert nur, wenn du zustimmst. Mehr in der <a href=\"/datenschutz\">Datenschutzerklärung</a>.</p>" +
      "<div class=\"mp-ew-knoepfe\"><button type=\"button\" class=\"mp-ew-nein\">Ablehnen</button>" +
      "<button type=\"button\" class=\"mp-ew-ja\">Zustimmen</button></div>";
    // Lief das Pixel schon (Widerruf), laedt die Seite neu, damit es nicht weiterlaeuft.
    box.querySelector(".mp-ew-nein").addEventListener("click", function () { schreiben("nein"); box.remove(); if (geladen) location.reload(); });
    box.querySelector(".mp-ew-ja").addEventListener("click", function () { schreiben("ja"); box.remove(); pixelLaden(); });
    document.body.appendChild(box);
  }

  // Zeigt die Auswahl erneut, egal was vorher galt.
  window.mpEinwilligungAendern = function () { bannerZeigen(); };

  function start() {
    var w = lesen();
    if (w === "ja") pixelLaden();
    else if (w === null) bannerZeigen();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
