# Elitebricks

Statische deutschsprachige Shop-Website mit Sets, Minifiguren und Einzelteilen, Filtern und gemeinsamem lokal gespeichertem Demo-Warenkorb.

## Lokal starten

```sh
cd /workspace/Elitebricks
python3 -m http.server 8000 --bind 0.0.0.0
```

Keine Paketinstallation erforderlich. Optionale Google Fonts fallen ohne Netzwerk auf Systemschriften zurück.

## Aktueller Inventarstand

17 Sets aus dem hochgeladenen BrickLink-Export, jeweils 1 Stück, alle Preise in CHF. Keine Minifiguren oder Einzelteile im Export. Die früheren Beispielangebote wurden entfernt. Das Republic Gunship nutzt das hochgeladene Foto; die übrigen Bildfelder des Exports waren leer. Setnummern und „Produktbild folgt“ ersetzen fehlende Bilder.

Preise, Mengen, Zustand und Originalbeschreibungen stammen aus dem XML. Englische Produktnamen und deutsche Beschreibungen werden im Importer ergänzt und können dort überprüft/angepasst werden. Hinweise auf fehlende Aufdrucke oder gerissene Oberkörper bleiben sichtbar. Der Export enthält keine Teileanzahlen; Sets werden daher nach Zustand statt Teileanzahl gefiltert.

## Inventar aktualisieren

```sh
python3 tools/import_inventory.py /pfad/zum/inventar.xml
node --check catalog.js
node --check app.js
```

Der Import ersetzt den gesamten Katalog, führt keine Netzwerkabfragen durch und setzt keine Synchronisierung mit BrickLink voraus. Nicht unterstützte Artikeltypen, Währungen, Rabatt-/Bulk-Preise und ungültige Daten führen zum Abbruch, bevor der Katalog überschrieben wird. Artikel ohne Bestand werden ausgelassen. Unbekannte Artikel erscheinen unter ihrer Artikelnummer und „Sonstige“; Namen, Themenwelten und Übersetzungen können in `tools/import_inventory.py` ergänzt werden. Die Mengen begrenzen den Demo-Warenkorb; Verkäufe außerhalb der Website werden erst nach neuem Import berücksichtigt.

## Dateien

- `index.html`: Startseite
- `sets.html`, `minifiguren.html`, `einzelteile.html`: Sortiment-Seiten
- `catalog.js`: importierter Inventarstand
- `app.js`: kombinierbare Filter, Suche, Sortierung und Demo-Warenkorb
- `styles.css`: responsives Layout
- `assets/`: Logo, Bilder und Illustrationen
- `tools/import_inventory.py`: wiederholbarer XML-Import

## Vor dem Shop-Start

Der Checkout führt keine Bestellungen oder Zahlungen aus. Kontaktinformationen, rechtliche Angaben und eine echte Shop-/Zahlungsanbindung müssen ergänzt werden. Der Bestand ist eine Momentaufnahme und wird nicht automatisch mit BrickLink abgeglichen. Fehlende Produktbilder müssen ergänzt werden.
