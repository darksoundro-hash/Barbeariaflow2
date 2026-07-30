import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { FirebaseStorage, getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id"
};

let app: FirebaseApp | undefined;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Erro ao inicializar Firebase (Verifique suas chaves no .env):", error);
}

export const db: Firestore | null = app ? getFirestore(app) : null;

export const auth: Auth | null = app ? getAuth(app) : null;

export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

export async function uploadImage(base64: string, path: string): Promise<string> {
  if (!storage) throw new Error('Storage não disponível');
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64, 'data_url');
  return getDownloadURL(storageRef);
}

export default app;

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
