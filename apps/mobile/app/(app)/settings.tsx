import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  Crown,
  ExternalLink,
  FileText,
  Info,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import {
  AVATAR_STYLES,
  CHAT_WALLPAPERS,
  DEFAULT_AVATAR_STYLE,
  getTierCopy,
  getTierFromProfile,
  type AvatarStyle,
  type ChatWallpaper,
} from "@mygang/shared";

import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { clearPersistedMessages } from "../../lib/chat-storage";
import { ConfirmDialog } from "../../components/confirm-dialog";

const STYLE_LABELS: Record<AvatarStyle, string> = {
  robots: "Robots",
  human: "Human",
  retro: "Retro",
};

type ChatMode = "gang_focus" | "ecosystem";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [savingField, setSavingField] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Destructive actions confirmation state
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const [deleteMemoriesOpen, setDeleteMemoriesOpen] = useState(false);
  const [startFreshOpen, setStartFreshOpen] = useState(false);

  // Inline Danger Zone (delete account) state
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const tier = getTierFromProfile(profile?.subscription_tier ?? null);
  const tierCopy = getTierCopy(tier);
  const currentStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;
  const currentWallpaper: ChatWallpaper =
    (profile?.chat_wallpaper as ChatWallpaper) ?? "default";
  const currentChatMode: ChatMode =
    (profile?.chat_mode as ChatMode) ?? "gang_focus";

  async function updateProfileField(
    field: string,
    value: string,
    label: string
  ) {
    if (!user) return;
    setSavingField(field);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    setSavingField(null);
    if (error) {
      Alert.alert("Could not save", error.message);
      return;
    }
    await refreshProfile();
  }

  async function signOut() {
    if (user?.id) {
      await clearPersistedMessages(user.id);
    }
    await supabase.auth.signOut();
  }

  async function submitChangeEmail() {
    const email = newEmail.trim();
    if (!email) return;
    setEmailSubmitting(true);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailSubmitting(false);
    if (error) {
      Alert.alert("Could not change email", error.message);
      return;
    }
    setEmailSentTo(email);
    setNewEmail("");
  }

  async function submitChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Re-enter and try again.");
      return;
    }
    setPasswordSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSubmitting(false);
    if (error) {
      Alert.alert("Could not update password", error.message);
      return;
    }
    setPasswordSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  }

  function confirmSignOut() {
    setSignOutOpen(true);
  }

  // Destructive: delete all chat history rows for this user.
  async function runDeleteAllChat() {
    if (!user) return;
    const { error } = await supabase
      .from("chat_history")
      .delete()
      .eq("user_id", user.id);
    if (error) {
      Alert.alert("Could not delete chat", error.message);
      return;
    }
    await clearPersistedMessages(user.id);
    Alert.alert("Chat cleared", "Your chat history has been deleted.");
  }

  // Destructive: delete all memory rows for this user.
  async function runDeleteAllMemories() {
    if (!user) return;
    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("user_id", user.id);
    if (error) {
      Alert.alert("Could not delete memories", error.message);
      return;
    }
    Alert.alert("Memories cleared", "Your gang has forgotten everything.");
  }

  // Destructive: clear chat + memories + reset gang + flip onboarding flag.
  // Route gate redirects to /(app)/onboarding once onboarding_completed flips.
  async function runStartFresh() {
    if (!user) return;
    const purges = [
      supabase.from("chat_history").delete().eq("user_id", user.id),
      supabase.from("memories").delete().eq("user_id", user.id),
      supabase.from("gang_members").delete().eq("user_id", user.id),
    ];
    const results = await Promise.all(purges);
    const purgeError = results.find((r) => r.error)?.error;
    if (purgeError) {
      Alert.alert("Could not start fresh", purgeError.message);
      return;
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        preferred_squad: [],
        custom_character_names: null,
        vibe_profile: null,
        onboarding_completed: false,
      })
      .eq("id", user.id);
    if (profileError) {
      Alert.alert("Could not start fresh", profileError.message);
      return;
    }
    await clearPersistedMessages(user.id);
    await refreshProfile();
    // Route gate routes to /(app)/onboarding when onboarding_completed=false.
  }

  // Inline delete-account: typed-email gate (matches account email),
  // then ConfirmDialog two-step, then call /api/account/delete server route.
  const expectedEmail = (user?.email ?? "").trim().toLowerCase();
  const deleteEmailMatches =
    deleteEmailInput.trim().toLowerCase() === expectedEmail;

  async function runDeleteAccount() {
    if (!user || !deleteEmailMatches) return;
    setDeletingAccount(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      Alert.alert("Not signed in", "Please sign in again before deleting.");
      setDeletingAccount(false);
      return;
    }
    let response: Response;
    try {
      response = await fetch("https://www.mygang.ai/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      Alert.alert(
        "Could not delete account",
        err instanceof Error ? err.message : "Network error",
      );
      setDeletingAccount(false);
      return;
    }
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) message = data.error;
      } catch {
        // non-JSON response
      }
      Alert.alert("Could not delete account", message);
      setDeletingAccount(false);
      return;
    }
    if (user.id) await clearPersistedMessages(user.id);
    await supabase.auth.signOut();
    // Route gate routes to /(auth)/sign-in on session change.
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="border-b border-border px-5 pb-4 pt-12">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </Text>
            <Text className="mt-1 text-3xl font-black text-foreground">
              Your Control Center
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
          >
            <ChevronLeft size={12} color="#a1a1aa" strokeWidth={2.5} />
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Back to chat
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerClassName="pb-12">
        {/* Account section */}
        <View className="mt-5 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Account
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40 p-6">
            <Text className="text-2xl font-black text-foreground">
              {profile?.username ?? "(unset)"}
            </Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {user?.email ?? "(unknown)"}
            </Text>
          </View>
        </View>

        {/* Account Settings */}
        <View className="mt-5 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Account Settings
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            {/* Change Email row */}
            <View className="border-b border-border/40 px-5 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-foreground">Change email</Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground/70">
                    A confirmation will be sent to your new email.
                  </Text>
                </View>
                {!emailOpen ? (
                  <Pressable
                    onPress={() => {
                      setEmailOpen(true);
                      setEmailSentTo(null);
                    }}
                    className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
                  >
                    <Mail size={12} color="#a1a1aa" strokeWidth={2.5} />
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Change email
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {emailOpen && !emailSentTo ? (
                <View className="mt-3 gap-2">
                  <TextInput
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="new@email.com"
                    placeholderTextColor="#71717a"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setEmailOpen(false);
                        setNewEmail("");
                      }}
                      className="h-10 flex-1 items-center justify-center rounded-xl border border-border bg-card"
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={submitChangeEmail}
                      disabled={emailSubmitting || !newEmail.trim()}
                      className={`h-10 flex-1 items-center justify-center rounded-xl ${
                        emailSubmitting || !newEmail.trim() ? "bg-muted" : "bg-primary"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold uppercase tracking-wider ${
                          emailSubmitting || !newEmail.trim()
                            ? "text-muted-foreground/70"
                            : "text-primary-foreground"
                        }`}
                      >
                        {emailSubmitting ? "Sending..." : "Send change link"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {emailSentTo ? (
                <View className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                  <Text className="text-xs text-primary">
                    Check your email at <Text className="font-bold">{emailSentTo}</Text> to confirm the change.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Change Password row */}
            <View className="px-5 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-foreground">Change password</Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground/70">
                    Must be at least 6 characters.
                  </Text>
                </View>
                {!passwordOpen ? (
                  <Pressable
                    onPress={() => {
                      setPasswordOpen(true);
                      setPasswordSuccess(false);
                    }}
                    className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
                  >
                    <Lock size={12} color="#a1a1aa" strokeWidth={2.5} />
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Change password
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {passwordOpen && !passwordSuccess ? (
                <View className="mt-3 gap-2">
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password (6+ chars)"
                    placeholderTextColor="#71717a"
                    secureTextEntry
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="#71717a"
                    secureTextEntry
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setPasswordOpen(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="h-10 flex-1 items-center justify-center rounded-xl border border-border bg-card"
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={submitChangePassword}
                      disabled={passwordSubmitting || newPassword.length < 6}
                      className={`h-10 flex-1 items-center justify-center rounded-xl ${
                        passwordSubmitting || newPassword.length < 6 ? "bg-muted" : "bg-primary"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold uppercase tracking-wider ${
                          passwordSubmitting || newPassword.length < 6
                            ? "text-muted-foreground/70"
                            : "text-primary-foreground"
                        }`}
                      >
                        {passwordSubmitting ? "Updating..." : "Save password"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {passwordSuccess ? (
                <View className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                  <Text className="text-xs text-primary">Password updated.</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Promo / Pro status card */}
        {tier === "free" ? (
          <View className="mt-5 px-4">
            <Pressable
              onPress={() => router.push("/(app)/pricing")}
              className="overflow-hidden rounded-3xl"
            >
              <LinearGradient
                colors={["rgba(62,221,192,0.18)", "rgba(213,109,181,0.10)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 1, borderRadius: 24 }}
              >
                <View className="rounded-3xl bg-background/80 p-5">
                  <View className="flex-row items-center gap-1.5 self-start rounded-full bg-accent/15 px-2.5 py-1">
                    <Sparkles size={11} color="#f0abfc" strokeWidth={2.5} />
                    <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                      80% OFF — LAUNCH WEEK
                    </Text>
                  </View>
                  <Text className="mt-3 text-xl font-black text-foreground">
                    Unlock the full gang experience
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    You're on the free tier (25/hr, preview memory + light recall). The full vault opens up when you're ready.
                  </Text>
                  <View className="mt-3 gap-1">
                    <FeatureRow text="Higher message limits" />
                    <FeatureRow text="Full memory vault access" />
                    <FeatureRow text="Deeper recall and bigger squads" />
                  </View>
                  <View className="mt-4 flex-row items-center justify-between">
                    <View>
                      <Text className="text-xl font-black text-foreground">
                        $19.99
                        <Text className="text-sm font-normal text-muted-foreground"> /mo</Text>
                      </Text>
                      <Text className="text-xs text-muted-foreground line-through">$99/mo</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2">
                      <Sparkles size={12} color="#1a1d24" strokeWidth={2.6} />
                      <Text className="text-xs font-bold uppercase tracking-wider text-primary-foreground">
                        View plans
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View className="mt-5 px-4">
            <View className="overflow-hidden rounded-3xl border border-primary/40 bg-primary/5 p-5">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <Crown size={16} color="#5eead4" strokeWidth={2.4} />
                </View>
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    {tier === "pro" ? "PRO MEMBER" : "BASIC MEMBER"}
                  </Text>
                  <Text className="text-base font-bold text-foreground">{tierCopy.label}</Text>
                </View>
              </View>
              <Text className="mt-3 text-sm text-foreground/85">
                {tierCopy.usageDescription}
              </Text>
              <Pressable
                onPress={() => router.push("/(app)/pricing")}
                className="mt-3 self-start rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-primary">Manage plan →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Usage card */}
        <View className="mt-5 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Usage
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40 p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                <BarChart3 size={18} color="#5eead4" strokeWidth={2.4} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-foreground">
                  {tierCopy.usageHeading}
                </Text>
                <Text className="text-xs text-muted-foreground/70">
                  {tierCopy.label} Tier
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-xs text-muted-foreground">
              Send a message to see your usage.
            </Text>
          </View>
        </View>

        {/* Gang section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Your gang
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            <Link href="/(app)/edit-gang" asChild>
              <Pressable className="border-b border-border active:bg-muted/50">
                <View className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Manage gang</Text>
                    <Text className="text-xs text-muted-foreground/70">
                      Add or remove characters
                    </Text>
                  </View>
                  <Text className="text-muted-foreground/70">›</Text>
                </View>
              </Pressable>
            </Link>
            <Link href="/(app)/custom-names" asChild>
              <Pressable className="active:bg-muted/50">
                <View className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Custom names</Text>
                    <Text className="text-xs text-muted-foreground/70">
                      Rename characters in your chat
                    </Text>
                  </View>
                  <Text className="text-muted-foreground/70">›</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Chat mode section — segmented pill mirrors the chat-screen drawer */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Chat mode
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40 p-4">
            <View className="flex-row rounded-full bg-muted p-1">
              {(["gang_focus", "ecosystem"] as ChatMode[]).map((mode) => {
                const effectiveMode: ChatMode =
                  tier === "free" ? "gang_focus" : currentChatMode;
                const isCurrent = effectiveMode === mode;
                const isLocked = mode === "ecosystem" && tier === "free";
                const label = mode === "gang_focus" ? "Gang Focus" : "Ecosystem";
                return (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      if (isLocked) {
                        router.push("/(app)/pricing");
                        return;
                      }
                      void updateProfileField("chat_mode", mode, label);
                    }}
                    disabled={savingField !== null}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 ${
                      isCurrent ? "bg-primary" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isCurrent
                          ? "text-primary-foreground"
                          : isLocked
                            ? "text-muted-foreground/70"
                            : "text-foreground"
                      }`}
                    >
                      {label}
                    </Text>
                    {isLocked ? (
                      <Lock size={11} color="#71717a" strokeWidth={2.5} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {tier === "free" ? (
              <Text className="mt-3 text-xs text-amber-300/90">
                Ecosystem mode unlocks with Basic or Pro. Your gang talks freely, reacts to each other, and the chat feels alive.
              </Text>
            ) : (
              <Text className="mt-3 text-xs text-muted-foreground/70">
                {currentChatMode === "gang_focus"
                  ? "Just your selected gang chats with you."
                  : "All 14 characters can drop in occasionally."}
              </Text>
            )}
          </View>
        </View>

        {/* Avatar pack section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Avatar pack
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            {AVATAR_STYLES.map((style, index) => {
              const isCurrent = currentStyle === style;
              return (
                <Pressable
                  key={style}
                  onPress={() =>
                    void updateProfileField(
                      "avatar_style_preference",
                      style,
                      STYLE_LABELS[style]
                    )
                  }
                  disabled={savingField !== null}
                  className={`flex-row items-center justify-between px-4 py-3 active:bg-muted/50 ${
                    index < AVATAR_STYLES.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <Text className="text-base text-foreground">
                    {STYLE_LABELS[style]}
                  </Text>
                  {isCurrent ? (
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Text className="text-xs font-bold text-primary-foreground">✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Wallpaper section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Chat wallpaper
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            {CHAT_WALLPAPERS.map((w, idx) => {
              const isCurrent = currentWallpaper === w.id;
              return (
                <Pressable
                  key={w.id}
                  onPress={() =>
                    void updateProfileField("chat_wallpaper", w.id, w.label)
                  }
                  disabled={savingField !== null}
                  className={`px-4 py-3 active:bg-muted/50 ${
                    idx < CHAT_WALLPAPERS.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base text-foreground">{w.label}</Text>
                      <Text className="text-xs text-muted-foreground/70">
                        {w.description}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Text className="text-xs font-bold text-primary-foreground">✓</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Data Management */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Data Management
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            <Pressable
              onPress={() => router.push("/(app)/onboarding")}
              className="flex-row items-center justify-between gap-3 border-b border-border/40 px-5 py-4 active:bg-muted/30"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Retake Vibe Quiz</Text>
                <Text className="mt-0.5 text-xs text-muted-foreground/70">
                  Update your vibe preferences. Your chat, memories, and squad stay safe.
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
                <RefreshCw size={12} color="#a1a1aa" strokeWidth={2.5} />
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Retake
                </Text>
              </View>
            </Pressable>

            {/* Destructive actions sub-block */}
            <View className="m-4 overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5">
              <Text className="border-b border-destructive/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
                Destructive Actions
              </Text>
              <DestructiveRow
                title="Delete All Chat"
                subtitle="Permanently deletes your entire chat history."
                onPress={() => setDeleteChatOpen(true)}
              />
              <View className="border-t border-destructive/20" />
              <DestructiveRow
                title="Delete All Memories"
                subtitle="Permanently deletes everything your gang remembers about you."
                onPress={() => setDeleteMemoriesOpen(true)}
              />
              <View className="border-t border-destructive/20" />
              <DestructiveRow
                title="Start Fresh"
                subtitle="Wipes chat, memories, and squad — then restarts onboarding. Your subscription stays."
                onPress={() => setStartFreshOpen(true)}
              />
            </View>
          </View>
        </View>

        {/* Account Actions — sign out + inline danger zone */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Account Actions
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40 p-5">
            <Pressable
              onPress={confirmSignOut}
              className="flex-row items-center gap-1.5 self-start rounded-full border border-border bg-card px-3 py-1.5"
            >
              <LogOut size={12} color="#a1a1aa" strokeWidth={2.5} />
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sign out
              </Text>
            </Pressable>

            <View className="mt-5 overflow-hidden rounded-2xl border border-destructive/40 bg-destructive/5">
              <View className="flex-row items-center gap-2 border-b border-destructive/30 px-4 py-2">
                <AlertTriangle size={12} color="#fca5a5" strokeWidth={2.5} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
                  Danger Zone
                </Text>
              </View>
              <View className="px-4 py-4">
                <Text className="text-xs text-destructive/80">
                  Type your email to confirm account deletion. This cannot be undone.
                </Text>
                <TextInput
                  value={deleteEmailInput}
                  onChangeText={setDeleteEmailInput}
                  placeholder={user?.email ?? "your@email.com"}
                  placeholderTextColor="#71717a"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="mt-3 h-11 rounded-xl border border-destructive/30 bg-background px-3 text-sm text-foreground"
                />
                <Pressable
                  onPress={() => deleteEmailMatches && setDeleteAccountOpen(true)}
                  disabled={!deleteEmailMatches || deletingAccount}
                  className={`mt-3 h-11 items-center justify-center rounded-xl ${
                    deleteEmailMatches && !deletingAccount
                      ? "bg-destructive"
                      : "bg-destructive/30"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-wider ${
                      deleteEmailMatches && !deletingAccount
                        ? "text-white"
                        : "text-destructive/60"
                    }`}
                  >
                    {deletingAccount ? "Deleting…" : "Delete account"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Legal & Info */}
        <View className="mt-6 px-4">
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Legal & Info
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/50 bg-muted/40">
            <LegalRow icon={Info} label="About" url="https://mygang.ai/about" />
            <View className="border-t border-border/40" />
            <LegalRow icon={Shield} label="Privacy Policy" url="https://mygang.ai/privacy" />
            <View className="border-t border-border/40" />
            <LegalRow icon={FileText} label="Terms of Service" url="https://mygang.ai/terms" />
          </View>
          <Text className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
            MyGang.ai · v0.0.1
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={signOutOpen}
        title="Sign out?"
        body="You can sign back in any time."
        confirmLabel="Sign out"
        cancelLabel="Stay"
        variant="neutral"
        icon={LogOut}
        onConfirm={async () => {
          setSignOutOpen(false);
          await signOut();
        }}
        onCancel={() => setSignOutOpen(false)}
      />

      <ConfirmDialog
        visible={deleteChatOpen}
        title="Delete all chat history?"
        body="Every message in this chat will be permanently removed. This can't be undone."
        confirmLabel="Delete chat"
        variant="destructive"
        icon={Trash2}
        onConfirm={async () => {
          setDeleteChatOpen(false);
          await runDeleteAllChat();
        }}
        onCancel={() => setDeleteChatOpen(false)}
      />

      <ConfirmDialog
        visible={deleteMemoriesOpen}
        title="Delete all memories?"
        body="Your gang will forget everything they've learned about you. This can't be undone."
        confirmLabel="Delete memories"
        variant="destructive"
        icon={Trash2}
        onConfirm={async () => {
          setDeleteMemoriesOpen(false);
          await runDeleteAllMemories();
        }}
        onCancel={() => setDeleteMemoriesOpen(false)}
      />

      <ConfirmDialog
        visible={startFreshOpen}
        title="Start fresh?"
        body="Wipes your chat, memories, and squad, then restarts onboarding. Your subscription is kept. This can't be undone."
        confirmLabel="Start fresh"
        variant="destructive"
        icon={RefreshCw}
        onConfirm={async () => {
          setStartFreshOpen(false);
          await runStartFresh();
        }}
        onCancel={() => setStartFreshOpen(false)}
      />

      <ConfirmDialog
        visible={deleteAccountOpen}
        title="Permanently delete your account?"
        body="This wipes your chats, memories, gang, and profile. Your data cannot be recovered."
        confirmLabel="Delete account"
        confirmLabelStep2="Yes, permanently delete"
        cancelLabel="Cancel"
        variant="destructive"
        twoStep
        icon={AlertTriangle}
        onConfirm={async () => {
          setDeleteAccountOpen(false);
          await runDeleteAccount();
        }}
        onCancel={() => setDeleteAccountOpen(false)}
      />
    </SafeAreaView>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-xs text-primary">✓</Text>
      <Text className="flex-1 text-sm text-foreground/90">{text}</Text>
    </View>
  );
}

function DestructiveRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between gap-3 px-4 py-3 active:bg-destructive/10"
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-destructive">{title}</Text>
        <Text className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</Text>
      </View>
      <View className="flex-row items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5">
        <Trash2 size={11} color="#fca5a5" strokeWidth={2.5} />
        <Text className="text-[11px] font-bold uppercase tracking-wider text-destructive">
          Delete
        </Text>
      </View>
    </Pressable>
  );
}

function LegalRow({
  icon: Icon,
  label,
  url,
}: {
  icon: LucideIcon;
  label: string;
  url: string;
}) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      className="flex-row items-center gap-3 px-5 py-3.5 active:bg-muted/30"
    >
      <Icon size={16} color="#a1a1aa" strokeWidth={2.4} />
      <Text className="flex-1 text-sm text-foreground">{label}</Text>
      <ExternalLink size={14} color="#71717a" strokeWidth={2.4} />
    </Pressable>
  );
}
