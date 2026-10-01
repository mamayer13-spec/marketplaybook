/* Portal: markiert in der Inhaltsleiste den Abschnitt, der gerade gelesen
   wird, und klappt eine Frage auf, wenn ein Link direkt auf sie zeigt.
   Ohne dieses Skript funktioniert die Seite vollstaendig — es ist Komfort. */
(function () {
  var links = document.querySelectorAll(".toc a");
  if (!links.length || !("IntersectionObserver" in window)) return;
  var nach = {};
  links.forEach(function (a) { nach[a.getAttribute("href").slice(1)] = a; });
  var aktiv = null;
  /* Sichtbereich auf einen Streifen im oberen Drittel zusammengezogen:
     aktiv ist die Ueberschrift, die ihn zuletzt gekreuzt hat. */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      if (aktiv) aktiv.classList.remove("aktiv");
      aktiv = nach[e.target.id];
      if (aktiv) aktiv.classList.add("aktiv");
    });
  }, { rootMargin: "-15% 0px -70% 0px" });
  document.querySelectorAll(".article h2[id]").forEach(function (h) { io.observe(h); });
})();
