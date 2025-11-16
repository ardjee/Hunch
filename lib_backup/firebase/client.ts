
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";
// To use Firebase Authentication, import getAuth
// import { getAuth } from 'firebase/auth';

// The Firebase config is loaded from environment variables.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage;

// This check is now simplified as the config is hardcoded
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase Client: Firebase app initialized successfully from environment variables.");
    } catch (error) {
      console.error("Firebase Client: Error during Firebase app initialization:", error);
      app = undefined; // Ensure app is undefined on error
    }
  } else {
    app = getApp();
    console.log("Firebase Client: Firebase app already initialized, getting existing app.");
  }

  if (app) {
    try {
      db = getFirestore(app);
      storage = getStorage(app);
      console.log("Firebase Client: Firestore and Storage instances obtained successfully.");
    } catch (error) {
      console.error("Firebase Client: Error obtaining Firestore or Storage instance:", error);
      db = undefined; // Ensure db is undefined on error
      storage = undefined;
    }
  } else {
    // This message will now only appear if app initialization actually failed.
    console.error("Firebase Client: Firestore instance could not be obtained because Firebase App was not properly initialized.");
  }
} else {
    console.error(
    "Firebase Client CRITICAL ERROR: Firebase config is missing from environment variables. " +
    "Please check your .env.local file."
  );
}


// const auth = getAuth(app); // Uncomment if you plan to use Firebase Authentication and app is guaranteed to be initialized

export { app, db, storage /*, auth */ };
