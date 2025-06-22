import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAEzP86t2HV71uL1TEy4PkiUSPQRHrCd68",
  authDomain: "movienight-f8f60.firebaseapp.com",
  projectId: "movienight-f8f60",
  storageBucket: "movienight-f8f60.firebasestorage.app",
  messagingSenderId: "1080550714257",
  appId: "1:1080550714257:web:442892f34f865ff1234830",
  measurementId: "G-B6L19411GY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Only connect to emulators in development
if (import.meta.env.DEV) {
  // Uncomment these lines if you want to use Firebase emulators in development
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;