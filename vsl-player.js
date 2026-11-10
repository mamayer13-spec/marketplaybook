/* Eigener Video-Player statt Vidalytics (seit 11.11.2026).
   Einbau: <div class="mp-player" data-src="…mp4" data-poster="…jpg" data-name="vsl_lang"></div>
           <script defer src="/vsl-player.js?v=1"></script>
   Messung über Vercel Web Analytics (cookiefrei, wie cta_klick):
     video_start  {video}            beim ersten Abspielen
     video_stand  {video, prozent}   bei 25 / 50 / 75 / 95 %
   Merkt sich die Stelle im Browser, damit man beim nächsten Besuch weiterschauen kann. */
(function () {
  var css = "" +
    ".mp-player{position:relative;width:100%;aspect-ratio:16/9;background:#0c0e13;color:#fff;font-family:inherit;user-select:none;-webkit-user-select:none;overflow:hidden}" +
    ".mp-player video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;display:block}" +
    ".mp-start{position:absolute;inset:0;display:grid;place-items:center;border:0;padding:0;margin:0;cursor:pointer;background:linear-gradient(180deg,rgba(10,14,24,.05),rgba(10,14,24,.45));color:#fff;font:inherit}" +
    ".mp-start-knopf{display:flex;flex-direction:column;align-items:center;gap:12px}" +
    ".mp-start-kreis{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:#3860EA;box-shadow:0 0 0 10px rgba(56,96,234,.25),0 20px 60px -10px rgba(56,96,234,.7);transition:transform .25s}" +
    ".mp-start:hover .mp-start-kreis{transform:scale(1.06)}" +
    ".mp-start-kreis svg{width:36px;height:36px;margin-left:5px}" +
    ".mp-start-text{font-size:15px;font-weight:600;padding:7px 14px;border-radius:999px;background:rgba(10,14,24,.7);backdrop-filter:blur(6px)}" +
    ".mp-leiste{position:absolute;left:0;right:0;bottom:0;padding:26px 14px 10px;display:flex;align-items:center;gap:10px;background:linear-gradient(0deg,rgba(0,0,0,.7),transparent);opacity:0;transition:opacity .25s}" +
    ".mp-player.laeuft-nicht .mp-leiste,.mp-player.zeigen .mp-leiste{opacity:1}" +
    ".mp-player.unberuehrt .mp-leiste{display:none}" +
    ".mp-k{width:36px;height:36px;flex:none;border:0;border-radius:8px;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;padding:0}" +
    ".mp-k:hover,.mp-k:focus-visible{background:rgba(255,255,255,.14);outline:none}" +
    ".mp-k svg{width:22px;height:22px}" +
    ".mp-zeit{font:500 13px/1 'IBM Plex Mono',ui-monospace,monospace;white-space:nowrap;opacity:.9}" +
    ".mp-bahn{flex:1;height:22px;display:flex;align-items:center;cursor:pointer;touch-action:none}" +
    ".mp-bahn-i{position:relative;width:100%;height:5px;border-radius:5px;background:rgba(255,255,255,.25)}" +
    ".mp-bahn-g{position:absolute;inset:0 auto 0 0;border-radius:5px;background:rgba(255,255,255,.35)}" +
    ".mp-bahn-f{position:absolute;inset:0 auto 0 0;border-radius:5px;background:#3860EA}" +
    ".mp-bahn-f:after{content:'';position:absolute;right:-7px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(56,96,234,.6)}" +
    ".mp-weiter{position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:13px;padding:6px 12px;border-radius:999px;background:rgba(10,14,24,.75);pointer-events:none;white-space:nowrap}" +
    ".mp-laden{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:mp-dreh 1s linear infinite;display:none;pointer-events:none}" +
    ".mp-player.laedt .mp-laden{display:block}" +
    "@keyframes mp-dreh{to{transform:rotate(360deg)}}" +
    "@media (max-width:560px){.mp-start-knopf{gap:8px}.mp-start-kreis{width:56px;height:56px;box-shadow:0 0 0 6px rgba(56,96,234,.25),0 12px 40px -10px rgba(56,96,234,.7)}.mp-start-kreis svg{width:22px;height:22px;margin-left:3px}.mp-start-text{font-size:12px;padding:5px 10px}.mp-leiste{gap:4px;padding:20px 8px 6px}.mp-zeit{font-size:11px}.mp-k.mp-tempo{display:none}}" +
    "@media (prefers-reduced-motion:reduce){.mp-start-kreis,.mp-leiste{transition:none}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1.2"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.2"/></svg>',
    ton: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    stumm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="m16 9 6 6M22 9l-6 6"/></svg>',
    voll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  function zeit(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60), x = s % 60;
    return m + ":" + (x < 10 ? "0" : "") + x;
  }
  function melde(name, data) {
    if (typeof window.va === "function") window.va("event", { name: name, data: data });
  }
  function merk(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function baue(box) {
    var name = box.getAttribute("data-name") || "video";
    var schluessel = "mp-player:" + name;
    box.classList.add("unberuehrt", "laeuft-nicht");
    var v = document.createElement("video");
    v.src = box.getAttribute("data-src");
    if (box.getAttribute("data-poster")) v.poster = box.getAttribute("data-poster");
    v.preload = "metadata"; v.playsInline = true; v.setAttribute("playsinline", "");
    v.setAttribute("controlslist", "nodownload"); v.disablePictureInPicture = false;
    box.appendChild(v);

    var gemerkt = parseFloat(lies(schluessel) || "0");
    var start = document.createElement("button");
    start.type = "button"; start.className = "mp-start";
    start.setAttribute("aria-label", "Video abspielen");
    start.innerHTML = '<span class="mp-start-knopf"><span class="mp-start-kreis">' + I.play + '</span><span class="mp-start-text">' +
      (gemerkt > 20 ? "Weiterschauen ab " + zeit(gemerkt) : "Video ansehen") + "</span></span>";
    box.appendChild(start);

    var laden = document.createElement("div"); laden.className = "mp-laden"; box.appendChild(laden);

    var leiste = document.createElement("div"); leiste.className = "mp-leiste";
    leiste.innerHTML =
      '<button type="button" class="mp-k mp-pp" aria-label="Abspielen">' + I.play + "</button>" +
      '<span class="mp-zeit"><span class="mp-jetzt">0:00</span> / <span class="mp-ges">0:00</span></span>' +
      '<div class="mp-bahn" role="slider" tabindex="0" aria-label="Position im Video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="mp-bahn-i"><div class="mp-bahn-g"></div><div class="mp-bahn-f"></div></div></div>' +
      '<button type="button" class="mp-k mp-tempo" aria-label="Geschwindigkeit" style="width:auto;padding:0 8px;font:600 13px/1 inherit">1×</button>' +
      '<button type="button" class="mp-k mp-ton" aria-label="Ton aus">' + I.ton + "</button>" +
      '<button type="button" class="mp-k mp-voll" aria-label="Vollbild">' + I.voll + "</button>";
    box.appendChild(leiste);
    var pp = leiste.querySelector(".mp-pp"), jetzt = leiste.querySelector(".mp-jetzt"), ges = leiste.querySelector(".mp-ges"),
        bahn = leiste.querySelector(".mp-bahn"), gel = leiste.querySelector(".mp-bahn-g"), fort = leiste.querySelector(".mp-bahn-f"),
        tempo = leiste.querySelector(".mp-tempo"), ton = leiste.querySelector(".mp-ton"), voll = leiste.querySelector(".mp-voll");

    var gestartet = false, gemeldet = {}, ausblenden = null;
    function spiel() {
      if (!gestartet) {
        gestartet = true; box.classList.remove("unberuehrt");
        if (gemerkt > 20 && v.duration && gemerkt < v.duration - 15) v.currentTime = gemerkt;
        else if (gemerkt > 20) { v.addEventListener("loadedmetadata", function () { if (gemerkt < v.duration - 15) v.currentTime = gemerkt; }, { once: true }); }
        melde("video_start", { video: name });
      }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    function umschalten() { if (v.paused || v.ended) spiel(); else v.pause(); }
    function zeigen() {
      box.classList.add("zeigen"); clearTimeout(ausblenden);
      ausblenden = setTimeout(function () { if (!v.paused) box.classList.remove("zeigen"); }, 2500);
    }

    start.addEventListener("click", function () { start.style.display = "none"; spiel(); });
    v.addEventListener("click", function () { umschalten(); zeigen(); });
    pp.addEventListener("click", umschalten);
    box.addEventListener("mousemove", zeigen);
    box.addEventListener("touchstart", zeigen, { passive: true });

    v.addEventListener("play", function () { pp.innerHTML = I.pause; pp.setAttribute("aria-label", "Pause"); box.classList.remove("laeuft-nicht"); zeigen(); });
    v.addEventListener("pause", function () { pp.innerHTML = I.play; pp.setAttribute("aria-label", "Abspielen"); box.classList.add("laeuft-nicht"); merk(schluessel, String(v.currentTime)); });
    v.addEventListener("waiting", function () { box.classList.add("laedt"); });
    ["playing", "canplay", "pause"].forEach(function (e) { v.addEventListener(e, function () { box.classList.remove("laedt"); }); });
    v.addEventListener("loadedmetadata", function () { ges.textContent = zeit(v.duration); });
    /* Die signierte Adresse hinter /api/vsl gilt 12 Stunden. Läuft sie während einer langen
       Pause ab, holt der Player sich einmal eine neue und springt an dieselbe Stelle. */
    var neuGeholt = 0;
    v.addEventListener("error", function () {
      if (neuGeholt > 1 || !gestartet) return;
      neuGeholt++;
      var t = v.currentTime, lief = !v.paused;
      var basis = box.getAttribute("data-src");
      v.src = basis + (basis.indexOf("?") < 0 ? "?" : "&") + "n=" + Date.now();
      v.addEventListener("loadedmetadata", function () { v.currentTime = t; if (lief) spiel(); }, { once: true });
    });
    v.addEventListener("ended", function () { merk(schluessel, null); start.style.display = ""; start.querySelector(".mp-start-text").textContent = "Nochmal ansehen"; gemerkt = 0; });

    var zuletztGemerkt = 0;
    v.addEventListener("timeupdate", function () {
      var d = v.duration || 0, t = v.currentTime;
      jetzt.textContent = zeit(t);
      var pr = d ? t / d * 100 : 0;
      fort.style.width = pr + "%"; bahn.setAttribute("aria-valuenow", Math.round(pr));
      [25, 50, 75, 95].forEach(function (s) {
        if (pr >= s && !gemeldet[s]) { gemeldet[s] = 1; melde("video_stand", { video: name, prozent: s }); }
      });
      if (Math.abs(t - zuletztGemerkt) > 5) { zuletztGemerkt = t; merk(schluessel, String(t)); }
    });
    v.addEventListener("progress", function () {
      if (v.buffered.length && v.duration) gel.style.width = (v.buffered.end(v.buffered.length - 1) / v.duration * 100) + "%";
    });

    function springe(e) {
      var r = bahn.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      if (v.duration) v.currentTime = Math.max(0, Math.min(1, x / r.width)) * v.duration;
    }
    var ziehen = false;
    bahn.addEventListener("pointerdown", function (e) { ziehen = true; bahn.setPointerCapture && bahn.setPointerCapture(e.pointerId); springe(e); });
    bahn.addEventListener("pointermove", function (e) { if (ziehen) springe(e); });
    bahn.addEventListener("pointerup", function () { ziehen = false; });
    bahn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); e.preventDefault(); }
      if (e.key === "ArrowLeft") { v.currentTime = Math.max(0, v.currentTime - 5); e.preventDefault(); }
    });

    var tempi = [1, 1.25, 1.5, 2, 0.75], ti = 0;
    tempo.addEventListener("click", function () { ti = (ti + 1) % tempi.length; v.playbackRate = tempi[ti]; tempo.textContent = String(tempi[ti]).replace(".", ",") + "×"; });
    ton.addEventListener("click", function () {
      v.muted = !v.muted; ton.innerHTML = v.muted ? I.stumm : I.ton; ton.setAttribute("aria-label", v.muted ? "Ton an" : "Ton aus");
    });
    voll.addEventListener("click", function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (box.requestFullscreen) box.requestFullscreen();
      else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); /* iPhone */
    });
    box.addEventListener("keydown", function (e) {
      if (e.target === bahn) return;
      if (e.key === " " || e.key === "k") { if (e.target.tagName !== "BUTTON") { umschalten(); e.preventDefault(); } }
    });
  }

  function los() { Array.prototype.forEach.call(document.querySelectorAll(".mp-player"), baue); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los); else los();
})();
