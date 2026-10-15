#!/usr/bin/env python3
"""Merge a BrickLink minifigure CSV snapshot, retaining sets and parts."""
import argparse,csv,html,json,re
from decimal import Decimal
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SUFFIX=re.compile(r'\s+(Used condition|Good condition|good condition|good-vg condition|vgc|Vgc|playwear, head has dents around the neck|playwear|cracked torso right side|Like new, both cloths never assembled|new)\s*$',re.I)
TRANSLATIONS={
 'used condition':'Gebrauchter Zustand.', 'good condition':'Guter Zustand.', 'good-vg condition':'Guter bis sehr guter Zustand.',
 'vgc':'Sehr guter Zustand.', 'playwear':'Spielspuren.', 'playwear, head has dents around the neck':'Spielspuren; der Kopf hat Druckstellen im Halsbereich.',
 'cracked torso right side':'Riss an der rechten Seite des Oberkörpers.', 'like new, both cloths never assembled':'Wie neu; beide Stoffteile wurden nie angebracht.', 'new':'Neu.'}
def load_catalog():
 s=(ROOT/'catalog.js').read_text()
 return json.loads(s[s.index('['):].strip().rstrip(';'))
def import_figures(path):
 rows=list(csv.DictReader(path.open(encoding='utf-8-sig',newline='')))
 seen=set();figures=[]
 manifest_path=ROOT/"assets/minifigures/sources.json"
 images=json.loads(manifest_path.read_text()) if manifest_path.is_file() else {}
 for row in rows:
  if not row['Category'].startswith('Minifigures / '):raise ValueError('Non-minifigure row; refusing partial import')
  if row['Currency']!='CHF':raise ValueError('Expected CHF; no currency conversion')
  if row['Stockroom']!='No' or row['Reserved For'].strip():raise ValueError('Reserved/stockroom inventory requires explicit handling')
  if int(row['Bulk'])!=1 or Decimal(row['Sale'].rstrip('%'))!=0:raise ValueError('Bulk/sale pricing unsupported')
  if any(int(row.get(f'Tier Qty {n}') or '0') for n in range(1,4)):raise ValueError('Tier pricing unsupported')
  quantity=int(row['Quantity']);price=Decimal(row['Price'])
  if quantity<0 or not price.is_finite() or price<0:raise ValueError('Invalid stock/price')
  if not quantity:continue
  lot=row['Lot ID'];number=row['Item No']
  if not lot or lot in seen or not number:raise ValueError('Missing or duplicate lot ID')
  seen.add(lot)
  if row['Condition'] not in ['New','Used']:raise ValueError('Unknown condition')
  theme_label=row['Category'].split(' / ')[1]
  theme='star-wars' if theme_label=='Star Wars' else 'ninjago' if 'NINJAGO' in theme_label.upper() else 'sonstige'
  description=html.unescape(row['Description']).strip()
  match=SUFFIX.search(description)
  name=description[:match.start()].strip() if match else description
  notes=TRANSLATIONS.get(match.group(1).lower(),match.group(1)) if match else ''
  if row.get('Extended Description'):notes+=' '+html.unescape(row['Extended Description']).strip()
  if 'without Stand and Accessories' in name:notes+=' Ohne Standplatte und Zubehör.'
  picture=images.get(number)
  if picture and not (ROOT/'assets'/picture['image']).is_file():raise ValueError('Missing local minifigure image')
  figures.append(dict(id=f'bl-{lot}',name=name,shop='minifiguren',category=theme,theme=theme,
   label='NINJAGO' if theme=='ninjago' else theme_label,price=float(price),detail='new' if row['Condition']=='New' else 'used',
   image=picture["image"] if picture else None,imageKind="merlins-catalog" if picture else None,meta=f'Figur {number}',description=notes.strip(),tag='',example=False,
   quantity=quantity,condition='new' if row['Condition']=='New' else 'used',subcondition='',
   itemNumber=number,lotId=lot,sourceDescription=description,source='BrickLink CSV inventory export'))
 if not figures:raise ValueError('No active figures; refusing empty replacement')
 return figures
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('inventory',type=Path);parser.add_argument('--output',type=Path,default=ROOT/'catalog.js');args=parser.parse_args()
 figures=import_figures(args.inventory)
 products=[p for p in load_catalog() if p['shop']!='minifiguren']+figures
 args.output.write_text('// Imported BrickLink inventory snapshots. Prices CHF; no live synchronization.\nconst products = '+json.dumps(products,ensure_ascii=False,indent=2)+';\n')
 print(f'Imported {len(figures)} minifigure lots ({sum(p["quantity"] for p in figures)} units); retained {len(products)-len(figures)} other lots')
