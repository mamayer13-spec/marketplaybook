#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Regel-Audit fuer das Erfahrungs-Portal auf marketplaybook.de.
# Erwartung: jede Zeile endet mit OK.
#
# Die Regeln stehen in brain/06-knowledge/SEO/erfahrungs-portal-spec.md.
# Kurzfassung, warum es dieses Skript gibt: Das Portal gehoert offen dem
# Anbieter. Genau deshalb darf es keine Pruefinstanz vortaeuschen, keine
# erfundenen Stimmen zeigen und keine unbelegten Renditezahlen tragen —
# das waere im Umfeld einer BaFin-Warnliste die angreifbarste Stelle der
# ganzen Domain. Statisches HTML hat kein Test-Framework, dieses Skript
# ist der Ersatz.
#
# ACHTUNG: Wer eine Pruefung gruen macht, indem er den Hinweis-Banner
# oder den Risikohinweis entfernt, dreht den Zweck um. Beide sind Pflicht.
# ══════════════════════════════════════════════════════════════════════
set -u
cd "$(dirname "$0")" || exit 1
fehler=0
pruef() { # name  erwartet  istwert
  if [ "$2" = "$3" ]; then printf '%-54s OK\n' "$1"
  else printf '%-54s FEHLER (erwartet %s, ist %s)\n' "$1" "$2" "$3"; fehler=1; fi
}

# Nur den sichtbaren Text einer Seite ausgeben: Kommentare und Tags raus.
# sed reicht dafuer nicht — es arbeitet zeilenweise, mehrzeilige
# HTML-Kommentare ueberleben und schleppen ihr "<!--" in den Text.
text() { perl -0777 -pe 's/<!--.*?-->//gs; s/<script.*?<\/script>//gs; s/<[^>]*>/ /gs' "$1"; }

# Alle Portalseiten. Waechst mit jeder Aufgabe des Umsetzungsplans.
seiten="erfahrungen"

