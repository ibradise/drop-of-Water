"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { getFirebaseAuth, getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/client";
import { setTokenProvider, ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import { notificationsApi } from "@/lib/api/notifications";
import type { User } from "@/lib/schemas/user";

const MOCK_TOKEN_KEY = "dow.mock.token";
const MOCK_EMAIL_KEY = "dow.mock.email";
const MOCK_NAME_KEY = "dow.mock.name";
const MOCK_UID_KEY = "dow.mock.uid";

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
  devSignIn: (mode: "anon" | "meron") => Promise<void>;
  isMockMode: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function makeMockFirebaseUser(): FirebaseUser {
  const token = localStorage.getItem(MOCK_TOKEN_KEY) ?? "mock-anon";
  const email = localStorage.getItem(MOCK_EMAIL_KEY) ?? "demo@example.com";
  const name = localStorage.getItem(MOCK_NAME_KEY) ?? "Demo User";
  const uid = localStorage.getItem(MOCK_UID_KEY) ?? "mock-uid";
  return {
    uid,
    email,
    displayName: name,
    emailVerified: false,
    isAnonymous: false,
    phoneNumber: null,
    photoURL: null,
    providerId: "firebase",
    refreshToken: "",
    tenantId: null,
    metadata: { creationTime: undefined, lastSignInTime: undefined },
    providerData: [],
    delete: async () => {},
    getIdToken: async () => token,
    getIdTokenResult: async () => ({
      authTime: "",
      expirationTime: "",
      issuedAtTime: "",
      signInProvider: "custom",
      signInSecondFactor: null,
      token: "",
      claims: {},
    }),
    reload: async () => {},
    toJSON: () => ({ uid, email, displayName: name, emailVerified: false }),
  } as unknown as FirebaseUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isMockMode = process.env.NEXT_PUBLIC_API_MOCK === "true";
  const firebaseConfigured = isFirebaseConfigured();
  const qc = useQueryClient();
  const [state, setState] = useState<AuthState>(() => {
    if (isMockMode) return { status: "loading" };
    return firebaseConfigured ? { status: "loading" } : { status: "unauthenticated" };
  });

  const refreshDowProfile = useCallback(async (fb: FirebaseUser) => {
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
  }, []);

  useEffect(() => {
    if (isMockMode) {
      // In mock mode, read a fake token from localStorage and synthesize a Firebase User.
      setTokenProvider(async () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(MOCK_TOKEN_KEY);
      });
      if (typeof window === "undefined") return;
      const token = localStorage.getItem(MOCK_TOKEN_KEY);
      if (!token) {
        // Defer to the effect path; do not call setState synchronously here.
        Promise.resolve().then(() => setState({ status: "unauthenticated" }));
        return;
      }
      const fb = makeMockFirebaseUser();
      queueMicrotask(() => {
        void refreshDowProfile(fb);
      });
      return;
    }

    if (!firebaseConfigured) {
      setTokenProvider(async () => null);
      queueMicrotask(() => setState({ status: "unauthenticated" }));
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setTokenProvider(async () => null);
      queueMicrotask(() => setState({ status: "unauthenticated" }));
      return;
    }

    setTokenProvider(async () => {
      const fb = auth.currentUser;
      if (!fb) return null;
      try {
        return await fb.getIdToken(false);
      } catch {
        return null;
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (fb) => {
      if (!fb) {
        setState({ status: "unauthenticated" });
        return;
      }
      await refreshDowProfile(fb);
    });

    return () => unsubscribe();
  }, [firebaseConfigured, isMockMode, refreshDowProfile]);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (isMockMode) {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(MOCK_TOKEN_KEY);
    }
    const auth = getFirebaseAuth();
    const fb = auth?.currentUser;
    if (!fb) return null;
    try {
      return await fb.getIdToken();
    } catch {
      return null;
    }
  }, [isMockMode]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (isMockMode) {
        if (typeof window === "undefined") return;
        localStorage.setItem(MOCK_TOKEN_KEY, "mock-meron");
        localStorage.setItem(MOCK_EMAIL_KEY, email);
        localStorage.setItem(MOCK_NAME_KEY, email.split("@")[0] ?? "Demo User");
        localStorage.setItem(MOCK_UID_KEY, "mock-meron-uid");
        const fb = makeMockFirebaseUser();
        await refreshDowProfile(fb);
        return;
      }
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured");
      await signInWithEmailAndPassword(auth, email, password);
    },
    [isMockMode, refreshDowProfile],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (isMockMode) {
        if (typeof window === "undefined") {
          throw new Error("Mock signup must run in the browser");
        }
        // Anonymous token first; /onboarding will create the DoW profile and we'll swap the token.
        localStorage.setItem(MOCK_TOKEN_KEY, "mock-anon");
        localStorage.setItem(MOCK_EMAIL_KEY, email);
        localStorage.setItem(MOCK_NAME_KEY, email.split("@")[0] ?? "New User");
        localStorage.setItem(MOCK_UID_KEY, `mock-uid-${Date.now().toString(36)}`);
        const fb = makeMockFirebaseUser();
        await refreshDowProfile(fb);
        return fb;
      }
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return cred.user;
    },
    [isMockMode, refreshDowProfile],
  );

  const signInWithGoogle = useCallback(async () => {
    if (isMockMode) {
      await signInWithEmail("meron@example.com", "mock-password");
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, [isMockMode, signInWithEmail]);

  const signOut = useCallback(async () => {
    if (isMockMode) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(MOCK_TOKEN_KEY);
        localStorage.removeItem(MOCK_EMAIL_KEY);
        localStorage.removeItem(MOCK_NAME_KEY);
        localStorage.removeItem(MOCK_UID_KEY);
      }
      qc.clear();
      setState({ status: "unauthenticated" });
      return;
    }
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    qc.clear();
    setState({ status: "unauthenticated" });
  }, [isMockMode, qc]);

  const resetPassword = useCallback(
    async (email: string) => {
      if (isMockMode) return;
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured");
      await sendPasswordResetEmail(auth, email);
    },
    [isMockMode],
  );

  const refreshDowProfilePublic = useCallback(async () => {
    if (state.status !== "needs-onboarding" && state.status !== "authenticated") return;
    await refreshDowProfile(state.firebaseUser);
  }, [refreshDowProfile, state]);

  useFcmAutoRegistration(state, isMockMode, firebaseConfigured);

  const devSignIn = useCallback(
    async (mode: "anon" | "meron") => {
      if (!isMockMode) throw new Error("devSignIn is only available in mock mode");
      if (typeof window === "undefined") return;
      const token = mode === "meron" ? "mock-meron" : "mock-anon";
      localStorage.setItem(MOCK_TOKEN_KEY, token);
      localStorage.setItem(
        MOCK_EMAIL_KEY,
        mode === "meron" ? "meron@example.com" : "guest@example.com",
      );
      localStorage.setItem(MOCK_NAME_KEY, mode === "meron" ? "Meron Tadesse" : "Guest");
      localStorage.setItem(MOCK_UID_KEY, token);
      const fb = makeMockFirebaseUser();
      await refreshDowProfile(fb);
    },
    [isMockMode, refreshDowProfile],
  );

  return (
    <AuthContext.Provider
      value={{
        state,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshDowProfile: refreshDowProfilePublic,
        getIdToken,
        devSignIn,
        isMockMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// FCM auto-registration: once a user becomes authenticated, request browser
// permission, get the device token, and POST it to /notifications/device-tokens.
// Runs at most once per session per user. Errors are swallowed — push is
// opt-in and a failure here must never break sign-in.
function useFcmAutoRegistration(
  state: AuthState,
  isMockMode: boolean,
  firebaseConfigured: boolean,
) {
  const lastRegisteredFor = useRef<string | null>(null);

  useEffect(() => {
    if (state.status !== "authenticated") return;
    if (isMockMode) return; // No real Firebase project in mock mode.
    if (!firebaseConfigured) return;
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") return;

    const userKey = state.user.id;
    if (lastRegisteredFor.current === userKey) return;
    lastRegisteredFor.current = userKey;

    (async () => {
      try {
        let permission: NotificationPermission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") return;

        const { getToken } = await import("firebase/messaging");
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        const token = await getToken(messaging, {
          vapidKey: vapidKey || undefined,
          serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });
        if (!token) return;

        await notificationsApi.registerDevice(token);
      } catch (err) {
        // Best-effort. Log only.
        console.warn("FCM auto-registration failed", err);
      }
    })();
  }, [state, isMockMode, firebaseConfigured]);
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
