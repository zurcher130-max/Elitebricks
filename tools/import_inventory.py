#!/usr/bin/env python3
"""Import a BrickLink inventory XML into the static catalog (no network required)."""
import argparse
from decimal import Decimal
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
# User-maintained presentation metadata; inventory remains the price/stock source.
METADATA = {
 '8038-1': ('The Battle of Endor', 'star-wars', 'Star Wars', 'Alle Beutel außer Beutel 1 versiegelt. Mit Anleitung; Figuren neuwertig.'),
 '8088-1': ('ARC-170 Starfighter', 'star-wars', 'Star Wars', 'Komplett mit Anleitung und Originalverpackung.'),
 '7964-1': ('Republic Frigate', 'star-wars', 'Star Wars', 'Komplett mit Anleitung und Originalverpackung.'),
 '2506-1': ('Skull Truck', 'ninjago', 'NINJAGO', '100 % komplett mit Anleitung und Figuren.'),
 '9488-1': ('Elite Clone Trooper & Commando Droid Battle Pack', 'star-wars', 'Star Wars', 'Komplett mit Anleitung und Originalverpackung.'),
 '9489-1': ('Endor Rebel Trooper & Imperial Trooper Battle Pack', 'star-wars', 'Star Wars', 'Komplett mit Anleitung und Originalverpackung.'),
 '9491-1': ('Geonosian Cannon', 'star-wars', 'Star Wars', 'Komplett, ohne Anleitung und Originalverpackung.'),
 '9470-1': ('Shelob Attacks', 'lord-of-the-rings', 'Lord of the Rings', 'Komplett, ohne Anleitung. Beide Figuren haben Risse am Oberkörper.'),
 '9449-1': ('Ultra Sonic Raider', 'ninjago', 'NINJAGO', '100 % komplett mit allen Figuren und Anleitung.'),
 '75021-1': ('Republic Gunship', 'star-wars', 'Star Wars', 'Komplett mit Anleitung und Originalverpackung (OVP).'),
 '70165-1': ('Ultra Agents Mission HQ', 'sonstige', 'Ultra Agents', '100 % komplett mit Anleitung.'),
 '75058-1': ('MTT', 'star-wars', 'Star Wars', 'Komplett mit Anleitung.'),
 '70732-1': ('City of Stiix', 'ninjago', 'NINJAGO', 'Aufdrucke Nr. 9 und 10 fehlen. Ansonsten komplett mit Figuren und Anleitung.'),
 '75141-1': ("Kanan’s Speeder Bike", 'star-wars', 'Star Wars', 'Einwandfreier Zustand.'),
 '70596-1': ('Samurai X Cave Chaos', 'ninjago', 'NINJAGO', '100 % komplett mit Anleitung und Originalverpackung.'),
 '75206-1': ('Jedi and Clone Troopers Battle Pack', 'star-wars', 'Star Wars', '100 % komplett mit Anleitung und Originalverpackung.'),
 '75810-1': ('The Upside Down', 'sonstige', 'Stranger Things', 'Komplett mit allen Figuren. Ohne Anleitung und Originalverpackung.'),
}

def import_inventory(path):
 root = ET.parse(path).getroot()
 if root.tag != 'INVENTORY':
  raise ValueError('Expected INVENTORY XML root')
 products = []
 seen = set()
 types = {'S':'sets', 'M':'minifiguren', 'P':'einzelteile'}
 for item in root.findall('ITEM'):
  get = lambda key: (item.findtext(key) or '').strip()
  if get('ITEMTYPE') not in types:
   raise ValueError(f"Unsupported item type {get('ITEMTYPE')}; import aborted without changing catalog")
  if get('BASECURRENCYCODE') != 'CHF':
   raise ValueError('Only CHF inventory is supported; no implicit conversion')
  if int(get('BULK') or '1') != 1 or Decimal(get('SALE') or '0') != 0:
   raise ValueError('Bulk pricing or sale requires explicit handling')
  quantity = int(get('QTY'))
  price = Decimal(get('PRICE'))
  if quantity < 0 or not price.is_finite() or price < 0:
   raise ValueError('Invalid quantity or price')
  if quantity == 0:
   continue
  item_id, lot_id = get('ITEMID'), get('LOTID')
  if not item_id or not lot_id or lot_id in seen:
   raise ValueError('Missing item/lot ID or duplicate lot')
  seen.add(lot_id)
  condition = {'N':'new', 'U':'used'}.get(get('CONDITION'))
  if not condition:
   raise ValueError('Unknown condition')
  name, theme, label, description = METADATA.get(item_id, (f"Artikel {item_id}", 'sonstige', 'Sonstige', get('DESCRIPTION')))
  image = '75021_prod.jpg' if item_id == '75021-1' and (ROOT/'assets/75021_prod.jpg').is_file() else None
  # Preserve the existing Gunship cart ID when replacing its test listing.
  product_id = '75021' if item_id == '75021-1' else f'bl-{lot_id}'
  products.append(dict(id=product_id, name=f'{name} ({item_id.split("-")[0]})', shop=types[get('ITEMTYPE')], category=theme,
   theme=theme, label=label, price=float(price), detail=condition, image=image, meta=f'Set {item_id.split("-")[0]}' if get('ITEMTYPE')=='S' else f'Artikel {item_id}',
   description=description, tag='', example=False, quantity=quantity, condition=condition,
   subcondition=get('SUBCONDITION'), itemNumber=item_id, lotId=lot_id,
   sourceDescription=get('DESCRIPTION'), source='BrickLink inventory export'))
 if not products:
  raise ValueError('Inventory contains no active items; refusing empty catalog replacement')
 return products

if __name__ == '__main__':
 parser = argparse.ArgumentParser(description=__doc__)
 parser.add_argument('inventory',type=Path)
 parser.add_argument('--output',type=Path,default=ROOT/'catalog.js')
 args=parser.parse_args()
 products=import_inventory(args.inventory)
 args.output.write_text('// Imported BrickLink inventory snapshot. Prices are CHF; no live synchronization.\nconst products = '+json.dumps(products,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
 print(f'Imported {len(products)} lots, {sum(p["quantity"] for p in products)} units to {args.output}')
