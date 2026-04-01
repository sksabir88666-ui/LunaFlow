import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "sksabir-2eb4c.firebaseapp.com",
  projectId: "sksabir-2eb4c",
};

const app = initializeApp(firebaseConfig);

// ✅ exports
export const auth = getAuth(app);
export const db = getFirestore(app);

// optional (error handler dummy)
export const handleFirestoreError = (error: any) => {
  console.error(error);
};

// optional enum (temporary fix)
export enum OperationType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE"
}