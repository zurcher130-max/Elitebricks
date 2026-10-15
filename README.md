# Elitebricks

Statische deutschsprachige Shop-Website mit Sets, Minifiguren und Einzelteilen, Filtern und gemeinsamem lokal gespeichertem Demo-Warenkorb.

## Lokal starten

```sh
cd /workspace/Elitebricks
python3 -m http.server 8000 --bind 0.0.0.0
```

Keine Paketinstallation erforderlich. Optionale Google Fonts fallen ohne Netzwerk auf Systemschriften zurück.

## Aktueller Inventarstand

17 Sets (je 1 Stück) und 56 Minifiguren-Angebote mit insgesamt 70 Figuren aus den hochgeladenen BrickLink-Exporten, alle Preise in CHF. Keine Einzelteile im Export. Die früheren Beispielangebote wurden entfernt. Das Republic Gunship nutzt das hochgeladene Foto. Die übrigen Sets verwenden lokal gespeicherte offizielle LEGO-Katalogbilder von den Bauanleitungsseiten. Diese zeigen das ursprüngliche Set; der Zustand des angebotenen Exemplars steht in der Beschreibung.

Preise, Mengen, Zustand und Originalbeschreibungen stammen aus dem XML. Englische Produktnamen und deutsche Beschreibungen werden im Importer ergänzt und können dort überprüft/angepasst werden. Hinweise auf fehlende Aufdrucke oder gerissene Oberkörper bleiben sichtbar. Der Export enthält keine Teileanzahlen; Sets werden daher nach Zustand statt Teileanzahl gefiltert.

## Inventar aktualisieren

```sh
python3 tools/import_inventory.py /pfad/zum/inventar.xml
node --check catalog.js
node --check app.js
```

Der XML-Import ersetzt die enthaltenen Kategorien und behält andere Kategorien bei, führt keine Netzwerkabfragen durch und setzt keine Synchronisierung mit BrickLink voraus. Nicht unterstützte Artikeltypen, Währungen, Rabatt-/Bulk-Preise und ungültige Daten führen zum Abbruch, bevor der Katalog überschrieben wird. Artikel ohne Bestand werden ausgelassen. Unbekannte Artikel erscheinen unter ihrer Artikelnummer und „Sonstige“; Namen, Themenwelten und Übersetzungen können in `tools/import_inventory.py` ergänzt werden. Die Mengen begrenzen den Demo-Warenkorb; Verkäufe außerhalb der Website werden erst nach neuem Import berücksichtigt.

## Dateien

- `index.html`: Startseite
- `sets.html`, `minifiguren.html`, `einzelteile.html`: Sortiment-Seiten
- `catalog.js`: importierter Inventarstand
- `app.js`: kombinierbare Filter, Suche, Sortierung und Demo-Warenkorb
- `styles.css`: responsives Layout
- `assets/`: Logo, Bilder und Illustrationen
- `tools/import_inventory.py`: wiederholbarer XML-Import

## Vor dem Shop-Start

Der Checkout führt keine Bestellungen oder Zahlungen aus. Kontaktinformationen, rechtliche Angaben und eine echte Shop-/Zahlungsanbindung müssen ergänzt werden. Der Bestand ist eine Momentaufnahme und wird nicht automatisch mit BrickLink abgeglichen. Eigene Zustandsfotos können die Katalogbilder ergänzen.

## Bildquellen

`assets/lego/catalog-images.json` dokumentiert für jedes übernommene Katalogbild die offizielle LEGO-Seite und Bild-URL. Die Dateien werden lokal ausgeliefert und beim erneuten Inventarimport automatisch wieder zugeordnet. Das ursprüngliche Gunship-Foto bleibt unverändert.

## Figuren aktualisieren

```sh
python3 tools/import_minifigures.py /pfad/zum/invcsv.csv
```

Der CSV-Import ersetzt nur die Minifiguren und bewahrt die Sets samt Bildern. Artikelnummern, Preise, Stückzahlen und Originalbeschreibungen bleiben pro BrickLink-Lot erhalten; gleiche Figuren in unterschiedlichen Lots werden nicht zusammengefasst. Neu/Gebraucht ist der zusätzliche Figurenfilter, weil der CSV keine verlässlichen Zubehörfelder enthält. Fehlende Bilder erscheinen als Artikelnummer mit „Produktbild folgt“. LEGO-Suche und Bauanleitungsseiten liefern keine eindeutig zugeordneten Bilder für die BrickLink-Figurenkennungen.

## Figurenbilder

54 unterschiedliche Figurenbilder von Merlins Steine sind unter `assets/minifigures` lokal gespeichert und anhand exakter BrickLink-Artikelnummern zugeordnet. Damit haben 55 von 56 Figuren-Angeboten ein Bild (ein Artikel kommt in zwei Lots vor). `sw0386` fehlt dort und bleibt ohne Bild; keine ähnliche Variante wurde eingesetzt. `sources.json` enthält Quell-URLs und Zuordnung, der CSV-Importer erhält sie bei Aktualisierungen. Die Website nennt Merlins Steine als Quelle. Katalogbilder zeigen nicht den individuellen Zustand des angebotenen Exemplars.

## Warenkorb und Adresse

`warenkorb.html` mit `checkout.js` bietet Mengenänderung innerhalb des importierten Bestands, Entfernen, Kontaktdaten, Lieferadresse und eine lokale Zusammenfassung zum Herunterladen. Der bestehende Mini-Warenkorb führt über „Adresse & Versand“ auf diese Seite. Standardversand innerhalb der Schweiz kostet CHF 9, PostPac Priority CHF 11, Lagerabholung ist kostenlos, Shopabholung deaktiviert. Die Versandkosten werden einmal pro Warenkorb berechnet. Lageradresse und Abholtermine müssen vor einer verbindlichen Bestellfunktion ergänzt werden.

Adress- und Kontaktdaten werden nicht in Local Storage gespeichert und nicht übertragen. Nur Artikel und Mengen bleiben wie bisher lokal gespeichert. Es gibt keine Zahlung und keinen Bestellversand; die Zusammenfassung ist eine Vorschau. Lagerabholung benötigt Kontaktangaben, Postversand zusätzlich eine Schweizer Lieferadresse mit vierstelliger PLZ.

## Produktseiten

Bild und Name jeder Produktkarte führen zu `produkt.html?id=<Lot-ID>` (z. B. `produkt.html?id=75021`). `product.js` lädt die Details aus `catalog.js`: großes Bild mit Quellenhinweis, Beschreibung, Zustand, Artikelnummer, Preis, Bestand, Mengenauswahl und Versandübersicht. Der gleiche Artikel bleibt pro Lot eindeutig; doppelt angebotene Figuren haben getrennte Links. Die Mengenprüfung berücksichtigt bereits im Warenkorb enthaltene Stücke und Änderungen in anderen Tabs. Ungültige/fehlende Produktkennungen zeigen eine Rückkehr zum Sortiment statt einer leeren Seite. Auch die Artikelnamen im Warenkorb sind verlinkt.
