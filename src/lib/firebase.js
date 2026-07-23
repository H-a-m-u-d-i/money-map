import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { initializeFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

// Use initializeFirestore with long polling fallback for native Android APK WebViews
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});

// Utility functions for Cloud Sync & Auth
export const cloudSync = {
  // Save current store state to user's cloud document + create history snapshot
  saveData: async (userId, data) => {
    try {
      const userDoc = doc(db, "users", userId);
      const timestamp = new Date().toISOString();

      await setDoc(userDoc, {
        ...data,
        lastUpdated: timestamp
      }, { merge: true });

      // Automatically append a snapshot to history subcollection if data has content
      const hasContent = (data.accounts && data.accounts.length > 0) || (data.transactions && data.transactions.length > 0);
      if (hasContent) {
        const historyDoc = doc(db, "users", userId, "history", timestamp.replace(/[:.]/g, '-'));
        await setDoc(historyDoc, {
          ...data,
          archivedAt: timestamp
        });
      }
      return { success: true, timestamp };
    } catch (e) {
      console.error("Cloud Save Error:", e);
      return { success: false, error: e.message || String(e) };
    }
  },

  // Fetch data from user's cloud document
  fetchData: async (userId) => {
    try {
      const userDoc = doc(db, "users", userId);
      const docSnap = await getDoc(userDoc);
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: true, data: null };
    } catch (e) {
      console.error("Cloud Fetch Error:", e);
      return { success: false, error: e.message || String(e) };
    }
  },

  // Save a historic backup snapshot before overwriting
  createBackupSnapshot: async (userId, data) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDoc = doc(db, "users", userId, "backups", timestamp);
      await setDoc(backupDoc, {
        ...data,
        backedUpAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Backup Snapshot Error:", e);
      return false;
    }
  },

  // Fetch all historical backups for user (checking both 'history' and 'backups' subcollections)
  fetchBackups: async (userId) => {
    try {
      const allHistory = [];

      // 1. Check 'history' subcollection
      try {
        const historyRef = collection(db, "users", userId, "history");
        const querySnap = await getDocs(historyRef);
        querySnap.forEach((doc) => {
          allHistory.push({ id: doc.id, ...doc.data() });
        });
      } catch (e) {
        console.error("History fetch error:", e);
      }

      // 2. Check 'backups' subcollection
      try {
        const backupsRef = collection(db, "users", userId, "backups");
        const querySnap = await getDocs(backupsRef);
        querySnap.forEach((doc) => {
          allHistory.push({ id: doc.id, ...doc.data() });
        });
      } catch (e) {
        console.error("Backups fetch error:", e);
      }

      // Sort descending by timestamp / archivedAt / backedUpAt / lastUpdated
      return allHistory.sort((a, b) => {
        const timeA = new Date(a.archivedAt?.toDate ? a.archivedAt.toDate() : (a.archivedAt || a.backedUpAt || a.lastUpdated || a.timestamp || 0)).getTime();
        const timeB = new Date(b.archivedAt?.toDate ? b.archivedAt.toDate() : (b.archivedAt || b.backedUpAt || b.lastUpdated || b.timestamp || 0)).getTime();
        return timeB - timeA;
      });
    } catch (e) {
      console.error("Cloud Fetch Backups Error:", e);
      return [];
    }
  }
};

// Password management functions
export const changeUserPassword = async (newPassword) => {
  try {
    if (!auth.currentUser) throw new Error("No user logged in");
    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (e) {
    console.error("Change Password Error:", e);
    return { success: false, error: e.message.replace('Firebase: ', '') };
  }
};

export const sendResetPasswordEmail = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (e) {
    console.error("Reset Email Error:", e);
    return { success: false, error: e.message.replace('Firebase: ', '') };
  }
};

