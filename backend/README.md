# Stripe Checkout – vorbereiteter Testbetrieb

Die Website bleibt auf GitHub Pages. Der Cloudflare Worker erstellt Stripe Checkout in CHF; ein SQLite Durable Object speichert Bestellungen, Adressen, Reservierungen und Verkäufe transaktional. Live-Schlüssel werden absichtlich abgelehnt. Cloudflare wurde vom Nutzer bereitgestellt; der Testmodus ist in der Konfiguration aktiviert. Ein echter Stripe-Sandbox-Kauf wurde noch nicht bestätigt.

## Installation

Node.js 22+:

```sh
cd backend
npm ci
npm test
npm run check
```

`npm run catalog` erzeugt aus `../catalog.js` die serverseitigen Preise und Bestände. Beim Deploy wird dies automatisch ausgeführt. Nach Inventaränderungen Website und Backend gemeinsam aktualisieren. Die Worker-Bestände gelten nur für diesen Shop; Verkäufe direkt auf BrickLink müssen weiterhin abgeglichen werden.

## Cloudflare und Stripe verbinden

1. Mit dem vorgesehenen Cloudflare-Konto `npx wrangler login` ausführen und anschließend `npm run deploy`. Bei einer vollständig neuen Einrichtung `PAYMENTS_ENABLED` zunächst auf `false` setzen. Workers und SQLite Durable Objects müssen im Konto verfügbar sein; Cloudflare zeigt etwaige Konto-/Tarifanforderungen an. Die ausgegebene HTTPS-Worker-Adresse notieren.
2. Im Stripe-Testmodus bzw. einer Sandbox den geheimen Test-API-Schlüssel erstellen. Im Cloudflare-Dashboard unter Worker → Settings → Variables and Secrets sicher als **`STRIPE_SECRET_KEY`** eintragen (`sk_test_…`). Alternativ `npx wrangler secret put STRIPE_SECRET_KEY` interaktiv ausführen. Niemals Schlüssel in Code oder Chat kopieren.
3. In Stripe einen Test-Webhook für `https://<worker>/webhook` anlegen. Ereignisse: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`. Den Signaturschlüssel dieses Endpunkts sicher als **`STRIPE_WEBHOOK_SECRET`** (`whsec_…`) bei Cloudflare setzen. Ein lokaler Stripe-CLI-Webhook-Schlüssel ist nicht der Dashboard-Endpunkt-Schlüssel.
4. Einen eigenständigen zufälligen Schlüssel mit mindestens 32 Zeichen als **`ADMIN_API_KEY`** bei Cloudflare hinterlegen. Er schützt den Händlerabruf und darf niemals im Website-Code stehen.
5. Die öffentliche `WAREHOUSE_ADDRESS` in `wrangler.toml` prüfen (aktuell Haltenstrasse 12, 8413 Neftenbach). Ohne Adresse verweigert das Backend Online-Testzahlungen mit Lagerabholung; Standard und Priority funktionieren unabhängig davon.
6. `PAYMENTS_ENABLED = "true"` in `wrangler.toml` setzen und erneut deployen. `SITE_ORIGIN` und `SITE_BASE_URL` passen zur aktuellen GitHub-Pages-Adresse; bei eigener Domain beide ändern.
7. In `../payments-config.js` die echte Worker-HTTPS-Adresse als `apiBase` setzen und `enabled:true` aktivieren. Diese Datei enthält nur öffentliche Einstellungen, keine Stripe-Schlüssel. Auf GitHub veröffentlichen.

Nach Adressprüfung erscheint „Weiter zu Stripe (Testzahlung)“. Kartendaten werden auf der Stripe-Seite eingegeben. Zunächst Karten; Apple Pay/Google Pay hängen von Stripe, Gerät und Browser ab. TWINT ist noch nicht aktiviert oder geprüft.

## Ausstehender echter Sandbox-Test

Testkarte und Testabläufe: https://docs.stripe.com/testing . Keine echte Karte verwenden.

- Standard CHF 9, Priority CHF 11 und ggf. kostenlose Lagerabholung prüfen.
- Checkout im Testkonto abschließen und im Stripe-Dashboard die erfolgreiche Webhook-Zustellung bestätigen.
- Zahlungsstatus, Adresse und Artikel im geschützten Händlerabruf prüfen. Die Rückkehrseite allein setzt niemals „bezahlt“; maßgeblich ist die geprüfte Stripe-Nachricht.
- Doppeltes Webhook darf nicht erneut Bestand reduzieren. Abbruch/Ablauf prüfen: Der Warenkorb bleibt erhalten; Reservierungen werden erst durch bestätigten Session-Ablauf oder Zahlungsfehler freigegeben.

Die bisherigen Tests verwenden ausschließlich simulierte Stripe-Antworten. Ein vollständiger Zahlungsdurchlauf im tatsächlichen Stripe-Testkonto ist noch nicht bestätigt.

## Händlerzugriff

`GET /orders` mit `Authorization: Bearer <ADMIN_API_KEY>` liefert bis zu 100 Bestellungen mit Kundendaten; `nextCursor` kann als `?cursor=…` übergeben werden. Schlüssel nur in einer sicheren lokalen Anwendung oder einem geschützten Händlerdienst verwenden, nicht im Browser-Frontend. Händler-Weboberfläche und E-Mail-Bestätigung sind noch nicht vorhanden.

`GET /status?order=<id>&access=<opaque-token>` liefert ausschließlich Status/Betrag, bei bezahlt zusätzlich Artikel-IDs und Mengen. Keine Kundendaten. Statuslinks vertraulich behandeln.

## Fehlerfälle und Grenzen

Stripe-Aufrufe haben stabile Idempotenzkennungen. Eine eindeutige Stripe-4xx-Ablehnung ohne Session gibt die Reservierung frei. Die Stripe-Sitzung läuft nach etwa 31 Minuten ab. Ein Timeout behält die Reservierung, weil Stripe die Sitzung trotzdem erstellt haben könnte; dieselbe Bestellung kann mit derselben Kennung wiederholt werden. Ungeklärte Reservierungen vor einer späteren Live-Schaltung anhand Stripe und Händlerabruf bereinigen, nicht blind freigeben. Fehlgeschlagene Webhook-Zustellungen nach Fehlerbehebung im Stripe-Dashboard erneut zustellen.

Noch keine Live-Freigabe, automatische E-Mails, Rückerstattungsoberfläche, Versandetiketten oder BrickLink-Synchronisierung. Vor echtem Verkauf sind zusätzlich Händlerablauf, Bestandsabgleich, Lageradresse und rechtliche Angaben fertigzustellen.

`npm run dev` startet den lokalen Worker. Ohne aktivierte Zahlung und Secrets liefert `/checkout` 503. Geheimnisse für lokale Tests gehören ausschließlich in die ignorierte `.dev.vars` (siehe `.dev.vars.example`).
