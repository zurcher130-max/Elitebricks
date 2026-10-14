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
