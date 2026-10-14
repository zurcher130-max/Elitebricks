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
- `app.js`: Beispielprodukte, CHF-Preise, Filter und Demo-Warenkorb
- `assets/`: lokale SVG-Illustrationen

Google Fonts werden optional über HTTPS geladen; ohne Netzwerk werden Systemschriften verwendet.

## Vor einem echten Shop-Start

Die Produkte, Stückzahlen und Preise sind Beispiele. Die Illustrationen sind Symbolbilder. Der Checkout nimmt keine Zahlungen oder Bestellungen entgegen. Echte Produktdaten, Kontaktinformationen, rechtliche Angaben und eine Shop-/Zahlungsanbindung müssen vor Veröffentlichung als Online-Shop ergänzt werden.
