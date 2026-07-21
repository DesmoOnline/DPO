import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore, 
  setLogLevel, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// The user's Firebase config from their Google Business Account
export const firebaseConfig = {
  apiKey: "AIzaSyDzOel-toXx7oT3DJ1GqgerW-X6dIdsyh0",
  authDomain: "desmoproductsonline.firebaseapp.com",
  projectId: "desmoproductsonline",
  storageBucket: "desmoproductsonline.firebasestorage.app",
  messagingSenderId: "684470912687",
  appId: "1:684470912687:web:9b31a83fb8217cd691f65a",
  measurementId: "G-6MM332FX5Y"
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
