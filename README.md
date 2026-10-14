# Elitebricks

Responsive deutschsprachige Startseite für einen Klemmbaustein-Shop. Statische Website mit Kategorie-Filtern und einem Demo-Warenkorb, der lokal im Browser gespeichert wird.

## Lokal starten

Python 3 ist ausreichend; es werden keine Pakete benötigt:

```sh
cd /workspace/Elitebricks
python3 -m http.server 8000 --bind 0.0.0.0
```

Alternativ kann `index.html` direkt im Browser geöffnet werden.

## Inhalte anpassen

- `index.html`: Texte und Seitenstruktur
- `styles.css`: Layout, Farben und responsive Darstellung
- `sets.html`, `minifiguren.html`, `einzelteile.html`: eigene Sortiment-Seiten
- `catalog.js`: gemeinsamer Beispielkatalog mit CHF-Preisen und Filtermerkmalen
- `app.js`: Suche, kombinierbare Filter, Sortierung und gemeinsamer Demo-Warenkorb
- `assets/`: lokale SVG-Illustrationen

Google Fonts werden optional über HTTPS geladen; ohne Netzwerk werden Systemschriften verwendet.

## Vor einem echten Shop-Start

Die Produkte, Stückzahlen und Preise sind Beispiele. Die Illustrationen sind Symbolbilder. Der Checkout nimmt keine Zahlungen oder Bestellungen entgegen. Echte Produktdaten, Kontaktinformationen, rechtliche Angaben und eine Shop-/Zahlungsanbindung müssen vor Veröffentlichung als Online-Shop ergänzt werden.

## Sortiment-Seiten

Alle Sortiment-Seiten bieten Suche nach Name oder Artikelkennung, kombinierbare Kategorie-, Merkmals- und Preisfilter, Sortierung nach Preis oder Name, Ergebnisanzahl und Filter-Zurücksetzen. Sets: Themenwelt und Teileanzahl. Minifiguren: Themenwelt und Zubehör. Einzelteile: Teiletyp und Farbe. Der Warenkorb bleibt beim Seitenwechsel erhalten. Alle 18 Produkte und Illustrationen sind Beispiele, keine echten Angebote.

## Themenwelten

Sets und Minifiguren verwenden die vollständige Themenwelt-Auswahl. LEGO Movie 1/2 sowie Lord of the Rings/Hobbit sind separat auswählbar. Die generischen Beispielprodukte sind unter `Sonstige` eingeordnet; es werden keine offiziellen Markenprodukte vorgetäuscht. Bei echten Produkten das Feld `theme` in `catalog.js` setzen (z. B. `star-wars`, `ninjago`, `harry-potter`, `city`). Die bisherigen Kategorien bleiben für die Startseite erhalten.
