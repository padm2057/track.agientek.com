import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;