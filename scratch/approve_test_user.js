import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  try {
    // 1. Try to sign in as admin
    const adminCred = await signInWithEmailAndPassword(auth, "1@1.com", "123456");
    console.log("Logged in as admin", adminCred.user.uid);
    
    // 2. We already created the auth user LAopcgYfDjPfFw67MdWoCFFajoh2 earlier, but let's just create a new one to be safe, or just write the doc for the previous one.
    const testUserId = "LAopcgYfDjPfFw67MdWoCFFajoh2"; 
    
    await setDoc(doc(db, "users", testUserId), {
      id: testUserId,
      companyName: "test",
      email: "test@desmoproducts.com.au",
      deliveryAddresses: ["123 Test St"],
      status: "approved",
      createdAt: new Date().toISOString(),
      customPricing: {},
      allowedProducts: []
    });
    console.log("Created/Updated test user doc with approved status!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
