/* WhatsApp-Formular fuer /form und /kurs (9.11.2026, Typeform ist gekuendigt).
   1:1 das Fenster von /aktienwatchlist (Name, E-Mail, WhatsApp-Nummer), hier als eigene Datei, damit es jede Seite
   einbinden kann. Jeder Knopf mit data-wa-formular oeffnet es. Danach geht es zu WhatsApp, immer OHNE Text im Link
   (Startknopf, siehe brain/07-todos/videokurs-per-whatsapp.md). Gespeichert wird ueber
   whatsapp.marketplaybook.de/api/kurs-formular, das legt Close-Lead, Eintragung und Airtable-Sicherung an.

   Einbinden: <script src="/wa-formular.js?v=1" data-angebot="Videokurs" data-artikel="den" data-auf="typeform_opened" data-ab="typeform_completed" defer></script>
   data-auf/data-ab: Namen der Analytics-Ereignisse. /form und /kurs behalten die alten Typeform-Namen, damit die
   Trichterzahlen im Cockpit (Seiten) ohne Bruch weiterlaufen. */
(function () {
  var skript = document.currentScript;
  var ANGEBOT = (skript && skript.getAttribute("data-angebot")) || "Videokurs";
  var ARTIKEL = (skript && skript.getAttribute("data-artikel")) || "den";
  var AUF = (skript && skript.getAttribute("data-auf")) || "formular_geoeffnet";
  var AB = (skript && skript.getAttribute("data-ab")) || "formular_abgeschickt";
  var CSS = "#wa-fenster{width:min(440px,calc(100vw - 28px));padding:30px 26px 22px;border:0;border-radius:28px;color:var(--text);text-align:center;background:radial-gradient(70% 55% at 50% 0%,rgba(114,136,206,.22),transparent 70%),linear-gradient(180deg,#161a26,#0e1017 80%);box-shadow:inset 0 1px 0 rgba(179,197,255,.16),inset 0 0 0 1px rgba(179,197,255,.08),0 40px 100px -24px rgba(0,0,0,.85)}\n#wa-fenster::backdrop{background:rgba(5,6,10,.68);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}\n#wa-fenster[open]{animation:wa-fenster-auf .5s var(--weich)}\n@keyframes wa-fenster-auf{from{opacity:0;transform:translateY(18px) scale(.97)}}\n#wa-fenster .zu{position:absolute;top:12px;right:12px;width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(179,197,255,.08);color:var(--muted);cursor:pointer}\n#wa-fenster .zu:hover{color:var(--text)}\n#wa-fenster h2{font-size:27px;line-height:1.08;margin:6px 22px 8px}\n#wa-fenster .unter-klein{margin:0 0 20px;color:var(--muted);font-size:15px}\n#wa-fenster .feld{display:block;margin-bottom:12px;text-align:left;font-size:13px;font-weight:500;color:var(--muted)}\n#wa-fenster .feld input{display:block;width:100%;margin-top:6px;padding:14px 18px;border:0;border-radius:16px;background:var(--kachel);box-shadow:var(--kante);color:var(--text);font:inherit;font-size:16px;font-weight:400;outline:none;transition:box-shadow .2s}\n#wa-fenster .feld input::placeholder{color:var(--leise)}\n#wa-fenster .feld input:focus{box-shadow:inset 0 0 0 1.5px rgba(179,197,255,.7)}\n#wa-fenster .nummer{display:flex;gap:8px;margin-top:6px}\n#wa-fenster .feld .nummer input{margin-top:0;flex:1;min-width:0}\n#wa-fenster .feld>label{display:block}\n#wa-fenster .vorwahl{position:relative;flex:none;display:flex;align-items:center;gap:6px;padding:0 12px 0 14px;border-radius:16px;background:var(--kachel);box-shadow:var(--kante);color:var(--text);font-size:16px;font-weight:400;white-space:nowrap;transition:box-shadow .2s}\n#wa-fenster .vorwahl svg{color:var(--muted);flex:none}\n#wa-fenster .vorwahl:focus-within{box-shadow:inset 0 0 0 1.5px rgba(179,197,255,.7)}\n#wa-fenster .vorwahl select{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:pointer;border:0}\n#wa-fenster .fehler{display:block;margin-top:6px;font-size:13px;font-weight:400;line-height:1.35;color:#ffb4a8}\n#wa-fenster .senden{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:6px;padding:16px 18px;border:0;border-radius:999px;background:var(--text);color:#0b0d12;font-family:inherit;font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.2;cursor:pointer;transition:transform .3s var(--weich),background .2s,color .2s}\n#wa-fenster .senden svg{flex:none}\n#wa-fenster .senden:hover:not(:disabled){transform:translateY(-2px)}\n#wa-fenster .senden:disabled{background:var(--kachel-2);color:var(--leise);cursor:not-allowed}\n#wa-fenster .klein-rechts{margin:14px 0 0;font-family:\"IBM Plex Mono\",monospace;font-size:11px;color:var(--leise)}";
  var HTML = "<dialog id=\"wa-fenster\" aria-labelledby=\"wa-fenster-titel\">\n  <button type=\"button\" class=\"zu\" id=\"wa-schliessen\" aria-label=\"Schlie\u00dfen\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M18 6 6 18M6 6l12 12\"/></svg></button>\n  <h2 id=\"wa-fenster-titel\">Wohin d\u00fcrfen wir dir __ARTIKEL__ <span class=\"verlauf\">__ANGEBOT__</span> schicken?</h2>\n  <p class=\"unter-klein\">Du bekommst __PRONOMEN__ direkt per WhatsApp.</p>\n  <form id=\"wa-formular\" novalidate>\n    <label class=\"feld\">Dein Vorname\n      <input id=\"wa-name\" name=\"name\" type=\"text\" autocomplete=\"given-name\" autocapitalize=\"words\" placeholder=\"Vorname\" required aria-describedby=\"wa-name-fehler\" />\n      <span class=\"fehler\" id=\"wa-name-fehler\" role=\"alert\" hidden></span>\n    </label>\n    <label class=\"feld\">Deine E-Mail\n      <input id=\"wa-email\" name=\"email\" type=\"email\" autocomplete=\"email\" inputmode=\"email\" placeholder=\"name@beispiel.de\" required aria-describedby=\"wa-email-fehler\" />\n      <span class=\"fehler\" id=\"wa-email-fehler\" role=\"alert\" hidden></span>\n    </label>\n    <div class=\"feld\">\n      <label for=\"wa-telefon\">Deine WhatsApp-Nummer</label>\n      <div class=\"nummer\">\n        <span class=\"vorwahl\">\n          <span id=\"wa-vorwahl-text\" aria-hidden=\"true\">\ud83c\udde9\ud83c\uddea +49</span>\n          <svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m6 9 6 6 6-6\"/></svg>\n          <select id=\"wa-land\" aria-label=\"L\u00e4ndervorwahl\" autocomplete=\"off\"></select>\n        </span>\n        <input id=\"wa-telefon\" name=\"telefon\" type=\"tel\" autocomplete=\"tel\" inputmode=\"tel\" placeholder=\"170 234 5678\" required aria-describedby=\"wa-telefon-fehler\" />\n      </div>\n      <span class=\"fehler\" id=\"wa-telefon-fehler\" role=\"alert\" hidden></span>\n    </div>\n    <!-- Falle fuer Bots: Menschen sehen das Feld nicht. -->\n    <input id=\"wa-webseite\" name=\"webseite\" type=\"text\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\" style=\"position:absolute;left:-9999px;width:1px;height:1px;opacity:0\" />\n    <button type=\"submit\" class=\"senden\" id=\"wa-senden\" disabled>\n      <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3a2.6 2.6 0 0 0-.8 1.9 4.5 4.5 0 0 0 1 2.4 10.3 10.3 0 0 0 4 3.5c1.5.6 2 .7 2.7.6.4-.1 1.5-.6 1.7-1.2s.2-1 .1-1.1-.2-.1-.4-.2Z\"/></svg>\n      Schick mir __ARTIKEL__ __ANGEBOT__ per WhatsApp\n    </button>\n    <p class=\"klein-rechts\">Es gilt unsere <a href=\"/datenschutz.html\" target=\"_blank\" rel=\"noopener\">Datenschutzerkl\u00e4rung</a>.</p>\n  </form>\n</dialog>".split("__ANGEBOT__").join(ANGEBOT).split("__ARTIKEL__").join(ARTIKEL).split("__PRONOMEN__").join(ARTIKEL === "die" ? "sie" : ARTIKEL === "das" ? "es" : "ihn");

  function los() {
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    var huelle = document.createElement("div");
    huelle.innerHTML = HTML;
    document.body.appendChild(huelle.firstElementChild);
    start();
  }

  function start() {
  var NUMMER = "436706511976";
  var fenster = document.getElementById("wa-fenster");
  var name = document.getElementById("wa-name");
  var email = document.getElementById("wa-email");
  var telefon = document.getElementById("wa-telefon");
  var land = document.getElementById("wa-land");
  /* Kuerzel, Name, Vorwahl. Die Vorwahlen sind praefixfrei, deshalb laesst sich eine eingetippte +... eindeutig zuordnen. */
  var LAENDER = "AF,Afghanistan,93;AL,Albanien,355;DZ,Algerien,213;AD,Andorra,376;AO,Angola,244;AR,Argentinien,54;AM,Armenien,374;AZ,Aserbaidschan,994;ET,Äthiopien,251;AU,Australien,61;BH,Bahrain,973;BD,Bangladesch,880;BE,Belgien,32;BJ,Benin,229;BO,Bolivien,591;BA,Bosnien und Herzegowina,387;BR,Brasilien,55;BG,Bulgarien,359;CL,Chile,56;CN,China,86;CR,Costa Rica,506;DK,Dänemark,45;DO,Dominikanische Republik,1;EC,Ecuador,593;EG,Ägypten,20;EE,Estland,372;FI,Finnland,358;FR,Frankreich,33;GE,Georgien,995;GH,Ghana,233;GR,Griechenland,30;GB,Großbritannien,44;IN,Indien,91;ID,Indonesien,62;IQ,Irak,964;IR,Iran,98;IE,Irland,353;IS,Island,354;IL,Israel,972;IT,Italien,39;JP,Japan,81;JO,Jordanien,962;KH,Kambodscha,855;CM,Kamerun,237;CA,Kanada,1;KZ,Kasachstan,7;QA,Katar,974;KE,Kenia,254;CO,Kolumbien,57;XK,Kosovo,383;HR,Kroatien,385;KW,Kuwait,965;LV,Lettland,371;LB,Libanon,961;LI,Liechtenstein,423;LT,Litauen,370;LU,Luxemburg,352;MY,Malaysia,60;MV,Malediven,960;MT,Malta,356;MA,Marokko,212;MU,Mauritius,230;MX,Mexiko,52;MD,Moldau,373;MC,Monaco,377;ME,Montenegro,382;NP,Nepal,977;NZ,Neuseeland,64;NL,Niederlande,31;NG,Nigeria,234;MK,Nordmazedonien,389;NO,Norwegen,47;OM,Oman,968;PK,Pakistan,92;PA,Panama,507;PE,Peru,51;PH,Philippinen,63;PL,Polen,48;PT,Portugal,351;RO,Rumänien,40;RU,Russland,7;SM,San Marino,378;SA,Saudi-Arabien,966;SE,Schweden,46;SN,Senegal,221;RS,Serbien,381;SG,Singapur,65;SK,Slowakei,421;SI,Slowenien,386;ES,Spanien,34;LK,Sri Lanka,94;ZA,Südafrika,27;KR,Südkorea,82;TW,Taiwan,886;TZ,Tansania,255;TH,Thailand,66;CZ,Tschechien,420;TN,Tunesien,216;TR,Türkei,90;UG,Uganda,256;UA,Ukraine,380;HU,Ungarn,36;UY,Uruguay,598;US,USA,1;UZ,Usbekistan,998;VE,Venezuela,58;AE,Vereinigte Arabische Emirate,971;VN,Vietnam,84;CY,Zypern,357".split(";").map(function (z) { var t = z.split(","); return { k: t[0], n: t[1], v: t[2] }; });
  var VORNE = [{ k: "DE", n: "Deutschland", v: "49" }, { k: "AT", n: "Österreich", v: "43" }, { k: "CH", n: "Schweiz", v: "41" }];
  function flagge(k) { return String.fromCodePoint(k.charCodeAt(0) + 127397, k.charCodeAt(1) + 127397); }
  function zeile(l) { var o = document.createElement("option"); o.value = l.k; o.textContent = flagge(l.k) + " " + l.n + " +" + l.v; land.appendChild(o); }
  VORNE.forEach(zeile);
  var trenner = document.createElement("option"); trenner.disabled = true; trenner.textContent = "──────────"; land.appendChild(trenner);
  LAENDER.forEach(zeile);
  var ALLE = VORNE.concat(LAENDER);
  function landDaten(k) { return ALLE.filter(function (l) { return l.k === k; })[0]; }
  var MUSTER = { DE: "170 234 5678", AT: "664 234 5678", CH: "79 234 56 78" };
  /* Laengen der Bloecke, der letzte Block nimmt den Rest. Eine fuehrende 0 gehoert zum ersten Block. */
  var BLOECKE = { CH: [2, 3, 2, 2] };
  function landSetzen(k) {
    var l = landDaten(k);
    if (!l) return;
    land.value = k;
    document.getElementById("wa-vorwahl-text").textContent = flagge(k) + " +" + l.v;
    telefon.placeholder = MUSTER[k] || "Handynummer";
  }
  function trennen(ziffern) {
    var teile = (BLOECKE[land.value] || [3, 3, 4]).slice();
    if (ziffern.charAt(0) === "0") teile[0]++;
    var aus = [], i = 0, b = 0;
    while (i < ziffern.length) {
      var n = b < teile.length ? teile[b] : 4;
      aus.push(ziffern.slice(i, i + n));
      i += n; b++;
    }
    return aus.join(" ");
  }
  /* Bringt das Feld in Form: Vorwahl aus dem Getippten in die Auswahl, Ziffern in Bloecke. Der Cursor bleibt hinter derselben Ziffer. */
  function ordnen() {
    var roh = telefon.value;
    var v = roh.trim().replace(/\(0\)/g, "");
    var intl = v.charAt(0) === "+" ? v.slice(1).replace(/\D/g, "") : /^00/.test(v.replace(/\D/g, "")) ? v.replace(/\D/g, "").slice(2) : null;
    if (intl !== null) {
      var bevorzugt = ALLE.filter(function (l) { return intl.indexOf(l.v) === 0; });
      /* Dieselbe Vorwahl (USA und Kanada): Eine schon passende Auswahl bleibt stehen. */
      var treffer = bevorzugt.filter(function (l) { return l.k === land.value; })[0] || bevorzugt.filter(function (l) { return l.k === "US" || l.k === "RU"; })[0] || bevorzugt[0];
      if (!treffer) return;
      landGewaehlt = true;
      landSetzen(treffer.k);
      v = intl.slice(treffer.v.length);
    }
    var ziffern = v.replace(/\D/g, "");
    /* Am Handyanfang eindeutig: 0664 ist Oesterreich, auch wenn die IP etwas anderes sagt. */
    if (/^06[5-9]/.test(ziffern) && land.value !== "AT") { landGewaehlt = true; landSetzen("AT"); }
    else if (/^01[567]/.test(ziffern) && land.value !== "DE") { landGewaehlt = true; landSetzen("DE"); }
    else if (/^07[5-9]/.test(ziffern) && land.value !== "CH") { landGewaehlt = true; landSetzen("CH"); }
    var neu = trennen(ziffern);
    if (neu === roh) return;
    var cursor = telefon.selectionStart == null ? roh.length : telefon.selectionStart;
    var davor = intl !== null ? ziffern.length : roh.slice(0, cursor).replace(/\D/g, "").length;
    telefon.value = neu;
    var pos = 0, gezaehlt = 0;
    while (pos < neu.length && gezaehlt < davor) { if (/\d/.test(neu.charAt(pos))) gezaehlt++; pos++; }
    if (davor >= ziffern.length) pos = neu.length;
    try { telefon.setSelectionRange(pos, pos); } catch (e) {}
  }
  function nummerVoll() {
    var z = telefon.value.replace(/\D/g, "").replace(/^0+/, "");
    return "+" + landDaten(land.value).v + z;
  }
  var landGewaehlt = false;
  var sprache = ((navigator.language || "").split("-")[1] || "").toUpperCase();
  landSetzen(landDaten(sprache) ? sprache : "DE");
  land.addEventListener("change", function () { landGewaehlt = true; landSetzen(land.value); ordnen(); pruefe(); telefon.focus(); });
  /* Das Land aus der IP. Klappt das nicht, bleibt es bei der Browsersprache. Eine eigene Wahl ueberschreibt es nie. */
  (function () {
    var ende = new AbortController();
    setTimeout(function () { ende.abort(); }, 1500);
    fetch("https://whatsapp.marketplaybook.de/api/land", { signal: ende.signal }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.land && !landGewaehlt && !telefon.value.trim()) landSetzen(d.land);
    }).catch(function () {});
  })();
  var senden = document.getElementById("wa-senden");
  function melde(n) { if (typeof window.va === "function") window.va("event", { name: n }); }
  /* Pruefung im Browser: fangt Tippfehler und offensichtlich Erfundenes ab. Ob es das Postfach wirklich gibt, kann
     sie nicht wissen; die Pruefung der Domain auf dem Server kommt mit dem Speichern dazu. */
  var WEGWERF = ["mailinator.com","guerrillamail.com","guerrillamail.de","10minutemail.com","10minutemail.net","tempmail.com","temp-mail.org","temp-mail.de","trashmail.com","trashmail.de","wegwerfemail.de","wegwerfmail.de","yopmail.com","sharklasers.com","getnada.com","throwawaymail.com","maildrop.cc","dispostable.com","fakeinbox.com","spam4.me","emailondeck.com","muell.email"];
  var TIPPFEHLER = {"gmial.com":"gmail.com","gmai.com":"gmail.com","gmal.com":"gmail.com","gmail.de":"gmail.com","gmail.co":"gmail.com","gmail.con":"gmail.com","googlemail.de":"googlemail.com","gmx.con":"gmx.de","gmx.dee":"gmx.de","web.dee":"web.de","web.con":"web.de","wbe.de":"web.de","outlok.com":"outlook.com","outlook.con":"outlook.com","hotmial.com":"hotmail.com","hotmail.con":"hotmail.com","icloud.con":"icloud.com","icoud.com":"icloud.com","yaho.com":"yahoo.com","yahoo.con":"yahoo.com","t-onlin.de":"t-online.de","tonline.de":"t-online.de"};
  var ERFUNDEN = /^(test|tester|testen|asdf|asd|qwert|qwertz|qwerty|abc|abcd|aaa|xxx|xyz|fake|keine|keiner|nein|no|none|null|name|email|mail|muster|mustermann|max\.?mustermann)\d*$/i;
  var BEISPIEL = /^(beispiel|example|test|domain|email|mail|abc|xyz)\.[a-z.]+$/i;
  function nameFehler(wert) {
    var v = wert.trim();
    if (!/\p{L}.*\p{L}/u.test(v)) return "Bitte gib deinen Vornamen ein.";
    if (/[@\d]|https?:|www\./i.test(v)) return "Bitte gib deinen echten Vornamen ein.";
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(v)) return "Bitte nur Buchstaben.";
    var worte = v.toLowerCase().split(/\s+/);
    /* Max allein ist ein echter Name, nur „Max Mustermann" nicht. */
    if (v.toLowerCase() === "max mustermann" || worte.every(function (w) { return /^(test|tester|asdf|abc|xxx|name|keine|fake|muster|mustermann)$/.test(w); })) return "Bitte gib deinen echten Vornamen ein.";
    if (/^(.)\1+$/.test(v.replace(/\s/g, "").toLowerCase())) return "Bitte gib deinen echten Vornamen ein.";
    return "";
  }
  function mailFehler(wert) {
    var v = wert.trim().toLowerCase();
    if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v) || /\.\./.test(v) || v.length > 254) return "Das sieht nicht nach einer gültigen E-Mail aus.";
    var teile = v.split("@");
    if (TIPPFEHLER[teile[1]]) return "Meinst du " + teile[0] + "@" + TIPPFEHLER[teile[1]] + "?";
    if (WEGWERF.indexOf(teile[1]) >= 0) return "Bitte nutze deine richtige E-Mail, keine Wegwerf-Adresse.";
    if (ERFUNDEN.test(teile[0]) || BEISPIEL.test(teile[1])) return "Bitte gib deine echte E-Mail ein.";
    return "";
  }
  /* Dieselbe Regel wie auf dem Server (telefonNormal in marketplaybook-whatsapp/lib/kurs-formular.ts). */
  function telefonFehler(wert) {
    var roh = wert.trim().replace(/\(0\)/g, "");
    var meldung = "Das sieht nicht nach einer Handynummer aus. Stimmen Vorwahl und Nummer?";
    if (!/^\+?[\d\s()\/.-]+$/.test(roh)) return meldung;
    var z = roh.replace(/\D/g, ""), n;
    if (roh.charAt(0) === "+") n = z;
    else if (z.indexOf("00") === 0) n = z.slice(2);
    else if (/^06[5-9]/.test(z)) n = "43" + z.slice(1);
    else if (/^01[567]/.test(z)) n = "49" + z.slice(1);
    else if (/^07[5-9]/.test(z)) n = "41" + z.slice(1);
    else return meldung;
    n = n.replace(/^(43|49|41)0/, "$1");
    if (!/^[1-9]\d{9,14}$/.test(n) || /(\d)\1{6,}/.test(n) || /1234567|7654321/.test(n)) return meldung;
    return "";
  }
  function zeige(id, text) {
    var el = document.getElementById(id);
    el.textContent = text;
    el.hidden = !text;
  }
  /* Waehrend des Abschickens bleibt der Knopf gesperrt: Zwei Formulare derselben Person wuerden sich gegenseitig blockieren. */
  var sendet = false;
  function pruefeNichtFehler() { sendet = false; senden.disabled = false; }
  function gueltig() { return !nameFehler(name.value) && !mailFehler(email.value) && !telefonFehler(nummerVoll()); }
  /* Waehrend des Tippens sperrt nur der Knopf. Die Meldung kommt erst beim Verlassen des Feldes, sonst schimpft
     die Seite schon beim ersten Buchstaben. Ist der Fehler behoben, verschwindet sie sofort. */
  function pruefe() {
    if (sendet) return;
    ordnen();
    senden.disabled = !gueltig();
    if (!nameFehler(name.value)) zeige("wa-name-fehler", "");
    if (!mailFehler(email.value)) zeige("wa-email-fehler", "");
    if (!telefonFehler(nummerVoll())) zeige("wa-telefon-fehler", "");
  }
  name.addEventListener("blur", function () { if (name.value.trim()) zeige("wa-name-fehler", nameFehler(name.value)); });
  email.addEventListener("blur", function () { if (email.value.trim()) zeige("wa-email-fehler", mailFehler(email.value)); });
  telefon.addEventListener("blur", function () { if (telefon.value.trim()) zeige("wa-telefon-fehler", telefonFehler(nummerVoll())); });
  /* Speichert Name, E-Mail und Nummer. Hakt der Server, geht es trotzdem weiter zu WhatsApp: Die Nummer ist mehr wert als
     das Formular. Nur eine klare Absage (422) haelt an, dann steht unter dem Feld, was nicht passt. */
  function speichern(daten) {
    var ende = new AbortController();
    var uhr = setTimeout(function () { ende.abort(); }, 2500);
    return fetch("https://whatsapp.marketplaybook.de/api/kurs-formular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(daten),
      signal: ende.signal,
    }).then(function (r) {
      clearTimeout(uhr);
      if (r.status !== 422) return true;
      return r.json().then(function (d) {
        zeige(d.feld === "name" ? "wa-name-fehler" : d.feld === "telefon" ? "wa-telefon-fehler" : "wa-email-fehler", d.fehler || "Bitte prüfe deine Eingabe.");
        return false;
      });
    }).catch(function () { clearTimeout(uhr); return true; });
  }

  window.waFormularOeffnen = function () { fenster.showModal(); melde(AUF); setTimeout(function () { name.focus(); }, 50); };
  document.addEventListener("click", function (e) {
    var k = e.target && e.target.closest && e.target.closest("[data-wa-formular]");
    if (!k) return;
    e.preventDefault();
    window.waFormularOeffnen();
  });
  document.getElementById("wa-schliessen").addEventListener("click", function () { fenster.close(); });
  fenster.addEventListener("click", function (e) { if (e.target === fenster) fenster.close(); });
  /* Das automatische Ausfuellen am Handy meldet sich nicht immer als Eingabe, dann bliebe der Knopf gesperrt, obwohl
     alles dasteht. Deshalb zusaetzlich die anderen Ereignisse und ein kurzer Blick, solange das Fenster offen ist. */
  ["input", "change", "keyup", "blur"].forEach(function (art) {
    name.addEventListener(art, pruefe);
    email.addEventListener(art, pruefe);
    telefon.addEventListener(art, pruefe);
  });
  setInterval(function () { if (fenster.open) pruefe(); }, 400);
  document.getElementById("wa-formular").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!gueltig()) return;
    /* Ohne ?text=: Mit Text gaebe es den Startknopf nicht, die Nachricht stuende fertig im Eingabefeld. */
    var ziel = "https://wa.me/" + NUMMER;
    if (sendet) return;
    sendet = true;
    senden.disabled = true;
    /* Gleiche ID fuer Pixel und Server, damit Meta Browser- und Serverereignis spaeter als eines zaehlt. */
    var leadId = "lead-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    speichern({ name: name.value.trim(), email: email.value.trim(), telefon: nummerVoll(), webseite: document.getElementById("wa-webseite").value, suche: location.search, lead_id: leadId }).then(function (weiter) {
      if (!weiter) { pruefeNichtFehler(); return; }
      melde(AB);
      /* Das Pixel braucht einen Moment zum Senden, bevor die Seite zu WhatsApp wechselt. */
      var pixel = typeof window.fbq === "function";
      if (window.mpLead) window.mpLead(leadId);
      setTimeout(function () { location.href = ziel; }, pixel ? 350 : 0);
    });
  });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los);
  else los();
})();
