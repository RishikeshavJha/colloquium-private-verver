import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDOSSB3OQlPCf4Armvag7k5dNnlGVcdqCU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ieee-colloquium.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ieee-colloquium-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ieee-colloquium",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ieee-colloquium.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "914616555571",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:914616555571:web:bbb428406970d9596a2b46",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XTXEM3XYLJ",
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
