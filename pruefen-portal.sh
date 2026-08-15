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

# Nur den Artikelteil zwischen <main> und </main>.
# Wichtig fuer alles, was NICHT das Seitengeruest betrifft: Kopf, Portal-
# Leiste und Fuss sind auf jeder Seite identisch und enthalten legitim
# eigene h2-Ueberschriften sowie einen Fuss-Link auf /erfahrungen. Wer
# diese Regeln gegen die ganze Datei laufen laesst, zwingt jede neue Seite
# zu einem eigenen Umbau am gemeinsamen Geruest — und dann sieht jede
# Seite anders aus.
hauptteil() { perl -0777 -ne 'print $1 if /<main[^>]*>(.*?)<\/main>/s' "$1"; }

# Alle Portalseiten. Waechst mit jeder Aufgabe des Umsetzungsplans.
seiten="erfahrungen kosten ist-market-playbook-serioes claudio-fuersatz \
        fuer-wen haeufige-fragen ueber-uns magazin"

# ── Regeln, die auf JEDER Portalseite gelten ─────────────────────────
for s in $seiten; do
  f="$s/index.html"
  if [ ! -f "$f" ]; then
    printf '%-54s FEHLER (Datei fehlt)\n' "$s"; fehler=1; continue
  fi
  # Strukturell geprueft, nicht ueber die Textstelle: Beide Formulierungen
  # duerfen im Fliesstext wieder vorkommen — auf /ist-market-playbook-serioes
  # steht der Betreiber-Satz zu Recht auch in einer FAQ-Antwort. Geprueft
  # wird deshalb, dass es GENAU EINEN Baustein gibt und der Wortlaut steht.
  pruef "$s: Hinweis-Banner vorhanden" 1 "$(grep -c 'class="notice-banner"' "$f")"
  pruef "$s: Banner-Wortlaut" 1 \
    "$([ "$(grep -c '28 Capital Architecture LLC betrieben' "$f")" -ge 1 ] && echo 1 || echo 0)"
  pruef "$s: Risikohinweis im Fuss" 1 "$(grep -c 'class="risiko"' "$f")"
  pruef "$s: Risiko-Wortlaut" 1 \
    "$([ "$(grep -c 'Totalverlust' "$f")" -ge 1 ] && echo 1 || echo 0)"
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

# ── Seitenspezifische Regeln ─────────────────────────────────────────
if [ -f kosten/index.html ]; then
  k=kosten/index.html
  pruef "kosten: Basic-Preis genannt" 1 \
    "$([ "$(grep -c '3.500' $k)" -ge 1 ] && echo 1 || echo 0)"
  pruef "kosten: Widerruf behandelt" 1 \
    "$([ "$(grep -ci 'widerruf' $k)" -ge 1 ] && echo 1 || echo 0)"
  # Solange Laufzeit und Konditionen Platzhalter sind, waere ein
  # Offer-Schema mit Preis eine Angabe, die wir nicht halten koennen.
  pruef "kosten: kein Offer-Schema" 0 "$(grep -c '"@type": *"Offer"' $k)"
fi

if [ -f ist-market-playbook-serioes/index.html ]; then
  d=ist-market-playbook-serioes/index.html
  pruef "serioes: EIN genannt" 1 \
    "$([ "$(grep -c '98-1959983' $d)" -ge 1 ] && echo 1 || echo 0)"
  pruef "serioes: Sitz genannt" 1 \
    "$([ "$(grep -c 'Sheridan' $d)" -ge 1 ] && echo 1 || echo 0)"
  pruef "serioes: KWG-Abgrenzung" 1 \
    "$([ "$(grep -c 'keine Anlageberatung nach KWG' $d)" -ge 1 ] && echo 1 || echo 0)"
fi

if [ -f claudio-fuersatz/index.html ]; then
  c=claudio-fuersatz/index.html
  pruef "claudio: Person-Schema" 1 "$(grep -c '"@type": *"Person"' $c)"
  pruef "claudio: Verweis auf Personenseite" 1 \
    "$([ "$(grep -c 'claudio-fuersatz\.de' $c)" -ge 1 ] && echo 1 || echo 0)"
  # Kein erfundenes Zitat. Von Claudio liegt keines freigegeben vor.
  pruef "claudio: kein Zitat-Block" 0 "$(grep -c 'quote-box' $c)"
fi

if [ -f fuer-wen/index.html ]; then
  w=fuer-wen/index.html
  pruef "fuer-wen: Kapitalanforderung genannt" 1 \
    "$([ "$(grep -c '10.000' $w)" -ge 1 ] && echo 1 || echo 0)"
  pruef "fuer-wen: proscons vorhanden" 1 \
    "$([ "$(grep -c 'proscons' $w)" -ge 1 ] && echo 1 || echo 0)"
fi

if [ -f haeufige-fragen/index.html ]; then
  q=haeufige-fragen/index.html
  pruef "faq: mindestens 15 Fragen" 1 \
    "$([ "$(grep -c '"@type": *"Question"' $q)" -ge 15 ] && echo 1 || echo 0)"
  pruef "faq: fuenf Gruppen" 5 "$(grep -c 'section-eyebrow' $q)"
fi

if [ -f ueber-uns/index.html ]; then
  u=ueber-uns/index.html
  pruef "ueber-uns: Betreiber genannt" 1 \
    "$([ "$(grep -c '28 Capital Architecture LLC' $u)" -ge 1 ] && echo 1 || echo 0)"
  pruef "ueber-uns: keine Redaktion behauptet" 0 \
    "$(grep -ciE 'unabhängige redaktion|unser redaktionsteam|unsere redaktion prüft' $u)"
