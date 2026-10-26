import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { DEMO_AGRONOMIST, DEVICE_SESSION, isDemoAgronomist } from "@/lib/agronomist-accounts";
import { isAgronomistClaims, type AuthClaims } from "@/lib/agronomist-dashboard";

// The dashboard's session state. Role checks in the browser only decide what to
// show; every write is checked again on the server and by the database.
//
// A deployment whose cloud sign-in is not configured or not enabled can still
// unlock the shared reviewer account: the same credentials printed under the
// form open a session kept in this browser. No other address gets that path, and
// the page says plainly that the session and its records live on this device.

export type AgronomistAuthStatus = "loading" | "signedOut" | "signedIn" | "unavailable";

export type AgronomistAuthSource = "cloud" | "device" | null;

export type AgronomistAuth = {
  status: AgronomistAuthStatus;
  /** Where the current session lives, so the page can say it is device-only. */
  source: AgronomistAuthSource;
  userId: string | null;
  email: string | null;
  name: string | null;
  isAgronomist: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

type SessionUser = {
  id: string;
  email?: string | null;
  app_metadata?: { role?: string };
  user_metadata?: { full_name?: string };
};

type LocalSession = { email: string; name: string; signedInAt: string };

const LOCAL_SESSION_KEY = "imbutosmart-agronomist-session-v1";

function readLocalSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSession | null;
    // A stored session is only honoured for the one address the page prints.
    if (!parsed || !isDemoAgronomist(parsed.email)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalSession(email: string) {
  if (typeof window === "undefined") return;
  const session: LocalSession = {
    email,
    name: DEVICE_SESSION.name,
    signedInAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    // A browser that blocks storage still holds the session for this visit.
  }
}

function clearLocalSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {
    // Nothing else to do; the in-memory state is cleared below.
  }
}

const EMPTY_IDENTITY = {
  userId: null as string | null,
  email: null as string | null,
  name: null as string | null,
  isAgronomist: false,
};

function fromUser(user: SessionUser | null | undefined): {
  userId: string | null;
  email: string | null;
  name: string | null;
  isAgronomist: boolean;
} {
  if (!user) return EMPTY_IDENTITY;
  const claims = {
    sub: user.id,
    email: user.email ?? undefined,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  } as AuthClaims;
  return {
    userId: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.email ?? null,
    isAgronomist: isAgronomistClaims(claims),
  };
}

function fromLocalSession(session: LocalSession) {
  return {
    userId: DEVICE_SESSION.userId,
    email: session.email,
    name: session.name,
    isAgronomist: true,
  };
}

export function useAgronomistAuth(): AgronomistAuth {
  const [status, setStatus] = useState<AgronomistAuthStatus>("loading");
  const [source, setSource] = useState<AgronomistAuthSource>(null);
  const [identity, setIdentity] = useState<ReturnType<typeof fromUser>>(EMPTY_IDENTITY);
  const [error, setError] = useState<string | null>(null);

  const applyLocal = useCallback((session: LocalSession) => {
    setIdentity(fromLocalSession(session));
    setSource("device");
    setStatus("signedIn");
    setError(null);
  }, []);

  const applyCloud = useCallback((user: SessionUser | null | undefined) => {
    setIdentity(fromUser(user));
    setSource("cloud");
    setStatus(user ? "signedIn" : "signedOut");
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = data.session?.user as SessionUser | undefined;
      if (user) {
        clearLocalSession();
        applyCloud(user);
        return;
      }
      const local = readLocalSession();
      if (local) {
        applyLocal(local);
        return;
      }
      setIdentity(EMPTY_IDENTITY);
      setSource(null);
      setStatus("signedOut");
      setError(null);
    } catch (caught) {
      // No Supabase configuration is not a dashboard failure: the shared
      // reviewer account can still sign in on this device.
      const local = readLocalSession();
      if (local) {
        applyLocal(local);
        return;
      }
      setIdentity(EMPTY_IDENTITY);
      setSource(null);
      setError(caught instanceof Error ? caught.message : null);
      setStatus("unavailable");
    }
  }, [applyCloud, applyLocal]);

  useEffect(() => {
    void refresh();
    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user as SessionUser | undefined;
        if (user) {
          clearLocalSession();
          applyCloud(user);
        } else if (!readLocalSession()) {
          setIdentity(EMPTY_IDENTITY);
          setSource(null);
          setStatus("signedOut");
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // The initial refresh already reports an unavailable configuration.
    }
    return () => unsubscribe?.();
  }, [applyCloud, refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const address = email.trim();
      let cloudMessage: string | null = null;
      let cloudUnreachable = false;

      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });

        if (!signInError) {
          clearLocalSession();
          applyCloud(data.user as SessionUser | null);
          return { ok: true };
        }

        cloudMessage = signInError.message;

        // The shared reviewer account is created the first time it is used, so a
        // demonstration needs nobody to provision it by hand. Every other
        // address must already exist.
        if (isDemoAgronomist(address) && /invalid login credentials/i.test(signInError.message)) {
          const { data: created, error: createError } = await supabase.auth.signUp({
            email: address,
            password,
            options: { data: { full_name: DEVICE_SESSION.name } },
          });
          if (!createError) {
            if (created.session) {
              clearLocalSession();
              applyCloud(created.user as SessionUser | null);
              return { ok: true };
            }
            const message =
              "The shared account was created. Confirm its email address, then sign in again.";
            setError(message);
            return { ok: false, message };
          }
          cloudMessage = createError.message;
        }
      } catch (caught) {
        cloudUnreachable = true;
        cloudMessage = caught instanceof Error ? caught.message : "Sign-in is unavailable.";
      }

      // The printed shared password is the gate for a device session. Any other
      // address still needs the cloud provider, and a wrong password is still an
      // error rather than a free pass.
      if (isDemoAgronomist(address) && password === DEMO_AGRONOMIST.password) {
        writeLocalSession(address);
        applyLocal({ email: address, name: DEVICE_SESSION.name, signedInAt: "" });
        return { ok: true };
      }

      if (cloudUnreachable) setStatus("unavailable");
      const message = cloudMessage ?? "Sign-in is unavailable.";
      setError(message);
      return { ok: false, message };
    },
    [applyCloud, applyLocal],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // The local state is still cleared, so the page does not stay unlocked.
    }
    clearLocalSession();
    setIdentity(EMPTY_IDENTITY);
    setSource(null);
    setStatus("signedOut");
    setError(null);
  }, []);

  return {
    status,
    source,
    ...identity,
    error,
    signIn,
    signOut,
    refresh,
  };
}
