import { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Image as ImageIcon,
  Lock,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
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
import { ConfirmDialog } from "../confirm-dialog";

const STYLE_LABELS: Record<AvatarStyle, string> = {
  robots: "Robots",
  human: "Human",
  retro: "Retro",
};

type ChatMode = "gang_focus" | "ecosystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 480);

// 3-stop swatch previews matching the actual blob colors of each wallpaper
const SWATCH: Record<string, [string, string, string]> = {
  default: ["#3eddc0", "#60a5fa", "#d946ef"],
  neon: ["#22d3ee", "#4ade80", "#a78bfa"],
  aurora: ["#22d3ee", "#4ade80", "#a78bfa"],
  sunset: ["#fb923c", "#f472b6", "#a855f7"],
  soft: ["#94a3b8", "#c7d2fe", "#94a3b8"],
  graphite: ["#0e0f12", "#3a3a3a", "#0e0f12"],
  midnight: ["#070b16", "#3b82f6", "#6366f1"],
};
function previewColorsForWallpaper(id: string): [string, string, string] {
  return SWATCH[id] ?? SWATCH.default;
}

type SettingsDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsDrawer({ visible, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const { user, profile, refreshProfile, applyProfilePatch } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [savingField, setSavingField] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"wallpaper" | "avatar-pack" | null>(
    null,
  );

  const tier = getTierFromProfile(profile?.subscription_tier ?? null);
  const tierCopy = getTierCopy(tier);
  const currentStyle: AvatarStyle =
    (profile?.avatar_style_preference as AvatarStyle) ?? DEFAULT_AVATAR_STYLE;
  const currentWallpaper: ChatWallpaper =
    (profile?.chat_wallpaper as ChatWallpaper) ?? "default";
  const currentChatMode: ChatMode =
    (profile?.chat_mode as ChatMode) ?? "gang_focus";
  const currentTheme = colorScheme === "light" ? "light" : "dark";
  const personalizationLocked = tier === "free";

  function openLockedPersonalization() {
    navigate("/(app)/pricing");
  }

  async function updateProfileField(
    field: string,
    value: string | boolean,
  ): Promise<boolean> {
    if (!user) return false;
    setSavingField(field);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value } as never)
      .eq("id", user.id);
    setSavingField(null);
    if (error) {
      Alert.alert("Could not save", error.message);
      return false;
    }
    applyProfilePatch({ [field]: value } as never);
    await refreshProfile();
    return true;
  }

  async function updateTheme(nextTheme: "light" | "dark") {
    if (nextTheme === currentTheme || savingField !== null) return;
    const previousTheme = currentTheme;
    applyProfilePatch({ theme: nextTheme });
    setColorScheme(nextTheme);
    const saved = await updateProfileField("theme", nextTheme);
    if (!saved) {
      applyProfilePatch({ theme: previousTheme });
      setColorScheme(previousTheme);
    }
  }

  async function signOut() {
    if (user?.id) await clearPersistedMessages(user.id);
    await supabase.auth.signOut();
  }

  function confirmSignOut() {
    setSignOutOpen(true);
  }

  function closeDrawer() {
    setSubPanel(null);
    onClose();
  }

  function navigate(path: string) {
    closeDrawer();
    router.push(path as never);
  }

  const tierPillBg =
    tier === "pro"
      ? "rgba(213,109,181,0.15)"
      : tier === "basic"
        ? "rgba(125,211,252,0.15)"
        : "rgba(245,158,11,0.15)";
  const tierPillFg =
    tier === "pro" ? "#f0abfc" : tier === "basic" ? "#7dd3fc" : "#fbbf24";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeDrawer}
    >
      <View className="flex-1">
        <Pressable
          onPress={closeDrawer}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.6)" },
            ]}
          />
        </Pressable>

        <Animated.View
          entering={SlideInRight.duration(220)}
          style={{ width: DRAWER_WIDTH }}
          className="absolute bottom-0 right-0 top-0 overflow-hidden border-l border-border bg-background"
        >
          {/* Header */}
          <View className="border-b border-border px-5 pt-14 pb-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text
                  className="text-2xl font-bold text-foreground"
                  numberOfLines={1}
                >
                  Hey, {profile?.username ?? "friend"}
                </Text>
                <View className="mt-1 flex-row items-center gap-2 flex-wrap">
                  <Text
                    className="text-sm text-muted-foreground"
                    numberOfLines={1}
                  >
                    {user?.email ?? ""}
                  </Text>
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: tierPillBg }}
                  >
                    <Text
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: tierPillFg }}
                    >
                      {tier}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={closeDrawer}
                className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
                accessibilityLabel="Close settings"
              >
                <X size={20} color="#a1a1aa" strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="pb-12">
            {/* Promo / Pro status card */}
            <View>
              {tier === "free" ? (
                <Pressable
                  onPress={() => navigate("/(app)/pricing")}
                  className="mt-4 mx-4 overflow-hidden rounded-3xl"
                  accessibilityRole="button"
                  accessibilityLabel="See plans"
                >
                  <LinearGradient
                    colors={[
                      "rgba(62,221,192,0.18)",
                      "rgba(213,109,181,0.10)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 16, paddingVertical: 20 }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-center gap-1.5 self-start rounded-full bg-primary/15 px-2.5 py-1">
                        <Sparkles
                          size={11}
                          color="#5eead4"
                          strokeWidth={2.5}
                        />
                        <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          80% OFF LAUNCH
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm text-muted-foreground line-through">
                          $99/mo
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-3 text-lg font-bold text-foreground">
                      Unlock memory & unlimited messages
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      Free includes preview memory plus light recall. Upgrade
                      when you want the full vault and deeper recall.
                    </Text>
                    <View className="mt-3 flex-row items-center gap-1.5 self-start rounded-full bg-primary/20 px-3 py-1.5">
                      <Text className="text-xs font-semibold text-primary">
                        See plans
                      </Text>
                      <ArrowRight
                        size={12}
                        color="#5eead4"
                        strokeWidth={2.6}
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
              ) : (
                <View className="mt-4 mx-4 overflow-hidden rounded-3xl">
                  <LinearGradient
                    colors={
                      tier === "pro"
                        ? [
                            "rgba(213,109,181,0.18)",
                            "rgba(167,139,250,0.10)",
                          ]
                        : [
                            "rgba(125,211,252,0.18)",
                            "rgba(62,221,192,0.10)",
                          ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 16, paddingVertical: 20 }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Sparkles
                        size={14}
                        color={tierPillFg}
                        strokeWidth={2.5}
                      />
                      <Text
                        className="text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: tierPillFg }}
                      >
                        {tierCopy.label} Plan Active
                      </Text>
                    </View>
                    <Text className="mt-2 text-lg font-bold text-foreground">
                      {tierCopy.usageHeading}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {tierCopy.usageDescription}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Chat mode */}
            <View>
              <Section title="Chat mode">
                <View className="m-3 flex-row rounded-full bg-muted p-1">
                  {(["gang_focus", "ecosystem"] as ChatMode[]).map((mode) => {
                    const effectiveMode: ChatMode =
                      tier === "free" ? "gang_focus" : currentChatMode;
                    const isCurrent = effectiveMode === mode;
                    const isLocked =
                      mode === "ecosystem" && tier === "free";
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => {
                          if (isLocked) {
                            navigate("/(app)/pricing");
                            return;
                          }
                          void updateProfileField("chat_mode", mode);
                        }}
                        disabled={savingField !== null && !isLocked}
                        className={`min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 ${
                          isCurrent ? "bg-primary" : ""
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel={
                          mode === "gang_focus"
                            ? "Use gang focus mode"
                            : "Use ecosystem mode"
                        }
                        accessibilityState={{
                          selected: isCurrent,
                          disabled: savingField !== null && !isLocked,
                        }}
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
                          {mode === "gang_focus"
                            ? "Gang Focus"
                            : "Ecosystem"}
                        </Text>
                        {isLocked ? (
                          <Lock
                            size={11}
                            color="#71717a"
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                {tier === "free" ? (
                  <Text className="mb-3 px-4 text-xs text-amber-300/90">
                    Ecosystem mode unlocks with Basic or Pro. Your gang talks
                    freely, reacts to each other, and the chat feels alive.
                  </Text>
                ) : null}
              </Section>
            </View>

            {/* Preferences */}
            <View>
              <Section title="Appearance">
                <View className="m-3 flex-row rounded-full bg-muted p-1">
                  {(["dark", "light"] as const).map((theme) => {
                    const isCurrent = currentTheme === theme;
                    const Icon = theme === "dark" ? Moon : Sun;
                    return (
                      <Pressable
                        key={theme}
                        onPress={() => void updateTheme(theme)}
                        disabled={savingField !== null}
                        className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full px-3 ${
                          isCurrent ? "bg-primary" : ""
                        }`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isCurrent }}
                        accessibilityLabel={`Use ${theme} mode`}
                      >
                        <Icon
                          size={14}
                          color={isCurrent ? "#1a1d24" : "#a1a1aa"}
                          strokeWidth={2.4}
                        />
                        <Text
                          className={`text-sm font-semibold capitalize ${
                            isCurrent
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {theme}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>
            </View>

            <View>
              <Section title="Preferences">
                <ToggleRow
                  label="Low-cost mode"
                  subtitle="Shorter responses, lower compute"
                  value={Boolean(profile?.low_cost_mode)}
                  onValueChange={(v) =>
                    void updateProfileField("low_cost_mode", v)
                  }
                />
              </Section>
            </View>

            {/* Personalize */}
            <View>
              <Section title="Personalize">
                <IconRow
                  icon={ImageIcon}
                  iconTint="rgba(125,211,252,0.18)"
                  iconColor="#7dd3fc"
                  title="Wallpaper"
                  subtitle={
                    personalizationLocked
                      ? "Unlock with Basic or Pro"
                      : CHAT_WALLPAPERS.find((w) => w.id === currentWallpaper)
                          ?.label ?? "Default"
                  }
                  locked={personalizationLocked}
                  onPress={() =>
                    personalizationLocked
                      ? openLockedPersonalization()
                      : setSubPanel("wallpaper")
                  }
                />
                <View className="border-t border-border" />
                <IconRow
                  icon={Sparkles}
                  iconTint="rgba(213,109,181,0.18)"
                  iconColor="#f0abfc"
                  title="Avatar pack"
                  subtitle={STYLE_LABELS[currentStyle]}
                  onPress={() => setSubPanel("avatar-pack")}
                />
                <View className="border-t border-border" />
                <IconRow
                  icon={Users}
                  iconTint="rgba(74,222,128,0.18)"
                  iconColor="#4ade80"
                  title="Manage gang"
                  subtitle="Add or remove characters"
                  onPress={() => navigate("/(app)/edit-gang")}
                />
                <View className="border-t border-border" />
                <IconRow
                  icon={Tag}
                  iconTint="rgba(245,158,11,0.18)"
                  iconColor="#fbbf24"
                  title="Custom names"
                  subtitle={
                    personalizationLocked
                      ? "Unlock with Basic or Pro"
                      : "Rename characters in your chat"
                  }
                  locked={personalizationLocked}
                  onPress={() =>
                    personalizationLocked
                      ? openLockedPersonalization()
                      : navigate("/(app)/custom-names")
                  }
                />
              </Section>
            </View>

            {/* Account */}
            <View>
              <Section title="Account">
                <IconRow
                  icon={CreditCard}
                  iconTint="rgba(62,221,192,0.18)"
                  iconColor="#5eead4"
                  title="Plan & usage"
                  subtitle={`${tierCopy.label} · ${tierCopy.priceLabel}`}
                  onPress={() => navigate("/(app)/pricing")}
                />
                <View className="border-t border-border" />
                <IconRow
                  icon={LogOut}
                  iconTint="rgba(245,158,11,0.18)"
                  iconColor="#fbbf24"
                  title="Sign out"
                  onPress={confirmSignOut}
                />
                <View className="border-t border-border" />
                <IconRow
                  icon={Trash2}
                  iconTint="rgba(236,94,94,0.18)"
                  iconColor="#fca5a5"
                  title="Delete account"
                  subtitle="Permanent and irreversible"
                  onPress={() => navigate("/(app)/delete-account")}
                />
              </Section>
            </View>

            <View className="mt-8 px-4">
              <Text className="text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                MyGang.ai · v0.0.1
              </Text>
            </View>
          </ScrollView>

          {/* Wallpaper sub-panel */}
          {subPanel === "wallpaper" ? (
            <Animated.View
              entering={SlideInRight.duration(200)}
              exiting={SlideOutRight.duration(200)}
              className="absolute inset-0 bg-background"
            >
              <View className="flex-row items-center gap-3 border-b border-border px-4 pt-14 pb-3">
                <Pressable
                  onPress={() => setSubPanel(null)}
                  className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <ChevronLeft
                    size={18}
                    color="#a1a1aa"
                    strokeWidth={2.4}
                  />
                </Pressable>
                <Text className="text-lg font-bold text-foreground">
                  Wallpaper
                </Text>
              </View>
              <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
                {CHAT_WALLPAPERS.map((w) => {
                  const isCurrent = currentWallpaper === w.id;
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() =>
                        void updateProfileField("chat_wallpaper", w.id)
                      }
                      disabled={savingField !== null}
                      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-card-translucent px-3 py-3"
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${w.label} wallpaper`}
                      accessibilityState={{
                        selected: isCurrent,
                        disabled: savingField !== null,
                      }}
                    >
                      <View className="h-12 w-9 overflow-hidden rounded-lg">
                        <LinearGradient
                          colors={previewColorsForWallpaper(w.id)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ flex: 1 }}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base text-foreground">
                          {w.label}
                        </Text>
                        <Text className="text-xs text-muted-foreground/70">
                          {w.description}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                          <Check
                            size={14}
                            color="#1a1d24"
                            strokeWidth={3}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}

          {/* Avatar pack sub-panel */}
          {subPanel === "avatar-pack" ? (
            <Animated.View
              entering={SlideInRight.duration(200)}
              exiting={SlideOutRight.duration(200)}
              className="absolute inset-0 bg-background"
            >
              <View className="flex-row items-center gap-3 border-b border-border px-4 pt-14 pb-3">
                <Pressable
                  onPress={() => setSubPanel(null)}
                  className="h-11 w-11 items-center justify-center rounded-full active:bg-card"
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <ChevronLeft
                    size={18}
                    color="#a1a1aa"
                    strokeWidth={2.4}
                  />
                </Pressable>
                <Text className="text-lg font-bold text-foreground">
                  Avatar pack
                </Text>
              </View>
              <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
                {AVATAR_STYLES.map((style) => {
                  const isCurrent = currentStyle === style;
                  return (
                    <Pressable
                      key={style}
                      onPress={() =>
                        void updateProfileField(
                          "avatar_style_preference",
                          style,
                        )
                      }
                      disabled={savingField !== null}
                      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-card-translucent px-4 py-3"
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${STYLE_LABELS[style]} avatar pack`}
                      accessibilityState={{
                        selected: isCurrent,
                        disabled: savingField !== null,
                      }}
                    >
                      <View
                        className="h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: "rgba(213,109,181,0.18)",
                        }}
                      >
                        <Sparkles
                          size={16}
                          color="#f0abfc"
                          strokeWidth={2.4}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base text-foreground">
                          {STYLE_LABELS[style]}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                          <Check
                            size={14}
                            color="#1a1d24"
                            strokeWidth={3}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}

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
        </Animated.View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-6 px-4">
      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-border bg-card-translucent">
        {children}
      </View>
    </View>
  );
}

function IconRow({
  icon: Icon,
  iconTint,
  iconColor,
  title,
  subtitle,
  onPress,
  locked = false,
}: {
  icon: LucideIcon;
  iconTint: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3 px-4 py-3 active:bg-muted/30"
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: iconTint }}
      >
        <Icon size={16} color={iconColor} strokeWidth={2.4} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className={locked ? "text-base text-muted-foreground/70" : "text-base text-foreground"}>
            {title}
          </Text>
          {locked ? <Lock size={12} color="#71717a" strokeWidth={2.5} /> : null}
        </View>
        {subtitle ? (
          <Text className="text-xs text-muted-foreground/70">{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={16} color="#71717a" strokeWidth={2.4} />
    </Pressable>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-4 py-3">
      <View className="flex-1">
        <Text className="text-base text-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground/70">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? "#3eddc0" : "#71717a"}
        trackColor={{ false: "#2a2e36", true: "rgba(62,221,192,0.4)" }}
      />
    </View>
  );
}
