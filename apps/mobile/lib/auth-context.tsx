import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@mygang/shared/database/types";

import { supabase } from "./supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadProfile(userId: string): Promise<ProfileRow | null> {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) console.warn("[auth] loadProfile error:", error);
        return (data as ProfileRow | null) ?? null;
      } catch (err) {
        console.warn("[auth] loadProfile threw:", err);
        return null;
      }
    }

    async function init() {
      try {
        console.log("[auth] init: calling getSession");
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("[auth] getSession error:", error);
        if (!mounted) return;
        console.log("[auth] init: session =", data.session ? "present" : "null");
        setSession(data.session);
        if (data.session?.user.id) {
          const profileRow = await loadProfile(data.session.user.id);
          if (mounted) setProfile(profileRow);
        }
      } catch (err) {
        console.warn("[auth] init failed:", err);
      } finally {
        if (mounted) setIsLoading(false);
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
      }
    }

    // Safety net: if init hangs (network down, corrupt session, etc.),
    // unblock the UI so the user lands on sign-in instead of a forever-spinner.
    safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn("[auth] init timed out after 10s — unblocking UI");
        setIsLoading(false);
      }
    }, 10000);

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user.id) {
          const profileRow = await loadProfile(newSession.user.id);
          if (mounted) setProfile(profileRow);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile((data as ProfileRow | null) ?? null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
