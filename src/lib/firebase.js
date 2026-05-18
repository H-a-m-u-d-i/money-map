import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMTr0CttrANaQX6vuSxJeqareDiWdzqMk",
  authDomain: "money-map-a20a2.firebaseapp.com",
  projectId: "money-map-a20a2",
  storageBucket: "money-map-a20a2.firebasestorage.app",
  messagingSenderId: "356647313408",
  appId: "1:356647313408:web:83ad6d973a0c6c1a98b8e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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
