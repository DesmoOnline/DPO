import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountString) {
  console.error("ERROR: FIREBASE_SERVICE_ACCOUNT_KEY is not defined.");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountString);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  console.log(`Checking ${snapshot.size} products in Firestore...`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    // If imageUrl is placeholder or starts with unsplash and is the non-used placeholder, update it
    if (data.imageUrl === 'https://images.unsplash.com/photo-not-used' || data.imageUrl === 'placeholder') {
      console.log(`Fixing image for product: ${data.name} (SKU: ${data.sku || doc.id})`);
      batch.update(doc.ref, { imageUrl: '/assets/default-product.png' });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully updated ${count} products to use the default image path.`);
  } else {
    console.log("No products needed their images fixed.");
  }
}

run().catch(console.error);
