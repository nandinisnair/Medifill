/**
 * Firestore sync service — handles bidirectional sync of medicines for the
 * authenticated user. Local AsyncStorage remains the primary source of truth
 * for offline-first behaviour; Firestore is the cloud backup.
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirestoreMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  totalQuantity: number;
  currentQuantity: number;
  expiryDate: string;
  notes?: string;
  createdAt: string;
  interactions?: string[];
  timeToTake?: string[];
  patientId?: string;
  patientName?: string;
  patientRelationship?: string;
  updatedAt?: any; // serverTimestamp
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Upsert a single medicine document under the user's sub-collection.
 * Path: users/{uid}/medicines/{medicineId}
 */
export async function saveMedicineToCloud(
  uid: string,
  medicine: FirestoreMedicine
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'medicines', medicine.id);
    await setDoc(ref, { ...medicine, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.warn('[FirestoreSync] saveMedicine error:', error);
  }
}

/**
 * Batch-save all medicines (used for initial upload or full resync).
 */
export async function saveAllMedicinesToCloud(
  uid: string,
  medicines: FirestoreMedicine[]
): Promise<void> {
  try {
    const promises = medicines.map((m) => saveMedicineToCloud(uid, m));
    await Promise.all(promises);
  } catch (error) {
    console.warn('[FirestoreSync] saveAllMedicines error:', error);
  }
}

/**
 * Delete a single medicine document from the cloud.
 */
export async function deleteMedicineFromCloud(
  uid: string,
  medicineId: string
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'medicines', medicineId);
    await deleteDoc(ref);
  } catch (error) {
    console.warn('[FirestoreSync] deleteMedicine error:', error);
  }
}

// ─── Real-time listener ───────────────────────────────────────────────────────

/**
 * Subscribe to real-time updates from Firestore for a user's medicines.
 * Returns an unsubscribe function.
 */
export function subscribeMedicines(
  uid: string,
  onData: (medicines: FirestoreMedicine[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'medicines'));

  return onSnapshot(
    q,
    (snapshot) => {
      const medicines: FirestoreMedicine[] = [];
      snapshot.forEach((docSnap) => {
        medicines.push({ id: docSnap.id, ...docSnap.data() } as FirestoreMedicine);
      });
      onData(medicines);
    },
    (error) => {
      console.warn('[FirestoreSync] subscribeMedicines error:', error);
      onError?.(error as Error);
    }
  );
}
