import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  enableIndexedDbPersistence,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable Offline-First persistence for mobile & desktop
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
    console.warn('Offline persistence warning:', err);
  }
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export interface CloudBackupRecord {
  id: string;
  ownerId: string;
  workspaceName: string;
  payload: string;
  updatedAt?: unknown;
}

export async function saveCloudBackup(
  backupId: string,
  workspaceName: string,
  payloadObj: unknown
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const safeId = backupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || 'default_workspace';
  const serialized = JSON.stringify(payloadObj);
  if (serialized.length > 890000) {
    throw new Error('Backup size exceeds 900KB limit');
  }

  const docRef = doc(db, 'backups', safeId);
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        workspaceName: workspaceName.slice(0, 100) || 'پڕۆفایلی سەرەکی',
        payload: serialized,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ownerId: user.uid,
        workspaceName: workspaceName.slice(0, 100) || 'پڕۆفایلی سەرەکی',
        payload: serialized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `backups/${safeId}`);
  }
}

export async function listUserCloudBackups(): Promise<CloudBackupRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(collection(db, 'backups'), where('ownerId', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CloudBackupRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'backups');
  }
}

export async function pushSharedFamilyWorkspace(
  inviteCode: string,
  workspaceName: string,
  payloadObj: unknown
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const cleanCode = inviteCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (cleanCode.length < 4 || cleanCode.length > 32) {
    throw new Error('کۆدی خێزان دەبێت لە ٤ بۆ ٣٢ پیت یان ژمارە پێکهاتبێت');
  }

  const serialized = JSON.stringify(payloadObj);
  if (serialized.length > 890000) {
    throw new Error('Backup size exceeds 900KB limit');
  }

  const docRef = doc(db, 'shared_workspaces', cleanCode);
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        workspaceName: workspaceName.slice(0, 100) || 'خێزانی هاوبەش',
        payload: serialized,
        updatedBy: user.email || user.uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ownerId: user.uid,
        workspaceName: workspaceName.slice(0, 100) || 'خێزانی هاوبەش',
        payload: serialized,
        updatedBy: user.email || user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `shared_workspaces/${cleanCode}`);
  }
}

export function subscribeSharedFamilyWorkspace(
  inviteCode: string,
  onData: (payload: unknown, updatedBy?: string) => void
): Unsubscribe {
  const cleanCode = inviteCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const docRef = doc(db, 'shared_workspaces', cleanCode);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.payload) {
          try {
            onData(JSON.parse(data.payload), data.updatedBy);
          } catch {
            // ignore parse error
          }
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `shared_workspaces/${cleanCode}`);
    }
  );
}
