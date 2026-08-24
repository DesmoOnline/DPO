const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountString) {
  console.error("ERROR: FIREBASE_SERVICE_ACCOUNT_KEY is not defined.");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountString);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const rawTable = `
240V Loadtester                           | $236.00     | $282.00 | LT240A15
GS 0008 (WP) 400A Barrier                 | $45.00      | -      | B400
GS 6029 (WP) 600A Barrier                 | $45.00      | -      | B600
HG 2101 Neutral Tag (50 per pack)         | $39.00      | -      | NT01
HG2102 ID Tag (20/pack, double legged)    | $6.50       | -      | ID02
RAL2010 Meter Seal - Signal Orange        | $62.00      | -      | RAL2010
RAL2005 Meter Seal - Luminous Orange      | $62.00      | -      | RAL2005
RAL6004 Meter Seal - Green                | $62.00      | -      | RAL6004
RAL5019 Meter Seal - Blue                 | $62.00      | -      | RAL5019
RAL1004 Meter Seal - Yellow               | $62.00      | -      | RAL1004
RAL9003 Meter Seal - White                | $62.00      | -      | RAL9003
RAL4005 Meter Seal - Purple               | $62.00      | -      | RAL4005
RAL1001 Meter Seal - Beige                | $62.00      | -      | RAL1001
RAL3000 Meter Seal - Red                  | $62.00      | -      | RAL3000
RAL3015 Meter Seal - Pink                 | $62.00      | -      | RAL3015
RAL6027 Meter Seal - Light Blue           | $62.00      | -      | RAL6027
RAL7000 Meter Seal - Grey                 | $62.00      | -      | RAL7000
RAL8025 Meter Seal - Brown                | $62.00      | -      | RAL8025
RAL9011 Meter Seal - Black                | $62.00      | -      | RAL9011
Circuit Test Control Box, Hand Piece & Wand | $1,620.00 | -      | ICT-717
RCD / Polarity Tester                     | $63.60      | -      | RCD/PLD1
15W Bayonet globes for RCD/PLD1           | $3.30       | -      | GL15
Fused Probe (set of red & black)          | $48.00      | -      | DFP2
Fused Probe Single                        | $24.00      | -      | DFP1
Double Ended Fuse Extractor               | $204.50     | -      | FE2
Continuity, Phasing & Insulation Resistance Test Unit | $77.00 | - | CP3
Alligator Clip (Black)                    | $8.00       | -      | ALN1
Satchels for Loadtester                   | $21.00      | -      | SALT1
Loadtester 7A HRC Fuses (per pack of 10)  | $12.50      | -      | LT7A
`;

const lines = rawTable.trim().split('\n');
const products = lines.map(line => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 4) return null;
    const name = parts[0];
    const price = parseFloat(parts[1].replace('$', '').replace(',', ''));
    const sku = parts[3];
    return {
        id: sku.replace(/[^a-zA-Z0-9-]/g, '-'),
        name: name,
        sku: sku,
        baseWholesalePrice: price
    };
}).filter(Boolean);

async function run() {
  console.log(`Uploading ${products.length} products to Live Firebase...`);
  const batch = db.batch();
  for (const product of products) {
    const docRef = db.collection('products').doc(product.id);
    batch.set(docRef, product, { merge: true });
    console.log(`Queued update for: ${product.name} (SKU: ${product.sku})`);
  }
  await batch.commit();
  console.log("SUCCESS! All products have been updated in the Live Database.");
}

run().catch(console.error);