# ── Regeln, die auf JEDER Portalseite gelten ─────────────────────────
for s in $seiten; do
  f="$s/index.html"
  if [ ! -f "$f" ]; then
    printf '%-54s FEHLER (Datei fehlt)\n' "$s"; fehler=1; continue
  fi
  pruef "$s: Hinweis-Banner" 1 \
    "$(grep -c '28 Capital Architecture LLC betrieben' "$f")"
  pruef "$s: Risikohinweis im Fuss" 1 "$(grep -c 'Totalverlust' "$f")"
  # "Mindestens einmal", nicht "genau einmal": Der Fussbereich verlinkt beide
  # Pflichtseiten, im Fliesstext darf zusaetzlich darauf verwiesen werden.
  pruef "$s: Impressum verlinkt" 1 \
    "$([ "$(grep -c 'href="/impressum"' "$f")" -ge 1 ] && echo 1 || echo 0)"
  pruef "$s: Datenschutz verlinkt" 1 \
    "$([ "$(grep -c 'href="/datenschutz"' "$f")" -ge 1 ] && echo 1 || echo 0)"
  pruef "$s: kein AggregateRating" 0 \
    "$(grep -ci 'aggregateRating\|"@type": *"Review"' "$f")"
  pruef "$s: keine Pruefinstanz behauptet" 0 \
    "$(grep -ciE 'wir haben getestet|redaktionell unabhängig|unabhängiges (verbraucher|magazin)|redaktionell geprüft' "$f")"
  pruef "$s: kein Betrug" 0 "$(grep -ci 'betrug' "$f")"
  pruef "$s: keine englischen Begriffe" 0 \
    "$(grep -ciE 'track record|>offer<|journey|mindset' "$f")"
  pruef "$s: keine Google-Schriften" 0 \
    "$(grep -c '//fonts\.googleapis\|//fonts\.gstatic' "$f")"
  pruef "$s: kein Analytics" 0 \
    "$(grep -ciE 'gtag|googletagmanager|fbq|facebook\.net|hotjar' "$f")"
  # Trust-Seiten siezen oder formulieren unpersoenlich. Ein Magazin duzt
  # nicht — und die Startseite duzt, was den Bruch erst sichtbar macht.
  pruef "$s: keine Du-Ansprache" 0 \
    "$(text "$f" \
       | grep -oiE '\b(du|dir|dich|dein|deine|deinem|deinen|deiner|deines)\b' \
       | wc -l | tr -d ' ')"
  # Wer "Erfahrungen" sucht, ist skeptisch. Begeisterung im Text
  # verstaerkt die Skepsis, statt sie aufzuloesen.
  pruef "$s: kein Ausrufezeichen im Text" 0 \
    "$(text "$f" | grep -c '!')"
  # Die drei vorhandenen Fotos gehoeren nicht in den Trust-Bereich:
  # Spiegel-Selfie im Hotelflur, Villa mit Infinity-Pool, Strandclub mit
  # Sonnenbrille. Das Pool-Motiv auf einer "serioes"-Seite ist das Bild,
  # das ein Kritiker als Erstes herausgreift. Erst ersetzen, dann nutzen.
  # Auf src= eingegrenzt, nicht auf den blossen Dateinamen: Der Kommentar
  # im Quelltext, der erklaert WARUM die Bilder fehlen, nennt sie selbst.
  pruef "$s: keine ungeeigneten Fotos" 0 \
    "$(grep -cE 'src="[^"]*(claudio-1\.jpg|claudio-2\.jpg|claudio-fuersatz\.webp)' "$f")"
done

# ── /erfahrungen ─────────────────────────────────────────────────────
if [ -f erfahrungen/index.html ]; then
  e=erfahrungen/index.html
  pruef "erfahrungen: Organization-Schema" 1 "$(grep -c '"@type": *"Organization"' $e)"
  pruef "erfahrungen: BreadcrumbList" 1 "$(grep -c '"@type": *"BreadcrumbList"' $e)"
  pruef "erfahrungen: FAQPage" 1 "$(grep -c '"@type": *"FAQPage"' $e)"
  pruef "erfahrungen: acht FAQ-Fragen" 8 "$(grep -c '"@type": *"Question"' $e)"
  # Der Verlust ist der glaubwuerdigste Teil der Seite. Wer ihn streicht,
  # streicht den Grund, warum jemand dem Rest glaubt.
  pruef "erfahrungen: 111.000-Verlust genannt" 1 \
    "$([ "$(grep -c '111.000' $e)" -ge 1 ] && echo 1 || echo 0)"
  pruef "erfahrungen: KWG-Abgrenzung" 1 "$(grep -c 'keine Anlageberatung nach KWG' $e)"
  # Es liegen keine freigegebenen Teilnehmerstimmen vor. Ein Zitat-Block
  # hier hiesse, dass jemand welche erfunden hat.
  pruef "erfahrungen: kein Teilnehmerzitat" 0 "$(grep -c 'quote-box' $e)"
  pruef "erfahrungen: hoechstens ein Angebots-Link" 1 \
    "$([ "$(grep -c 'href="/form"' $e)" -le 1 ] && echo 1 || echo 0)"
  # Der spekulative Anteil des Angebots wird benannt, nicht verschwiegen.
  # Eine "Ist das serioes?"-Seite, die ihn auslaesst, ist genau dort
  # angreifbar, wo sie stark sein soll.
  pruef "erfahrungen: spekulativer Teil benannt" 1 \
    "$([ "$(grep -ci 'spekulativ' $e)" -ge 1 ] && echo 1 || echo 0)"
fi

# ── Regeln fuer das Fundament ────────────────────────────────────────
pruef "portal.css vorhanden" 1 "$([ -f portal.css ] && echo 1 || echo 0)"
pruef "Schriften lokal" 5 "$(ls fonts/*.woff2 2>/dev/null | wc -l | tr -d ' ')"
# Kein "|| echo 0" hier: grep -c gibt bei null Treffern brav "0" aus und
# beendet sich trotzdem mit Code 1 — der Fallback haengte ein zweites "0" an.
pruef "portal.css laedt keine Fremdschriften" 0 \
  "$(grep -c '//fonts\.googleapis\|//fonts\.gstatic' portal.css 2>/dev/null)"

echo
anzahl=$(echo $seiten | wc -w | tr -d ' ')
if [ $fehler -eq 0 ]; then
  echo "Alle Pruefungen bestanden ($anzahl Seiten)."
else
  echo "Mindestens eine Pruefung ist fehlgeschlagen."
fi
exit $fehler
