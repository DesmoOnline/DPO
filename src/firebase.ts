import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore, 
  setLogLevel, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

let app;
let auth: any = null;
let db: any = null;
let isFirebaseAvailable = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    db = getFirestore(app);
  }
  setLogLevel("error");
  isFirebaseAvailable = true;
  console.log("Firebase initialized successfully with Persistent Offline Cache.");
} catch (error) {
  console.warn("Failed to initialize Firebase SDK:", error);
}

export { auth, db, isFirebaseAvailable };
