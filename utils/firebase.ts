import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFiH2iOjPhKxxTu-PHCZJmy0orF1KZ1T4",
  authDomain: "trackit-1d8f4.firebaseapp.com",
  projectId: "trackit-1d8f4",
  storageBucket: "trackit-1d8f4.firebasestorage.app",
  messagingSenderId: "638799693936",
  appId: "1:638799693936:web:086bb763456f682b388cb5",
  measurementId: "G-DZDWNGSHJD"
};

// Initialize Firebase safely
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export let analytics: any = null;

if (typeof window !== 'undefined') {
  try {
    // Only attempt if browser environment allows it
    const maybePromise = isSupported ? isSupported() : Promise.resolve(false);
    maybePromise.then(supported => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (err) {
          console.warn("Analytics not initialized:", err);
        }
      }
    }).catch(() => {});
  } catch (e) {
    // Ignore analytics errors in restricted environments
  }
}