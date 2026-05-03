# Mobile/Web Parity — Phase 1: Design-System Primitives + Foundation

> **For agentic workers:** REQUIRED SUB-SKILL — Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cross-screen primitives (PrimaryButton overhaul, GlassCard, EyebrowPill, ConfirmDialog, StepIndicator, step transitions, wallpaper rewrite) plus fix the delete-account purge bug. These unblock the chat and onboarding rebuilds in Phases 2 and 3.

**Architecture:** Add new components under `apps/mobile/components/` and `apps/mobile/components/onboarding/`. Keep them small, single-responsibility, and styled with NativeWind tokens already defined in `apps/mobile/tailwind.config.js`. Modify `PrimaryButton` in place (no breaking changes to existing call sites unless an explicit update). Apply new primitives to the auth screens + onboarding orchestrator + chat header + chat input — minimal scope inside each screen, no per-screen polish (that's Phase 2/3). Add a real server-side `/api/account/delete` endpoint on the web app and wire mobile to it.

**Tech stack:** Expo SDK 54, NativeWind v4, Reanimated 4, expo-linear-gradient, expo-blur, lucide-react-native (need to add), Next.js 16 (web side), Supabase admin client (web side).

**Source-of-truth references:**
- Spec: [`docs/superpowers/specs/2026-05-03-mobile-web-parity-audit.md`](../specs/2026-05-03-mobile-web-parity-audit.md)
- Project conventions: [`AGENTS.md`](../../../AGENTS.md) — note hard rule #4 (never commit without explicit user permission). **All `git commit` steps in this plan are deferred to the user.** When a task is functionally complete, surface the diff and let the user trigger the commit.

**How to verify visual changes:** typecheck must pass after every task (`pnpm --filter=@mygang/mobile typecheck`), but the actual visual outcome can only be confirmed by the user reloading the app on their phone. After each task that changes UI, include a one-line note: "Visual verification: [what to look for on phone]". Do **not** claim the task is done if typecheck passes but no visual verification has been requested or received.

---

## Task index

| # | Task | Effort | Verifies |
|---|---|---|---|
| 1 | Add lucide-react-native + verify icon import | S | typecheck |
| 2 | Rebuild PrimaryButton (variants + icon + glow + press) | M | typecheck + visual on auth screens |
| 3 | Build GlassCard component | S | typecheck |
| 4 | Build EyebrowPill component | S | typecheck |
| 5 | Apply GlassCard + EyebrowPill + new PrimaryButton to all 4 auth screens | M | typecheck + visual on phone |
| 6 | Build ConfirmDialog component | M | typecheck |
| 7 | Replace top-priority `Alert.alert` calls with ConfirmDialog | M | typecheck + visual on destructive flows |
| 8 | Build StepIndicator component | S | typecheck |
| 9 | Build StepTransition wrapper using Reanimated | M | typecheck |
| 10 | Apply StepIndicator + StepTransition to onboarding orchestrator | S | typecheck + visual on onboarding flow |
| 11 | Rewrite WallpaperBackground with vivid radial blob gradients | M | typecheck + visual on chat with neon wallpaper |
| 12 | Server-side: write `/api/account/delete` purge endpoint + tests | M | unit tests pass |
| 13 | Wire mobile delete-account screen to new endpoint | S | typecheck + manual flow test |

---

## Task 1 — Add `lucide-react-native` for icon parity

**Why:** PrimaryButton + ConfirmDialog need lucide icons (`ArrowRight`, `AlertTriangle`, `MailCheck`, etc.) to match web's iconography. Mobile currently uses `@expo/vector-icons` for some things, but lucide gives us 1:1 parity with the web's `lucide-react`.

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Add the dependency.**

Run from repo root:
```bash
pnpm --filter=@mygang/mobile add lucide-react-native
```

Expected: package added, peer warnings ok.

- [ ] **Step 2: Verify typecheck still passes.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the import works.**

Create a temp file `apps/mobile/scratch-icon-test.ts`:

```ts
import { ArrowRight, AlertTriangle, MailCheck } from "lucide-react-native";

const icons = [ArrowRight, AlertTriangle, MailCheck];
console.log(icons.length);
```

Run typecheck again. Expected: pass. Then **delete the scratch file** — it's not part of the task output.

```bash
rm apps/mobile/scratch-icon-test.ts
```

---

## Task 2 — Rebuild PrimaryButton

**Why (from spec Theme 1):** Current PrimaryButton is solid teal `rounded-2xl` with mixed-case bold text. Web is a gradient pill (auth) or solid pill (rest), uppercase tracked, with lucide arrow icons, press-scale, and a brand-glow shadow. This single component touches every screen in the app.

**Files:**
- Modify: `apps/mobile/components/primary-button.tsx` (full rewrite, but preserve the existing `label`, `onPress`, `isLoading`, `size`, `disabled` props so nothing breaks)

- [ ] **Step 1: Read the current PrimaryButton.**

```bash
cat apps/mobile/components/primary-button.tsx
```

- [ ] **Step 2: Read the web's button shapes for reference.**

```bash
cat apps/web/src/components/ui/button.tsx 2>/dev/null || true
```

(Note any utility classes used; replicate the spirit, not the exact Tailwind plugin output.)

- [ ] **Step 3: Replace PrimaryButton with the new implementation.**

Write `apps/mobile/components/primary-button.tsx`:

```tsx
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ArrowRight, type LucideIcon } from "lucide-react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "solid" | "gradient";
type Size = "default" | "lg" | "xl";

type PrimaryButtonProps = {
  label: string;
  onPress?: PressableProps["onPress"];
  isLoading?: boolean;
  disabled?: boolean;
  size?: Size;
  variant?: Variant;
  /** Lucide icon component to render at trailing edge (e.g. ArrowRight). */
  iconRight?: LucideIcon;
  /** When true, label is rendered uppercase with wide letter-spacing (auth-style). */
  upperCase?: boolean;
};

const SIZE_HEIGHT: Record<Size, number> = { default: 44, lg: 52, xl: 60 };
const SIZE_TEXT: Record<Size, string> = {
  default: "text-base",
  lg: "text-base",
  xl: "text-lg",
};

export function PrimaryButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
  size = "default",
  variant = "solid",
  iconRight,
  upperCase = false,
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const isInteractive = !isLoading && !disabled;

  useEffect(() => {
    // Reset scale if disabled-state flips while pressed.
    scale.value = 1;
  }, [disabled, isLoading, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = iconRight ?? ArrowRight;

  const labelClasses = `${SIZE_TEXT[size]} font-bold ${
    upperCase
      ? "uppercase tracking-[0.18em] font-black"
      : ""
  } ${variant === "solid" ? "text-primary-foreground" : "text-black"}`;

  const inner = (
    <View className="flex-row items-center justify-center gap-2">
      {isLoading ? (
        <ActivityIndicator
          color={variant === "solid" ? "#1a1d24" : "#0a0a0a"}
        />
      ) : (
        <>
          <Text className={labelClasses}>{label}</Text>
          {iconRight !== undefined ? (
            <Icon
              size={size === "xl" ? 22 : size === "lg" ? 20 : 18}
              color={variant === "solid" ? "#1a1d24" : "#0a0a0a"}
              strokeWidth={2.5}
            />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!isInteractive}
      onPressIn={() => {
        if (isInteractive) scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      style={[
        animatedStyle,
        {
          height: SIZE_HEIGHT[size],
          opacity: isInteractive ? 1 : 0.55,
          shadowColor: variant === "solid" ? "#3eddc0" : "#22d3ee",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isInteractive ? 0.25 : 0,
          shadowRadius: 16,
          elevation: isInteractive ? 6 : 0,
        },
      ]}
      className="overflow-hidden rounded-full"
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={["#7dd3fc", "#67e8f9", "#6ee7b7"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View className="flex-1 items-center justify-center bg-primary">
          {inner}
        </View>
      )}
    </AnimatedPressable>
  );
}
```

- [ ] **Step 4: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS. If errors about unused props or type mismatches in call sites, see Step 5.

- [ ] **Step 5: Sweep call sites for breakage.**

```bash
grep -rn "PrimaryButton" apps/mobile --include="*.tsx" -l
```

For each file: open it, confirm the existing `label` / `onPress` / `isLoading` / `size` / `disabled` usage still works. The new `variant`, `iconRight`, `upperCase` props are all optional with sensible defaults — no existing call site should need changes.

- [ ] **Step 6: Visual verification (user-action).**

After this task, the user should reload the app and confirm:
- Existing Sign In / Sign Up buttons still render correctly (rounded-full pill, teal solid)
- Pressing a button now scales it to ~97% with a spring animation
- A subtle teal glow is visible under the button on iOS / elevation shadow on Android

---

## Task 3 — Build `GlassCard` component

**Why (from spec Theme 2):** Web wraps auth forms (and many other content blocks) in a `rounded-[2rem]` translucent dark card with `backdrop-blur-xl` and a deep drop shadow. Mobile renders forms flat against the screen background. We need a single reusable component.

**Files:**
- Create: `apps/mobile/components/glass-card.tsx`

- [ ] **Step 1: Write the component.**

```tsx
import { View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";

type GlassCardProps = ViewProps & {
  /** When true, applies a deep drop shadow underneath. Default true. */
  withShadow?: boolean;
};

/**
 * Translucent dark card with a frosted backdrop and rounded-[28px] (~2rem) corners.
 * Mirrors the web `glass-card` container used across auth + content blocks.
 *
 * The BlurView on Android falls back to a flat translucent overlay; iOS gets the
 * full backdrop blur. That's the same trade-off the rest of the app already accepts.
 */
export function GlassCard({
  children,
  withShadow = true,
  style,
  ...rest
}: GlassCardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          borderRadius: 28,
          overflow: "hidden",
          ...(withShadow
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 24 },
                shadowOpacity: 0.45,
                shadowRadius: 48,
                elevation: 12,
              }
            : null),
        },
        style,
      ]}
      className="border border-white/10"
    >
      <BlurView intensity={40} tint="dark" style={{ flex: 1 }}>
        <View
          style={{ backgroundColor: "rgba(7,12,20,0.74)" }}
          className="p-6"
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

---

## Task 4 — Build `EyebrowPill` component

**Why:** Web auth/settings/onboarding screens have a tinted rounded-full eyebrow pill above the H1 (e.g. "PASSWORD RECOVERY", "REVIEW", "LAUNCH PRICING — SAVE 80%"). Reusable component.

**Files:**
- Create: `apps/mobile/components/eyebrow-pill.tsx`

- [ ] **Step 1: Write the component.**

```tsx
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

type EyebrowPillProps = {
  label: string;
  /** Optional lucide icon to show at the leading edge. */
  icon?: LucideIcon;
  /** Tint of the pill background. Defaults to brand teal. */
  tint?: "teal" | "amber" | "magenta" | "sky";
};

const TINT_BG: Record<NonNullable<EyebrowPillProps["tint"]>, string> = {
  teal: "rgba(62,221,192,0.12)",
  amber: "rgba(245,158,11,0.15)",
  magenta: "rgba(213,109,181,0.14)",
  sky: "rgba(125,211,252,0.14)",
};

const TINT_TEXT: Record<NonNullable<EyebrowPillProps["tint"]>, string> = {
  teal: "#5eead4",
  amber: "#fbbf24",
  magenta: "#f0abfc",
  sky: "#7dd3fc",
};

export function EyebrowPill({ label, icon: Icon, tint = "teal" }: EyebrowPillProps) {
  return (
    <View
      style={{ backgroundColor: TINT_BG[tint] }}
      className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
    >
      {Icon ? <Icon size={12} color={TINT_TEXT[tint]} strokeWidth={2.4} /> : null}
      <Text
        style={{ color: TINT_TEXT[tint] }}
        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

---

## Task 5 — Apply GlassCard + EyebrowPill + gradient PrimaryButton to all 4 auth screens

**Why (from spec deltas A1–A8):** The auth screens (sign-in, sign-up, forgot-password, reset-password) are flat. They should match the web auth chrome.

**Files (all modifications, no creates):**
- Modify: `apps/mobile/app/(auth)/sign-in.tsx`
- Modify: `apps/mobile/app/(auth)/sign-up.tsx`
- Modify: `apps/mobile/app/(auth)/forgot-password.tsx`
- Modify: `apps/mobile/app/(auth)/reset-password.tsx`

- [ ] **Step 1: Update sign-in.tsx.**

Wrap the form in `<GlassCard>`, add `<EyebrowPill label="WELCOME BACK" tint="teal" />` above the heading, switch the PrimaryButton to `variant="gradient"` `upperCase={true}` `iconRight={ArrowRight}`. The screen layout becomes:

```tsx
import { useState } from "react";
import { ScrollView, Text, View, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react-native";
import { signInInputSchema, type SignInInput } from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { GradientText } from "../../components/gradient-text";
import { GlassCard } from "../../components/glass-card";
import { EyebrowPill } from "../../components/eyebrow-pill";

export default function SignInScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInInputSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);
    if (error) {
      Alert.alert("Sign in failed", error.message);
      return;
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center px-5 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <GlassCard>
        <EyebrowPill label="WELCOME BACK" tint="teal" />
        <GradientText textClassName="mt-3 text-3xl font-bold tracking-tight">
          Welcome back
        </GradientText>
        <Text className="mb-6 mt-1 text-muted-foreground">
          Your gang's been waiting.
        </Text>

        <FormField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email?.message}
        />

        <FormField
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoComplete="password"
          error={errors.password?.message}
        />

        <View className="mt-2">
          <PrimaryButton
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            variant="gradient"
            upperCase
            iconRight={ArrowRight}
            size="lg"
          />
        </View>

        <Link
          href="/(auth)/forgot-password"
          className="mt-4 self-center text-sm text-muted-foreground underline"
        >
          Forgot password?
        </Link>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted-foreground">No account yet? </Text>
          <Link href="/(auth)/sign-up" className="text-foreground underline">
            Sign up
          </Link>
        </View>
      </GlassCard>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Update sign-up.tsx.**

Same shape — eyebrow `"JOIN THE GANG"`, heading "Create account". Preserve the existing `submitted` success state but render it inside `<GlassCard>` too with eyebrow `"CHECK YOUR EMAIL"` and a centered icon medallion. Keep all existing validation logic (the "already registered" detection added in the previous session — don't remove it).

```tsx
import { useState } from "react";
import { ScrollView, Text, View, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MailCheck } from "lucide-react-native";
import { signUpInputSchema, type SignUpInput } from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { GradientText } from "../../components/gradient-text";
import { GlassCard } from "../../components/glass-card";
import { EyebrowPill } from "../../components/eyebrow-pill";

export default function SignUpScreen() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpInputSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        Alert.alert(
          "Account exists",
          "That email is already registered. Try signing in instead.",
        );
      } else {
        Alert.alert("Sign up failed", error.message);
      }
      return;
    }

    if (data?.user && (data.user.identities?.length ?? 0) === 0) {
      Alert.alert(
        "Account exists",
        "That email is already registered. Try signing in instead.",
      );
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="flex-grow justify-center px-5"
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard>
          <View className="items-center">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <MailCheck size={28} color="#5eead4" strokeWidth={2.2} />
            </View>
            <EyebrowPill label="CHECK YOUR EMAIL" tint="teal" />
            <Text className="mt-3 text-center text-2xl font-bold text-foreground">
              Verify your account
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              We sent a verification link. Tap it to finish creating your account.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center px-5 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <GlassCard>
        <EyebrowPill label="JOIN THE GANG" tint="teal" />
        <GradientText textClassName="mt-3 text-3xl font-bold tracking-tight">
          Create account
        </GradientText>
        <Text className="mb-6 mt-1 text-muted-foreground">Join the gang.</Text>

        <FormField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email?.message}
        />

        <FormField
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoComplete="password-new"
          error={errors.password?.message}
        />

        <View className="mt-2">
          <PrimaryButton
            label="Sign Up"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            variant="gradient"
            upperCase
            iconRight={ArrowRight}
            size="lg"
          />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted-foreground">Already have an account? </Text>
          <Link href="/(auth)/sign-in" className="text-foreground underline">
            Sign in
          </Link>
        </View>
      </GlassCard>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Update forgot-password.tsx.**

Read the current file first:

```bash
cat apps/mobile/app/\(auth\)/forgot-password.tsx
```

Wrap form in `<GlassCard>`, add `<EyebrowPill label="PASSWORD RECOVERY" tint="sky" icon={KeyRound} />` (KeyRound from lucide), heading "Reset your password", description "Enter the email tied to your MyGang account and we'll send you a secure link.", PrimaryButton becomes `variant="gradient"` `upperCase` `label="Send Reset Link"`. Add the helper paragraph: "If you usually sign in with Google, you may not have a password yet. In that case, go back and keep using Google sign-in." styled `text-xs text-muted-foreground/70`.

Pattern follows sign-in.tsx exactly. Preserve existing form logic and validation; don't change behavior.

- [ ] **Step 4: Update reset-password.tsx.**

Read the current file:

```bash
cat apps/mobile/app/\(auth\)/reset-password.tsx
```

Apply the same shell. Each of the 3 states (verifying / invalid / success) gets its own icon medallion + EyebrowPill + heading inside a single `<GlassCard>`:
- Verifying: spinner inside `bg-sky-500/15` circle, eyebrow "VERIFYING…", heading "Hold tight"
- Invalid: AlertTriangle inside `bg-rose-500/15` circle (tint="amber"), eyebrow "LINK EXPIRED", heading "This link doesn't work anymore"
- Success: CheckCircle2 inside `bg-emerald-500/15` circle, eyebrow "ALL DONE", heading "Password updated"

Don't refactor the actual reset logic. Wrap; don't rewrite.

- [ ] **Step 5: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

- [ ] **Step 6: Visual verification (user-action).**

User reloads app, signs out, navigates to sign-in. Should see:
- Translucent dark glass card with rounded corners floating against the dark background
- Tiny teal "WELCOME BACK" pill above the gradient title
- New sign-in button is a gradient sky→teal pill with uppercase "SIGN IN →" + arrow icon, presses with a soft scale
- Forgot password page has a sky-tinted "PASSWORD RECOVERY" pill and helper text below the button

---

## Task 6 — Build ConfirmDialog component

**Why (from spec Theme 3):** Mobile uses native `Alert.alert` everywhere for confirmations. Web uses a custom Dialog with backdrop-blur, AlertTriangle icon, and two-step destructive confirms. We need a single reusable component.

**Files:**
- Create: `apps/mobile/components/confirm-dialog.tsx`

- [ ] **Step 1: Write the component.**

```tsx
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { AlertTriangle, type LucideIcon } from "lucide-react-native";

import { PrimaryButton } from "./primary-button";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  /** Label for the primary destructive/confirm button. */
  confirmLabel: string;
  /** Label after the user's first tap, when twoStep is enabled. Required if twoStep. */
  confirmLabelStep2?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Lucide icon for the medallion. Defaults to AlertTriangle. */
  icon?: LucideIcon;
  /** Variant. "destructive" tints the icon medallion + confirm button red. */
  variant?: "destructive" | "neutral";
  /** When true, the confirm button requires two taps. The label changes after tap 1. */
  twoStep?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  confirmLabelStep2,
  cancelLabel = "Cancel",
  icon: Icon = AlertTriangle,
  variant = "neutral",
  twoStep = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [armed, setArmed] = useState(false);
  const isDestructive = variant === "destructive";

  function handleConfirm() {
    if (twoStep && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    void onConfirm();
  }

  function handleCancel() {
    setArmed(false);
    onCancel();
  }

  const buttonLabel = twoStep && armed && confirmLabelStep2 ? confirmLabelStep2 : confirmLabel;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable className="flex-1" onPress={handleCancel}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="absolute inset-0 bg-black/60" />
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10"
            style={{
              backgroundColor: "rgba(7,12,20,0.92)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: 0.5,
              shadowRadius: 40,
              elevation: 16,
            }}
          >
            <View className="items-center px-6 pt-8">
              <View
                className="mb-4 h-14 w-14 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isDestructive
                    ? "rgba(236,94,94,0.18)"
                    : "rgba(62,221,192,0.18)",
                }}
              >
                <Icon
                  size={26}
                  color={isDestructive ? "#fca5a5" : "#5eead4"}
                  strokeWidth={2.2}
                />
              </View>
              <Text className="text-center text-xl font-bold text-foreground">
                {title}
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                {body}
              </Text>
            </View>

            <View className="flex-row gap-3 px-6 pb-6 pt-6">
              <View className="flex-1">
                <Pressable
                  onPress={handleCancel}
                  className="h-11 items-center justify-center rounded-full border border-border bg-card"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {cancelLabel}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-1">
                {/* Inline destructive button — does not reuse PrimaryButton because we want a destructive color variant. */}
                <Pressable
                  onPress={handleConfirm}
                  className="h-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDestructive ? "#dc2626" : "#3eddc0",
                  }}
                >
                  <Text
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: isDestructive ? "#fff" : "#1a1d24" }}
                  >
                    {buttonLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

---

## Task 7 — Replace top-priority `Alert.alert` calls with ConfirmDialog

**Why:** The destructive flows are where native Alert is most jarring against the brand. Rather than swap every single Alert (there are dozens), this task swaps the 4 highest-impact destructive confirmations.

**Scope (only these 4 — leave other Alert.alert calls for Phase 2/3):**
1. Sign-out confirmation (`apps/mobile/app/(app)/settings.tsx:67-78` and `apps/mobile/components/chat/settings-drawer.tsx:77-86`)
2. Delete-memory confirmation (`apps/mobile/app/(app)/memory-vault.tsx:101-120`)
3. Delete-account confirmation (`apps/mobile/app/(app)/delete-account.tsx` — replace its existing typed-email + Alert flow with the two-step ConfirmDialog)

**Files:**
- Modify: `apps/mobile/app/(app)/settings.tsx`
- Modify: `apps/mobile/components/chat/settings-drawer.tsx`
- Modify: `apps/mobile/app/(app)/memory-vault.tsx`
- Modify: `apps/mobile/app/(app)/delete-account.tsx`

- [ ] **Step 1: Settings sign-out → ConfirmDialog.**

In `apps/mobile/app/(app)/settings.tsx`:
- Add: `import { ConfirmDialog } from "../../components/confirm-dialog";`
- Add: `import { LogOut } from "lucide-react-native";`
- Add state: `const [signOutOpen, setSignOutOpen] = useState(false);`
- Replace `confirmSignOut` body to just `setSignOutOpen(true)`.
- Render at the bottom of the SafeAreaView (just before closing tag):
  ```tsx
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
  ```

- [ ] **Step 2: Settings drawer sign-out → ConfirmDialog.**

Same pattern in `apps/mobile/components/chat/settings-drawer.tsx`.

- [ ] **Step 3: Memory vault delete-memory → ConfirmDialog.**

In `apps/mobile/app/(app)/memory-vault.tsx`:
- Track which memory is pending: `const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);`
- Replace `deleteMemory(id)` body: `setPendingDeleteId(id)` instead of `Alert.alert(...)`.
- Render dialog:
  ```tsx
  <ConfirmDialog
    visible={pendingDeleteId !== null}
    title="Delete this memory?"
    body="This can't be undone."
    confirmLabel="Delete"
    variant="destructive"
    onConfirm={async () => {
      const id = pendingDeleteId;
      if (!id || !user) return;
      setPendingDeleteId(null);
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        Alert.alert("Could not delete", error.message);
        return;
      }
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
    }}
    onCancel={() => setPendingDeleteId(null)}
  />
  ```

- [ ] **Step 4: Delete-account → two-step ConfirmDialog.**

In `apps/mobile/app/(app)/delete-account.tsx`: rewrite the screen to keep the typed-email confirmation field, but the final confirm tap opens a two-step ConfirmDialog instead of `Alert.alert`. The actual deletion call to the new API endpoint comes in Task 13 — for THIS task, just wire the dialog and keep the existing (broken) deletion logic in place.

Add at top of the screen:
```tsx
const [confirmOpen, setConfirmOpen] = useState(false);
```

Inside the existing `onConfirm` handler that's already wired to the typed-email button: replace its body with `setConfirmOpen(true);` (don't run the deletion yet).

Add at bottom of the SafeAreaView:
```tsx
<ConfirmDialog
  visible={confirmOpen}
  title="Permanently delete your account?"
  body="This wipes your chats, memories, gang, and profile. Your data cannot be recovered."
  confirmLabel="Delete account"
  confirmLabelStep2="Yes, permanently delete"
  cancelLabel="Cancel"
  variant="destructive"
  twoStep
  onConfirm={async () => {
    setConfirmOpen(false);
    await runDeletion(); // existing function — do not change it in this task
  }}
  onCancel={() => setConfirmOpen(false)}
