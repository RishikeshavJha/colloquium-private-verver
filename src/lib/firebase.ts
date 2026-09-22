import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "your_firebase_api_key_here",
  authDomain: "ieee-colloquium.firebaseapp.com",
  databaseURL: "https://ieee-colloquium-default-rtdb.firebaseio.com",
  projectId: "ieee-colloquium",
  storageBucket: "ieee-colloquium.firebasestorage.app",
  messagingSenderId: "914616555571",
  appId: "1:914616555571:web:bbb428406970d9596a2b46",
  measurementId: "G-XTXEM3XYLJ",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics only in browser
if (typeof window !== "undefined") {
  getAnalytics(app);
}

export default app;
