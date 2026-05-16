import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// Your web app's Firebase configuration
// REPLACE THESE with your real values from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Utility functions for Cloud Sync
export const cloudSync = {
  // Save current store state to user's cloud document
  saveData: async (userId, data) => {
    try {
      const userDoc = doc(db, "users", userId);
      await setDoc(userDoc, {
        ...data,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.error("Cloud Save Error:", e);
      return false;
    }
  },

  // Fetch data from user's cloud document
  fetchData: async (userId) => {
    try {
      const userDoc = doc(db, "users", userId);
      const docSnap = await getDoc(userDoc);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (e) {
      console.error("Cloud Fetch Error:", e);
      return null;
    }
  }
};