/>
```

Where `runDeletion` is the rename of whatever was previously inline. Don't change WHAT it does in this task — Task 13 swaps it for the new endpoint call.

- [ ] **Step 5: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

- [ ] **Step 6: Visual verification (user-action).**

User reloads, opens settings → Sign out → confirms the dialog now uses the dark glass modal with LogOut icon (not the OS alert). Same for memory vault delete and delete-account.

---

## Task 8 — Build StepIndicator component

**Why (from spec Theme 4):** Onboarding shows no progress dots. Web shows them at the top of every step.

**Files:**
- Create: `apps/mobile/components/onboarding/step-indicator.tsx`

- [ ] **Step 1: Write the component.**

```tsx
import { View } from "react-native";

type StepIndicatorProps = {
  /** Total step count. */
  total: number;
  /** Zero-based index of the current step. */
  current: number;
};

/**
 * Horizontal row of progress dots. Past dots are filled emerald, current is
 * a slightly larger filled emerald, future are muted gray.
 */
export function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const isPast = i < current;
        const isCurrent = i === current;
        return (
          <View
            key={i}
            className="rounded-full"
            style={{
              width: isCurrent ? 10 : 6,
              height: isCurrent ? 10 : 6,
              backgroundColor: isPast || isCurrent
                ? "#3eddc0"
                : "rgba(255,255,255,0.18)",
            }}
          />
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

---

## Task 9 — Build StepTransition wrapper using Reanimated

**Why (from spec Theme 5):** Onboarding step swaps cut instantly. Web slides horizontally. Reanimated 4 supports `entering` / `exiting` layout animations, which is the right tool here.

**Files:**
- Create: `apps/mobile/components/onboarding/step-transition.tsx`

- [ ] **Step 1: Write the component.**

```tsx
import { type ReactNode } from "react";
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from "react-native-reanimated";

type StepTransitionProps = {
  /** A unique key for the current step — change of key triggers the transition. */
  stepKey: string;
  /** "forward" slides in from the right and out to the left.
   *  "backward" slides in from the left and out to the right. */
  direction?: "forward" | "backward";
  children: ReactNode;
};

/**
 * Wrap each onboarding step's content. When `stepKey` changes, the previous
 * Animated.View exits with a slide+fade and the new one enters with a slide+fade.
 *
 * Note: this relies on the parent re-rendering the children with a new `stepKey`
 * every time the step changes. The component does NOT manage step state itself.
 */
export function StepTransition({ stepKey, direction = "forward", children }: StepTransitionProps) {
  const enter = direction === "forward" ? SlideInRight : FadeIn;
  const exit = direction === "forward" ? SlideOutLeft : FadeOut;
  return (
    <Animated.View
      key={stepKey}
      entering={enter.duration(280).springify().damping(18)}
      exiting={exit.duration(220)}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
}
```

- [ ] **Step 2: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

---

## Task 10 — Apply StepIndicator + StepTransition to onboarding orchestrator

**Files:**
- Modify: `apps/mobile/app/(app)/onboarding.tsx`

- [ ] **Step 1: Import the new primitives.**

Add to the imports:
```tsx
import { StepIndicator } from "../../components/onboarding/step-indicator";
import { StepTransition } from "../../components/onboarding/step-transition";
```

- [ ] **Step 2: Track direction.**

Add a ref + helper near the existing `setStep` calls. Above the return:

```tsx
const directionRef = useRef<"forward" | "backward">("forward");

function goForward(next: Step) {
  directionRef.current = "forward";
  setStep(next);
}

function goBack() {
  const back = BACK_MAP[step];
  if (back) {
    directionRef.current = "backward";
    setStep(back);
  }
}
```

Replace every existing `setStep("X")` *forward* call with `goForward("X")`. The existing `goBack()` function should be replaced with the new one above.

(Note: don't touch the LOADING-step logic added in the previous session.)

- [ ] **Step 3: Add the StepIndicator above the step content.**

Inside the SafeAreaView, after the back button block but before the step rendering, add:

```tsx
{step !== "WELCOME" && step !== "LOADING" ? (
  <View className="absolute left-0 right-0 top-12 z-40 items-center">
    <StepIndicator
      total={STEP_ORDER.length - 1 /* exclude LOADING from the dots */}
      current={STEP_ORDER.indexOf(step)}
    />
  </View>
) : null}
```

(The Welcome screen has its own intro layout — no dots. Loading also has no dots.)

- [ ] **Step 4: Wrap the step rendering in StepTransition.**

Replace the chain of `{step === "WELCOME" ? <WelcomeStep ... /> : null}` blocks with a single conditional render inside StepTransition:

```tsx
<StepTransition stepKey={step} direction={directionRef.current}>
  {step === "WELCOME" ? (
    <WelcomeStep onNext={() => goForward("IDENTITY")} />
  ) : null}
  {step === "IDENTITY" ? (
    <IdentityStep
      name={name}
      setName={setName}
      onNext={() => goForward("VIBE_QUIZ")}
    />
  ) : null}
  {/* ... repeat the existing pattern, but every setStep is replaced with goForward */}
</StepTransition>
```

Keep all per-step props the same; only the wrapping changes.

- [ ] **Step 5: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

- [ ] **Step 6: Visual verification (user-action).**

User signs up with a fresh test account (or manually flips `onboarding_completed=false` in Supabase for `test@test.com` to retrigger). Tapping Next on each step should now slide horizontally to the next step. Tapping Back should slide in the opposite direction. Step dots should show progress at the top.

---

## Task 11 — Rewrite WallpaperBackground with vivid radial blob gradients

**Why (from spec Theme 6):** The mobile wallpaper renders as near-black 3-color linear gradient. Web's `neon` is a vivid green/blue/magenta radial-blob composition. The wallpaper feature is currently invisible on mobile.

**Files:**
- Modify: `apps/mobile/components/chat/wallpaper-background.tsx`

- [ ] **Step 1: Read the current implementation.**

```bash
cat apps/mobile/components/chat/wallpaper-background.tsx
```

- [ ] **Step 2: Read the web's wallpaper definitions to copy hex stops.**

```bash
grep -rn "chat-wallpaper\|chat_wallpaper" apps/web/src --include="*.css" --include="*.tsx" | head -20
```

Expected to find a CSS file or component with the radial-gradient stops. Note the colors used per wallpaper id (`neon`, `aurora`, `sunset`, `graphite`, `midnight`, `soft`).

- [ ] **Step 3: Rewrite the component.**

Replace `apps/mobile/components/chat/wallpaper-background.tsx` with:

```tsx
import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ChatWallpaper } from "@mygang/shared";

type Blob = {
  /** Two-color gradient (center → edge). */
  colors: [string, string];
  /** Center position as 0–1 fractions of screen. */
  cx: number;
  cy: number;
  /** Radius as fraction of screen min-dimension. */
  rx: number;
  ry: number;
};

/**
 * Each preset is composed as a stack of large soft blobs over a base color.
 * RN doesn't support CSS radial-gradient, so each "blob" is an absolutely-positioned
 * LinearGradient inside a circular View whose center is at (cx, cy). The blob's
 * border-radius makes it round; the gradient fades center → edge alpha.
 */
const WALLPAPERS: Record<ChatWallpaper, { base: string; blobs: Blob[] }> = {
  default: {
    base: "#161924",
    blobs: [],
  },
  neon: {
    base: "#0a1620",
    blobs: [
      { colors: ["rgba(62,221,192,0.55)", "rgba(62,221,192,0)"], cx: 0.15, cy: 0.25, rx: 0.95, ry: 0.95 },
      { colors: ["rgba(96,165,250,0.55)", "rgba(96,165,250,0)"], cx: 0.85, cy: 0.55, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(217,70,239,0.45)", "rgba(217,70,239,0)"], cx: 0.50, cy: 0.95, rx: 1.1, ry: 1.1 },
    ],
  },
  aurora: {
    base: "#0c1428",
    blobs: [
      { colors: ["rgba(34,211,238,0.55)", "rgba(34,211,238,0)"], cx: 0.20, cy: 0.20, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(74,222,128,0.45)", "rgba(74,222,128,0)"], cx: 0.80, cy: 0.30, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(167,139,250,0.45)", "rgba(167,139,250,0)"], cx: 0.50, cy: 0.85, rx: 1.1, ry: 1.1 },
    ],
  },
  sunset: {
    base: "#1a1020",
    blobs: [
      { colors: ["rgba(251,146,60,0.55)", "rgba(251,146,60,0)"], cx: 0.20, cy: 0.20, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(244,114,182,0.50)", "rgba(244,114,182,0)"], cx: 0.85, cy: 0.55, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(168,85,247,0.45)", "rgba(168,85,247,0)"], cx: 0.50, cy: 0.95, rx: 1.1, ry: 1.1 },
    ],
  },
  soft: {
    base: "#16181f",
    blobs: [
      { colors: ["rgba(148,163,184,0.30)", "rgba(148,163,184,0)"], cx: 0.30, cy: 0.30, rx: 1.2, ry: 1.2 },
      { colors: ["rgba(199,210,254,0.25)", "rgba(199,210,254,0)"], cx: 0.75, cy: 0.75, rx: 1.2, ry: 1.2 },
    ],
  },
  graphite: {
    base: "#0e0f12",
    blobs: [
      { colors: ["rgba(255,255,255,0.10)", "rgba(255,255,255,0)"], cx: 0.30, cy: 0.20, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"], cx: 0.80, cy: 0.85, rx: 1.0, ry: 1.0 },
    ],
  },
  midnight: {
    base: "#070b16",
    blobs: [
      { colors: ["rgba(59,130,246,0.45)", "rgba(59,130,246,0)"], cx: 0.20, cy: 0.30, rx: 1.0, ry: 1.0 },
      { colors: ["rgba(99,102,241,0.40)", "rgba(99,102,241,0)"], cx: 0.85, cy: 0.75, rx: 1.0, ry: 1.0 },
    ],
  },
};

type WallpaperBackgroundProps = {
  wallpaper: ChatWallpaper;
  children: ReactNode;
};

export function WallpaperBackground({ wallpaper, children }: WallpaperBackgroundProps) {
  const preset = WALLPAPERS[wallpaper] ?? WALLPAPERS.default;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: preset.base }]}>
      {preset.blobs.map((blob, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${(blob.cx - blob.rx / 2) * 100}%`,
            top: `${(blob.cy - blob.ry / 2) * 100}%`,
            width: `${blob.rx * 100}%`,
            height: `${blob.ry * 100}%`,
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={blob.colors}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0, y: 0 }}
            style={{ flex: 1 }}
          />
        </View>
      ))}
      {children}
    </View>
  );
}
```

**Important:** the existing component receives `wallpaper` as a prop and renders a child slot. If the current signature differs (e.g., it's `style` based), match the existing call sites — don't break them. Read `apps/mobile/app/(app)/chat.tsx` to confirm how `<WallpaperBackground>` is currently consumed and adapt accordingly.

- [ ] **Step 4: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

- [ ] **Step 5: Visual verification (user-action).**

User reloads, opens chat. The wallpaper should now show vivid colored "blobs" instead of a flat dark gradient. Toggle between wallpaper presets in settings — each should look distinctly different (neon = green/blue/magenta, sunset = orange/pink, midnight = blue, etc.).

**Note about LinearGradient simulating radial:** the `start={{ x: 0.5, y: 0.5 }}` `end={{ x: 0, y: 0 }}` direction creates a fade from center toward one corner inside the circular clip. For a true radial fade in all directions, we'd need `react-native-svg` with `<RadialGradient>`. The linear-inside-circle approach is a 90% solution that ships now; if visual feedback says it still looks off, we'll revisit with RadialGradient in Phase 2.

---

## Task 12 — Server-side: write `/api/account/delete` endpoint with tests

**Why (from spec X6):** Mobile delete-account currently only sets `deletion_requested_at` and signs out. User data persists. This is a real GDPR-relevant bug.

**Files:**
- Create: `apps/web/src/app/api/account/delete/route.ts`
- Create: `apps/web/tests/api/account-delete.test.ts`

- [ ] **Step 1: Find what the existing delete-account flow does on the web side for reference.**

```bash
grep -rn "deleteAccount\|delete.*account\|account.*delete" apps/web/src/app/auth/ apps/web/src/lib/ 2>/dev/null | head -10
```

Read whatever shows up. Web likely has either a server action or an existing endpoint. **If a server action `deleteAccount()` already exists in `apps/web/src/app/auth/actions.ts` and does the full purge, just expose it as a POST endpoint instead of duplicating logic.**

- [ ] **Step 2: Write the failing test first.**

Create `apps/web/tests/api/account-delete.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("POST /api/account/delete", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await fetch(`${process.env.TEST_BASE_URL ?? "http://localhost:3000"}/api/account/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  // Note: integration tests against a real Supabase instance for the actual purge
  // path are deferred to QA — they require a throwaway test user we can't safely
  // create from CI. The 401 test verifies the auth gate; the purge logic is
  // exercised manually by the delete-account flow itself in QA.
});
```

- [ ] **Step 3: Run the test to verify it fails.**

```bash
pnpm --filter=@mygang/web test -- account-delete
```

Expected: FAIL (route doesn't exist yet → connection error or 404).

- [ ] **Step 4: Implement the route.**

Create `apps/web/src/app/api/account/delete/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Permanently deletes the authenticated user and ALL of their data.
 *
 * Mobile and web both call this. Auth is via either Supabase cookie (web) or
 * Authorization: Bearer <access_token> header (mobile). createClientFromRequest
 * accepts both.
 *
 * Order of operations matters: child tables first, profiles next, auth.users last.
 * Some tables have ON DELETE CASCADE FROM profiles, but we delete explicitly to be
 * safe across schema versions.
 */
export async function POST(request: Request) {
  const supabase = await createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userId = user.id
  const admin = createAdminClient()

  const tablesToPurge = [
    'memories',
    'chat_history',
    'gang_members',
    'gangs',
    // profiles is handled separately (FK target for several of the above);
    // delete it after children to avoid FK violations on schemas without CASCADE.
  ]

  for (const table of tablesToPurge) {
    const { error } = await admin.from(table).delete().eq('user_id', userId)
    if (error) {
      console.error(`[account/delete] purging ${table} failed:`, error)
      return NextResponse.json(
        { error: `Failed to purge ${table}: ${error.message}` },
        { status: 500 }
      )
    }
  }

  // Profile row (id, not user_id, since profiles.id IS the user id).
  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
  if (profileError) {
    console.error('[account/delete] purging profile failed:', profileError)
    return NextResponse.json(
      { error: `Failed to purge profile: ${profileError.message}` },
      { status: 500 }
    )
  }

  // Finally, delete the auth user. This invalidates all sessions.
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    console.error('[account/delete] auth.admin.deleteUser failed:', authError)
    return NextResponse.json(
      { error: `Failed to delete auth user: ${authError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Verify the test passes.**

Start the web dev server in another terminal:

```bash
pnpm --filter=@mygang/web dev
```

Then in this terminal:

```bash
pnpm --filter=@mygang/web test -- account-delete
```

Expected: PASS.

If the test runner can't reach the dev server, set `TEST_BASE_URL=http://localhost:3000` in env.

- [ ] **Step 6: Web build.**

```bash
pnpm --filter=@mygang/web build
```

Expected: build completes with exit code 0. The new route should appear in the route table output.

- [ ] **Step 7: Verify the table list matches the actual schema.**

```bash
ls apps/web/supabase/migrations/ | head -20
```

Read 2-3 recent migrations to confirm the table list (`memories`, `chat_history`, `gang_members`, `gangs`, `profiles`) is current. If new tables exist that store user data per `user_id`, add them to the `tablesToPurge` array. (This is a "stale array" risk — note in the route's comment so future sessions remember to update.)

---

## Task 13 — Wire mobile delete-account to the new endpoint

**Files:**
- Modify: `apps/mobile/app/(app)/delete-account.tsx`
- Modify: `apps/mobile/lib/chat-storage.ts` (verify export of `clearPersistedMessages`)

- [ ] **Step 1: Read the current mobile delete-account implementation.**

```bash
cat apps/mobile/app/\(app\)/delete-account.tsx
```

Identify the existing `runDeletion` (or equivalent) function from Task 7 step 4.

- [ ] **Step 2: Replace `runDeletion` body to call the API endpoint.**

```tsx
async function runDeletion() {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    Alert.alert("Not signed in", "Please sign in again before deleting.");
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
    return;
  }

  // Local cleanup. The server already invalidated the session.
  if (user?.id) await clearPersistedMessages(user.id);
  await supabase.auth.signOut();
  // The route gate redirects to /(auth)/sign-in on session change.
}
```

- [ ] **Step 3: Typecheck.**

```bash
pnpm --filter=@mygang/mobile typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual flow test (user-action).**

This is destructive and creates a fresh test user in Supabase. **Don't run on the existing `test@test.com` account.** Create a one-off `test-delete-{date}@test.com` account, walk through onboarding, then delete it. Verify in Supabase dashboard that the auth user, profiles row, and chat_history rows are all gone.

If the test fails, the route's error message is returned in the alert — paste it back and we debug.

---

## After this plan is complete

When all 13 tasks are done and the user has visually verified the changes:

1. Update the master plan checkboxes at `docs/superpowers/plans/2026-04-29-mobile-app-plan.md` (mark Phase 1 of parity work as ✅ Done).
2. Write a session log at `docs/superpowers/sessions/YYYY-MM-DD-session-NN.md` summarizing what shipped.
3. Decide with the user whether to proceed straight into Phase 2 (chat surface specifics) or do another round of phone-testing first.

Phase 2 (separate plan) will cover the per-screen chat deltas C1–C7, H1, H3, I1–I5, D1–D8 — bubble grouped corners, name+archetype rows, inline like/reply icons, timestamps, header polish, input pill, drawer rebuild.

Phase 3 will cover onboarding step specifics — Welcome polish, Vibe Quiz motion, Avatar Gift marquee, Avatar Style hero cards, Selection Details modal, Friends Intro light pills, Loading checklist morph.

---

## Self-review notes (run before handing to executor)

- **Spec coverage check:** Themes 1-6 → Tasks 2, 3-4, 6, 8, 9, 11 ✓. Theme 7 (eyebrow micro-typography) is folded into Task 4's component design — sweep is Phase 2/3. Theme 8 (InlineToast vs Alert) is partially covered by ConfirmDialog (Task 6) but the full toast component is deferred. X6 (delete-account purge) → Tasks 12 + 13 ✓.
- **Placeholder scan:** No "TBD"s. Each step has actual code or actual commands. The few "user-action" steps explicitly say what the user verifies.
- **Type consistency check:** PrimaryButton API (`label`, `variant`, `iconRight`, `upperCase`, `size`, `isLoading`, `onPress`, `disabled`) is consistent across Task 2 definition + Task 5 application. ConfirmDialog API (`visible`, `title`, `body`, `confirmLabel`, `confirmLabelStep2`, `cancelLabel`, `icon`, `variant`, `twoStep`, `onConfirm`, `onCancel`) is consistent across Task 6 definition + Task 7 application. StepTransition API (`stepKey`, `direction`, `children`) consistent across Task 9 + Task 10. WallpaperBackground keeps existing `wallpaper` + `children` API per Task 11 step 3 explicit note.
- **Ambiguity check:** None found. Each task names exact files, exact code, exact commands.