fi

if [ -f magazin/index.html ]; then
  m=magazin/index.html
  pruef "magazin: sechs Karten" 6 "$(grep -c 'class="card"' $m)"
  # "Zuletzt aktualisiert am" statt "redaktionell geprueft am": gleiches
  # Aktualitaetssignal, aber ohne eine Pruefinstanz zu behaupten.
  pruef "magazin: Aktualisierungsdatum" 1 \
    "$([ "$(grep -c 'Zuletzt aktualisiert am' $m)" -ge 1 ] && echo 1 || echo 0)"
  # Einspaltige Liste, kein Kachelraster — Kacheln lassen die Seite wie
  # einen Shop aussehen, eine Liste wie ein Heft.
  pruef "magazin: kein Kachelraster" 0 \
    "$(grep -c 'grid-template-columns: *repeat(2' portal.css)"
fi

# ── Magazin-Artikel ──────────────────────────────────────────────────
# Diese Seiten muessen auch dann nuetzlich sein, wenn niemand
# weiterklickt. Google fuehrt eine eigene Spam-Kategorie ("Doorway
# abuse") fuer Seiten, die nur existieren, um Besucher weiterzuleiten —
# daher die Deckelung auf hoechstens einen Verweis auf /erfahrungen und
# das Verbot eines Links auf die Anmeldeseite.
artikel="aktien-lernen-anfaenger boersenkurs-serioes \
         finanzcoaching-serioes-erkennen aktien-community-vergleich \
         portfolio-strategie-lernen investieren-ab-50"

for a in $artikel; do
  f="magazin/$a/index.html"
  if [ ! -f "$f" ]; then
    printf '%-54s FEHLER (Datei fehlt)\n' "magazin/$a"; fehler=1; continue
  fi
  # Gemeinsame Portalregeln gelten auch hier.
  pruef "$a: Hinweis-Banner vorhanden" 1 "$(grep -c 'class="notice-banner"' "$f")"
  pruef "$a: Risikohinweis im Fuss" 1 "$(grep -c 'class="risiko"' "$f")"
  pruef "$a: keine Du-Ansprache" 0 \
    "$(text "$f" | grep -oiE '\b(du|dir|dich|dein|deine|deinem|deinen|deiner|deines)\b' | wc -l | tr -d ' ')"
  pruef "$a: kein Ausrufezeichen im Text" 0 "$(text "$f" | grep -c '!')"
  pruef "$a: kein Betrug" 0 "$(grep -ci 'betrug' "$f")"
  pruef "$a: keine englischen Begriffe" 0 \
    "$(grep -ciE 'track record|>offer<|journey|mindset' "$f")"
  pruef "$a: kein AggregateRating" 0 \
    "$(grep -ci 'aggregateRating\|"@type": *"Review"' "$f")"
  # Artikelspezifisch — NUR gegen <main>, nicht gegen die ganze Datei.
  # Der Fuss traegt auf jeder Seite die Spaltenlabel "Anbieter",
  # "Orientierung", "Rechtliches" als h2 und einen Link auf /erfahrungen.
  # Solange diese Regeln die ganze Datei lasen, war die Pruefung fuer jeden
  # Artikel nur durch einen Umbau am gemeinsamen Geruest erfuellbar — und
  # jeder Artikel baute anders um.
  pruef "$a: alle h2 sind Fragen" 0 \
    "$(hauptteil "$f" | grep -oE '<h2[^>]*>[^<]*' | grep -vc '?')"
  pruef "$a: hoechstens ein Verweis auf /erfahrungen" 1 \
    "$([ "$(hauptteil "$f" | grep -c 'href="/erfahrungen"')" -le 1 ] && echo 1 || echo 0)"
  # Geruest identisch wie auf allen Portalseiten. Faengt genau die
  # Umgehungen ab, die die alten Regeln provoziert hatten.
  pruef "$a: Fuss unveraendert (3 Spaltenlabel)" 3 \
    "$(perl -0777 -ne 'if (/<footer.*?<\/footer>/s) { my $b=$&; my $c=()=$b=~/<h2>/g; print $c } else { print 0 }' "$f")"
  pruef "$a: Wortmarke zeigt auf /erfahrungen" 1 \
    "$(grep -c 'class="wordmark"><a href="/erfahrungen"' "$f")"
  pruef "$a: kein Link auf die Anmeldeseite" 0 "$(grep -c 'href="/form"' "$f")"
  pruef "$a: Ruecklink auf /magazin" 1 \
    "$([ "$(grep -c 'href="/magazin"' "$f")" -ge 1 ] && echo 1 || echo 0)"
  pruef "$a: mindestens 1200 Woerter" 1 \
    "$([ "$(text "$f" | wc -w | tr -d ' ')" -ge 1200 ] && echo 1 || echo 0)"
done

# Ein Suchbegriff, eine URL: Zwei Seiten mit derselben H1 kannibalisieren
# sich in der Suche gegenseitig.
if [ "$(ls */index.html 2>/dev/null | wc -l | tr -d ' ')" -gt 1 ]; then
  pruef "keine doppelte H1 im Portal" 0 \
    "$(grep -h -oE '<h1[^>]*>[^<]*' */index.html */*/index.html 2>/dev/null \
       | sort | uniq -d | wc -l | tr -d ' ')"
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
