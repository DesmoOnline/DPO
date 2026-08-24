import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountString) {
  console.error("ERROR: FIREBASE_SERVICE_ACCOUNT_KEY is not defined.");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountString);

try {
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  // Ignore if already initialized
}

const db = getFirestore();

const updates = [
  {
    sku: "LT240A15",
    quantityBreaks: [
      { minQty: 7, discountType: "fixed", discountValue: 226 },
      { minQty: 16, discountType: "fixed", discountValue: 216 }
    ]
  },
  {
    sku: "B400",
    quantityBreaks: [
      { minQty: 16, discountType: "fixed", discountValue: 40 }
    ]
  },
  {
    sku: "B600",
    quantityBreaks: [
      { minQty: 16, discountType: "fixed", discountValue: 40 }
    ]
  }
];

async function updateBreaks() {
  console.log("Updating price breaks in Live Firestore...");
  const batch = db.batch();
  let count = 0;

  for (const update of updates) {
    // Need to find the document by SKU because ID might be different (though they match here)
    const snapshot = await db.collection('products').where('sku', '==', update.sku).get();
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        batch.update(doc.ref, { quantityBreaks: update.quantityBreaks });
        console.log(`Prepared update for ${update.sku} (${doc.id})`);
        count++;
      });
    } else {
      console.log(`WARNING: Product with SKU ${update.sku} not found!`);
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`\nSuccessfully updated ${count} products.`);
  } else {
    console.log("\nNo products found to update.");
  }
}

updateBreaks().catch(console.error);
