import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBKpmlQ8f4VkkyzGftw7a0Qy_z11fkXe-8",
  authDomain: "quanlyxangdau-3fa49.firebaseapp.com",
  projectId: "quanlyxangdau-3fa49",
  storageBucket: "quanlyxangdau-3fa49.firebasestorage.app",
  messagingSenderId: "255173081788",
  appId: "1:255173081788:web:70cd57d9ed5b4ff38a2eb9",
  measurementId: "G-DZFEET01S9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Auth with AsyncStorage for persistence in React Native
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth, db };
export default app;
