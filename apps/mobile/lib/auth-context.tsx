import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@mygang/shared/database/types";

import { supabase } from "./supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  profileError: string | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  /**
   * Optimistically merge a partial update into the local profile state without
   * a server round-trip. Use this after a successful Supabase write so React
   * state reflects the new server state immediately — without depending on
   * refreshProfile() (which can hang on a flaky network and cause routing
   * bugs that depend on `profile.*` fields).
   */
  applyProfilePatch: (patch: Partial<ProfileRow>) => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  profileError: null,
  isLoading: true,
  refreshProfile: async () => {},
  applyProfilePatch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileRef = useRef<ProfileRow | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let mounted = true;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadProfile(userId: string): Promise<ProfileRow | null> {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    }

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("[auth] getSession error:", error);
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user.id) {
          try {
            const profileRow = await loadProfile(data.session.user.id);
            if (mounted) {
              setProfile(profileRow);
              setProfileError(null);
            }
          } catch (err) {
            console.warn("[auth] loadProfile failed:", err);
            if (mounted) {
              setProfileError(
                "We couldn't load your account. Check your connection and try again.",
              );
            }
          }
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
          const needsInitialProfile =
            profileRef.current?.id !== newSession.user.id;
          if (needsInitialProfile) setIsLoading(true);
          try {
            const profileRow = await loadProfile(newSession.user.id);
            if (mounted) {
              setProfile(profileRow);
              setProfileError(null);
            }
          } catch (err) {
            console.warn("[auth] auth-change profile load failed:", err);
            if (mounted && needsInitialProfile) {
              setProfileError(
                "We couldn't load your account. Check your connection and try again.",
              );
            }
          } finally {
            if (mounted && needsInitialProfile) setIsLoading(false);
          }
        } else {
          setProfile(null);
          setProfileError(null);
        }
      }
    );

    return () => {
      mounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      setProfile((data as ProfileRow | null) ?? null);
      setProfileError(null);
    } catch (err) {
      console.warn("[auth] refreshProfile error:", err);
      if (!profileRef.current) {
        setProfileError(
          "We couldn't load your account. Check your connection and try again.",
        );
      }
    }
  }, [session?.user.id]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void refreshProfile();
      }
    });
    return () => sub.remove();
  }, [refreshProfile]);

  function applyProfilePatch(patch: Partial<ProfileRow>) {
    setProfile((prev) => {
      if (prev) return { ...prev, ...patch };
      if (!session?.user.id) return prev;
      const now = new Date().toISOString();
      return {
        abuse_score: 0,
        avatar_style_preference: "robots",
        chat_mode: "gang_focus",
        chat_wallpaper: null,
        created_at: now,
        custom_character_names: null,
        daily_msg_count: 0,
        dodo_customer_id: null,
        gang_vibe_score: null,
        id: session.user.id,
        last_active_at: null,
        last_msg_reset: null,
        last_wywa_generated_at: null,
        low_cost_mode: false,
        onboarding_completed: false,
        pending_squad_downgrade: null,
        preferred_squad: null,
        purchase_celebration_pending: null,
        relationship_state: null,
        restored_members_pending: null,
        session_summary: null,
        subscription_tier: "free",
        summary_turns: null,
        theme: null,
        updated_at: now,
        user_profile: null,
        username: session.user.email ?? null,
        vibe_profile: null,
        ...patch,
      };
    });
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        profileError,
        isLoading,
        refreshProfile,
        applyProfilePatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
