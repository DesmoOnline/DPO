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

const ALLOWED_SKUS = [
  "LT240A15",
  "B400",
  "B600",
  "NT01",
  "ID02",
  "RAL2010",
  "RAL2005",
  "RAL6004",
  "RAL5019",
  "RAL1004",
  "RAL9003",
  "RAL4005",
  "RAL1001",
  "RAL3000",
  "RAL3015",
  "RAL6027",
  "RAL7000",
  "RAL8025",
  "RAL9011",
  "ICT-717",
  "RCD/PLD1",
  "GL15",
  "DFP2",
  "DFP1",
  "FE2",
  "CP3",
  "ALN1",
  "SALT1",
  "LT7A"
];

async function removeExtraProducts() {
  console.log("Fetching all products from Live Firestore...");
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log("No products found in the database.");
    return;
  }

  const batch = db.batch();
  let deletedCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!ALLOWED_SKUS.includes(data.sku)) {
      console.log(`Deleting product: ${data.name} (SKU: ${data.sku})`);
      batch.delete(doc.ref);
      deletedCount++;
    } else {
      console.log(`Keeping product: ${data.name} (SKU: ${data.sku})`);
    }
  });

  if (deletedCount > 0) {
    console.log(`\nCommitting batch delete of ${deletedCount} products...`);
    await batch.commit();
    console.log("Delete successful.");
  } else {
    console.log("\nNo extra products found. Database is already clean.");
  }
}

removeExtraProducts().catch(console.error);
