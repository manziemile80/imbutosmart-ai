import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { isAgronomistClaims, type AuthClaims } from "@/lib/agronomist-dashboard";

// The dashboard's session state. Role checks in the browser only decide what to
// show; every write is checked again on the server and by the database.

export type AgronomistAuthStatus = "loading" | "signedOut" | "signedIn" | "unavailable";

export type AgronomistAuth = {
  status: AgronomistAuthStatus;
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

function fromUser(user: SessionUser | null | undefined): {
  userId: string | null;
  email: string | null;
  name: string | null;
  isAgronomist: boolean;
} {
  if (!user) {
    return { userId: null, email: null, name: null, isAgronomist: false };
  }
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

export function useAgronomistAuth(): AgronomistAuth {
  const [status, setStatus] = useState<AgronomistAuthStatus>("loading");
  const [identity, setIdentity] = useState<ReturnType<typeof fromUser>>({
    userId: null,
    email: null,
    name: null,
    isAgronomist: false,
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        setStatus("unavailable");
        return;
      }
      const user = data.session?.user as SessionUser | undefined;
      setIdentity(fromUser(user));
      setStatus(user ? "signedIn" : "signedOut");
      setError(null);
    } catch (caught) {
      // No Supabase configuration is not a dashboard failure: the reference
      // catalogue and published figures still work.
      setError(caught instanceof Error ? caught.message : null);
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user as SessionUser | undefined;
        setIdentity(fromUser(user));
        setStatus(user ? "signedIn" : "signedOut");
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // The initial refresh already reports an unavailable configuration.
    }
    return () => unsubscribe?.();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return { ok: false, message: signInError.message };
      }
      const user = data.user as SessionUser | null;
      setIdentity(fromUser(user));
      setStatus(user ? "signedIn" : "signedOut");
      setError(null);
      return { ok: true };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Sign-in is unavailable.";
      setStatus("unavailable");
      setError(message);
      return { ok: false, message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // The local state is still cleared, so the page does not stay unlocked.
    }
    setIdentity({ userId: null, email: null, name: null, isAgronomist: false });
    setStatus("signedOut");
  }, []);

  return {
    status,
    ...identity,
    error,
    signIn,
    signOut,
    refresh,
  };
}
