import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);

        if (firebaseUser) {
          // Fetch or create Firestore profile
          try {
            const profileRef = doc(db, 'users', firebaseUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
              setProfile(profileSnap.data() as UserProfile);
            } else {
              // First sign-in — create profile document
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || undefined,
                createdAt: new Date().toISOString(),
              };
              await setDoc(profileRef, { ...newProfile, createdAt: serverTimestamp() });
              setProfile(newProfile);
            }
          } catch (firestoreError) {
            console.warn('Firestore profile error (non-blocking):', firestoreError);
            // Still allow the user in — profile will be created on next launch
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth state listener error:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: displayName.trim() });

    // Create Firestore profile
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email.trim(),
      displayName: displayName.trim(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), {
      ...newProfile,
      createdAt: serverTimestamp(),
    });
    setProfile(newProfile);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateDisplayName = async (name: string) => {
    if (!user) return;
    await updateProfile(user, { displayName: name.trim() });
    await setDoc(doc(db, 'users', user.uid), { displayName: name.trim() }, { merge: true });
    setProfile((prev) => (prev ? { ...prev, displayName: name.trim() } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
