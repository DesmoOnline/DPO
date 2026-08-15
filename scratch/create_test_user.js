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

const testEmail = process.env.TEST_USER_EMAIL || "test@desmoproducts.com.au";
const testPassword = process.env.TEST_USER_PASSWORD || "123456";

async function main() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const user = cred.user;
    console.log("Created auth user", user.uid);
    
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      companyName: "Test Company Pty Ltd",
      email: testEmail,
      deliveryAddress: "123 Test St, Perth WA 6000",
      status: "approved",
      createdAt: new Date().toISOString(),
      role: "customer"
    });
    console.log("Created firestore doc for approved customer in /users");
    process.exit(0);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log("User already exists, signing in to verify profile...");
      try {
        const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        await setDoc(doc(db, "users", cred.user.uid), {
          id: cred.user.uid,
          companyName: "Test Company Pty Ltd",
          email: testEmail,
          deliveryAddress: "123 Test St, Perth WA 6000",
          status: "approved",
          createdAt: new Date().toISOString(),
          role: "customer"
        }, { merge: true });
        console.log("Updated existing user to approved in /users.");
        process.exit(0);
      } catch (e) {
        console.error("Failed to sign in and update existing user:", e);
      }
    } else {
      console.error("Error creating user:", err);
    }
    process.exit(1);
  }
}

main();

