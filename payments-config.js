// Public configuration only. Never put a Stripe secret or webhook secret here.
// Stripe TEST checkout configured; the backend deliberately rejects live-mode keys.
window.ELITEBRICKS_PAYMENTS = Object.freeze({enabled:true, apiBase:'https://elitebricks-checkout.zurcher130.workers.dev', warehouseAddress:'Haltenstrasse 12, 8413 Neftenbach'});
