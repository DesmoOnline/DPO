import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
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
    const cred = await createUserWithEmailAndPassword(auth, "test@desmoproducts.com.au", "123456");
    const user = cred.user;
    console.log("Created auth user", user.uid);
    
    await setDoc(doc(db, "customers", user.uid), {
      id: user.uid,
      companyName: "test",
      email: "test@desmoproducts.com.au",
      deliveryAddress: "123 Test St",
      status: "approved",
      createdAt: new Date().toISOString(),
      role: "customer"
    });
    console.log("Created firestore doc for approved customer");
    process.exit(0);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log("User already exists, trying to ensure it is approved...");
      try {
        const cred = await signInWithEmailAndPassword(auth, "test@desmoproducts.com.au", "123456");
        await setDoc(doc(db, "customers", cred.user.uid), {
          id: cred.user.uid,
          companyName: "test",
          email: "test@desmoproducts.com.au",
          deliveryAddress: "123 Test St",
          status: "approved",
          createdAt: new Date().toISOString(),
          role: "customer"
        });
        console.log("Updated existing user to approved.");
        process.exit(0);
      } catch (e) {
        console.error("Failed:", e);
      }
    } else {
      console.error("Error creating user:", err);
    }
    process.exit(1);
  }
}

main();
