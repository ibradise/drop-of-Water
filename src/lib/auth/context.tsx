"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { api, setTokenProvider, ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import { userSchema, type User } from "@/lib/schemas/user";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "needs-onboarding"; firebaseUser: FirebaseUser }
  | { status: "authenticated"; firebaseUser: FirebaseUser; user: User };

type AuthContextValue = {
  state: AuthState;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshDowProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function flattenUnknownError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return new Error(String((err as { message: unknown }).message));
  }
  return new Error("Unknown error");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    return isFirebaseConfigured() ? { status: "loading" } : { status: "unauthenticated" };
  });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setTokenProvider(async () => null);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setTokenProvider(async () => null);
      return;
    }

    setTokenProvider(async () => {
      const fb = auth.currentUser;
      if (!fb) return null;
      try {
        return await fb.getIdToken(/* forceRefresh */ false);
      } catch {
        return null;
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (fb) => {
      if (!fb) {
        setState({ status: "unauthenticated" });
        return;
      }
      try {
        const dow = await usersApi.me();
        setState({ status: "authenticated", firebaseUser: fb, user: dow });
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          setState({ status: "needs-onboarding", firebaseUser: fb });
        } else {
          console.error("Failed to load DoW profile", err);
          setState({ status: "needs-onboarding", firebaseUser: fb });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (): Promise<string | null> => {
    const auth = getFirebaseAuth();
    const fb = auth?.currentUser;
    if (!fb) return null;
    try {
      return await fb.getIdToken();
    } catch {
      return null;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    setState({ status: "unauthenticated" });
  };

  const resetPassword = async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured");
    await sendPasswordResetEmail(auth, email);
  };

  const refreshDowProfile = async () => {
    if (state.status !== "needs-onboarding" && state.status !== "authenticated") return;
    const fb = state.firebaseUser;
    try {
      const dow = await usersApi.me();
      setState({ status: "authenticated", firebaseUser: fb, user: dow });
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 401) throw flattenUnknownError(err);
      setState({ status: "needs-onboarding", firebaseUser: fb });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshDowProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function useCurrentUser(): User | null {
  const { state } = useAuth();
  return state.status === "authenticated" ? state.user : null;
}

export function userToJSON(value: unknown): User {
  return userSchema.parse(value);
}

// Re-export for convenience
export { api };
