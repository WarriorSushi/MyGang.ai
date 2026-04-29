# Phase 1 — Auth + App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex agents:** the workflow is the same — pick the next unchecked checkbox, do that step, check it off. The skill names are Claude Code shortcuts; the workflow underneath them is universal.

**Goal:** A user can install the mobile app, sign up with email + password, sign in, reset their password via deep-linked email, complete a basic onboarding (pick username + select gang), and land on a placeholder home screen that knows who they are. Persistent auth across app restarts. The app shell is structured so Phase 2 (chat) drops in cleanly.

**Architecture:** Expo Router file-based routing with grouped layouts: `(auth)` for unauthenticated screens, `(app)` for authenticated screens. A root-level layout watches Supabase auth state and redirects between the two groups. Auth screens consume `@supabase/supabase-js` directly via `apps/mobile/lib/supabase.ts` (no API roundtrip needed for auth). Onboarding writes to the same Supabase `profiles` table the web app uses, so a user who signs up on mobile and then opens the web app sees the same state.

**Tech Stack:** Expo SDK 54 + Expo Router 6 + React 19.1 + Supabase JS + react-hook-form + Zod (from `@mygang/shared`) + AsyncStorage. NativeWind for styling. No new top-level dependencies expected.

**Estimated effort:** ~3 weeks calendar (solo, vibe-coded).

**Spec reference:** `docs/superpowers/specs/2026-04-29-mobile-app-design.md` §3.3 (auth strategy).

---

## Out of scope for Phase 1 (deliberate)

The following are NOT in this plan. Each has a reason.

| Out-of-scope | Why deferred | Where it lands |
|---|---|---|
| **Google OAuth sign-in** | Requires Android OAuth client tied to EAS-managed keystore SHA-1 → blocked on EAS Build setup. Email/password alone is shippable on its own. | Phase 1.5 (optional, post-EAS) |
| **Cloudflare Turnstile** | Web-only; mobile equivalent is Play Integrity API which is a Phase 4 concern. | Phase 4 (with Play Billing) |
| **Anti-abuse rate limiting on mobile** | The server-side `/api/*` rate limits already cover mobile because mobile hits the same endpoints. No mobile-side work needed. | Already handled (server) |
| **Push notifications** | Phase 3. Mobile auth doesn't need push to work. | Phase 3 |
| **Real chat UI** | Phase 2. Phase 1 ends at a placeholder "logged in as X" home screen. | Phase 2 |
| **Subscription tier gating UI** | Phase 4. The data flows through `@mygang/shared` already, but there's no paywall UX yet. | Phase 4 |
| **Profile editing** | Phase 3. Onboarding sets username + gang once; editing is a settings concern. | Phase 3 |

---

## Pre-flight

These must be true before Task 1.1 starts.

- [ ] **Pre-flight 1: Phase 0 is fully complete.** Branch `mobile-app-init` should be at SHA `05f0a76` or later. The mobile app should render "MyGang / Hello from the gang." on a real Android phone via Expo Go. Web build clean. `pnpm --filter=@mygang/web test:fast` passes 52 / fails 2 (chat-arrival pre-existing).

- [ ] **Pre-flight 2: User has access to the Supabase dashboard.** Phase 1 will require adding the deep-link URL `mygang://auth/callback` and `mygang://reset-password` to Supabase → Authentication → URL Configuration → Redirect URLs.

- [ ] **Pre-flight 3: Expo dev server still works.** `pnpm exec expo start` from `apps/mobile/`. Phone connects via Expo Go. Hello World screen renders. If anything broke since Phase 0, fix that first.

---

## Task 1.0 — Lift auth-related shared code (incremental)

**Goal:** Move just the auth-related Zod schemas / types from `apps/web` into `packages/shared`, so both apps validate the same way.

**Files:**
- Create: `packages/shared/src/auth/schemas.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: import sites in `apps/web/src/app/auth/` if any duplicate schema definitions exist

- [ ] **Step 1: Inventory existing auth schemas in apps/web.**

  ```bash
  grep -rn "z\.object\|z\.string\|z\.email" apps/web/src/app/auth apps/web/src/lib | head -30
  ```

  Identify schemas like: sign-up payload, sign-in payload, reset-password payload, forgot-password payload, username validation. Note each file/line.

- [ ] **Step 2: Create the shared auth schemas file.**

  Create `packages/shared/src/auth/schemas.ts`:

  ```typescript
  import { z } from "zod";

  export const emailSchema = z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email");

  export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long");

  export const usernameSchema = z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(24, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _, and -");

  export const signUpInputSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
  });

  export const signInInputSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  });

  export const forgotPasswordInputSchema = z.object({
    email: emailSchema,
  });

  export const resetPasswordInputSchema = z
    .object({
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  export type SignUpInput = z.infer<typeof signUpInputSchema>;
  export type SignInInput = z.infer<typeof signInInputSchema>;
  export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
  export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
  ```

  If apps/web's existing schemas use different rules (e.g. min length 6 not 8), match what's there — consistency wins over my taste.

- [ ] **Step 3: Verify zod is installed at packages/shared level.**

  Open `packages/shared/package.json`. Add to dependencies if not present:
  ```json
  "dependencies": {
    "zod": "^3.23.8"
  }
  ```

  Run `pnpm install` from repo root.

- [ ] **Step 4: Re-export from `packages/shared/src/index.ts`.**

  Add: `export * from "./auth/schemas";`

- [ ] **Step 5: Update apps/web's existing auth code to import from shared.**

  Find any duplicated schema definitions in `apps/web/src/app/auth/` or `apps/web/src/lib/` and replace with imports from `@mygang/shared`. Delete the now-redundant local definitions.

- [ ] **Step 6: Verify web build + tests.**

  ```bash
  pnpm --filter=@mygang/web build
  pnpm --filter=@mygang/web test:fast
  ```

  Both should be clean (52 pass / 2 fail baseline).

- [ ] **Step 7: Commit.**

  ```bash
  git add -A
  git commit -m "feat(shared): lift auth schemas (Zod) for shared validation"
  ```

---

## Task 1.1 — Configure deep linking

**Goal:** The mobile app's `mygang://` scheme correctly opens specific screens. Email links from Supabase auth (password reset) open the app, not a browser. URLs round-trip through Expo Linking and resolve to Expo Router routes.

**Files:**
- Modify: `apps/mobile/app.json` (deep-link config)
- Modify: Supabase dashboard (USER ACTION)
- Verify: `apps/mobile/lib/supabase.ts` (already created in Phase 0)

- [ ] **Step 1: Confirm `app.json` has the `mygang` scheme.**

  Open `apps/mobile/app.json`. Verify the `expo.scheme` field is `"mygang"`. If absent (it shouldn't be; we set this in Phase 0), add it.

- [ ] **Step 2: Add intent filters for Android deep links (optional, for handling https://mygang.ai links).**

  Inside `expo.android` in `app.json`, add:
  ```json
  "intentFilters": [
    {
      "action": "VIEW",
      "autoVerify": false,
      "data": [
        { "scheme": "mygang" }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
  ```

  This isn't strictly required for the `mygang://` scheme (Expo handles that), but it makes the intent filter explicit.

- [ ] **Step 3: USER ACTION — Configure Supabase Auth Redirect URLs.**

  Tell the user to:
  1. Go to https://supabase.com/dashboard/project/rpizfqjtrwhackeqcsau/auth/url-configuration
  2. Under "Redirect URLs," add the following entries (each on its own line):
     - `mygang://auth/callback`
     - `mygang://reset-password`
     - `mygang://**` (wildcard fallback for any other deep-link auth flow we add later)
  3. Save.

  After this, Supabase's auth emails (password reset, magic link, etc.) will use `mygang://...` URLs that open the app.

- [ ] **Step 4: Update Supabase client config to handle URL-based session.**

  Edit `apps/mobile/lib/supabase.ts`. The `detectSessionInUrl` flag is currently `false` — keep it that way (RN doesn't have a URL bar). Instead, deep links are handled imperatively via `expo-linking`. No changes to this file.

- [ ] **Step 5: Add a deep-link handler in the root layout.**

  This will be implemented properly in Task 1.7 (reset password). For now, just verify `expo-linking` works.

  Create `apps/mobile/lib/deep-links.ts`:
  ```typescript
  import * as Linking from "expo-linking";

  /** The base scheme for the app, e.g. "mygang://". */
  export const APP_SCHEME = "mygang";

  /** Build a deep link URL for the given path. */
  export function makeDeepLink(path: string): string {
    return Linking.createURL(path);
  }

  /** Parse the path + query params from a deep link. */
  export function parseDeepLink(url: string): { path: string; params: Record<string, string> } {
    const parsed = Linking.parse(url);
    return {
      path: parsed.path ?? "",
      params: (parsed.queryParams ?? {}) as Record<string, string>,
    };
  }
  ```

- [ ] **Step 6: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

  Should pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): configure mygang:// deep links + Supabase redirect URLs"
  ```

---

## Task 1.2 — Set up Expo Router auth/(app) groups + auth gate

**Goal:** Restructure the mobile app's file tree so authenticated screens live under `app/(app)/` and unauthenticated screens live under `app/(auth)/`. A root-level layout decides which group to redirect to based on Supabase session state. New users → `(auth)/sign-in`. Returning users with a session → `(app)/index` or `(app)/onboarding` based on profile.

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Move: `apps/mobile/app/index.tsx` → `apps/mobile/app/(app)/index.tsx`
- Create: `apps/mobile/lib/auth-context.tsx` (session + profile state hook)

- [ ] **Step 1: Create the auth context provider.**

  Create `apps/mobile/lib/auth-context.tsx`:
  ```typescript
  import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
  import type { Session, User } from "@supabase/supabase-js";
  import { supabase } from "./supabase";

  type AuthState = {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
  };

  const AuthContext = createContext<AuthState>({
    session: null,
    user: null,
    isLoading: true,
  });

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setIsLoading(false);
      });

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });

      return () => {
        subscription.subscription.unsubscribe();
      };
    }, []);

    return (
      <AuthContext.Provider
        value={{ session, user: session?.user ?? null, isLoading }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth(): AuthState {
    return useContext(AuthContext);
  }
  ```

- [ ] **Step 2: Update root `_layout.tsx` to wrap with AuthProvider and gate routing.**

  Replace `apps/mobile/app/_layout.tsx` with:
  ```typescript
  import { Stack, useRouter, useSegments } from "expo-router";
  import { StatusBar } from "expo-status-bar";
  import "react-native-reanimated";
  import { useEffect } from "react";

  import "../global.css";
  import { AuthProvider, useAuth } from "../lib/auth-context";

  function RouteGate() {
    const { session, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
      if (isLoading) return;
      const inAuthGroup = segments[0] === "(auth)";
      const inAppGroup = segments[0] === "(app)";

      if (!session && !inAuthGroup) {
        router.replace("/(auth)/sign-in");
      } else if (session && (inAuthGroup || segments.length === 0)) {
        router.replace("/(app)");
      }
    }, [session, isLoading, segments, router]);

    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    );
  }

  export default function RootLayout() {
    return (
      <AuthProvider>
        <RouteGate />
        <StatusBar style="light" />
      </AuthProvider>
    );
  }
  ```

- [ ] **Step 3: Move the existing home screen into the `(app)` group.**

  ```bash
  mkdir -p apps/mobile/app/(app)
  git mv apps/mobile/app/index.tsx apps/mobile/app/(app)/index.tsx
  ```

- [ ] **Step 4: Create the `(app)` group layout (placeholder for now).**

  Create `apps/mobile/app/(app)/_layout.tsx`:
  ```typescript
  import { Stack } from "expo-router";

  export default function AppLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```

- [ ] **Step 5: Create the `(auth)` group layout (placeholder for now).**

  Create `apps/mobile/app/(auth)/_layout.tsx`:
  ```typescript
  import { Stack } from "expo-router";

  export default function AuthLayout() {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    );
  }
  ```

- [ ] **Step 6: Create a placeholder sign-in screen so the gate has somewhere to redirect to.**

  Create `apps/mobile/app/(auth)/sign-in.tsx`:
  ```typescript
  import { Text, View } from "react-native";

  export default function SignInScreen() {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="text-2xl font-bold text-white">Sign In (placeholder)</Text>
        <Text className="mt-2 text-zinc-400">Real screen comes in Task 1.5.</Text>
      </View>
    );
  }
  ```

- [ ] **Step 7: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 8: Run the app and verify routing.**

  Start the dev server (`cd apps/mobile && pnpm exec expo start --clear`).

  Open in Expo Go. Expected behavior: because no session exists, you land on the placeholder Sign In screen.

- [ ] **Step 9: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): add (auth)/(app) router groups + session-based gate"
  ```

---

## Task 1.3 — Build the Sign-Up screen + flow

**Goal:** A user can create a new account with email + password. Form validates with the shared Zod schema. On success, Supabase sends a verification email and we show a "check your email" state.

**Files:**
- Create: `apps/mobile/app/(auth)/sign-up.tsx`
- Modify: `apps/mobile/app/(auth)/sign-in.tsx` (add link to sign-up)
- Create: `apps/mobile/components/form-field.tsx` (reusable form input)
- Create: `apps/mobile/components/primary-button.tsx` (reusable button)
- Add deps: `react-hook-form`, `@hookform/resolvers`

- [ ] **Step 1: Add react-hook-form dependencies.**

  ```bash
  pnpm --filter=@mygang/mobile add react-hook-form @hookform/resolvers
  ```

- [ ] **Step 2: Create a reusable FormField component.**

  Create `apps/mobile/components/form-field.tsx`:
  ```typescript
  import { Text, TextInput, View, type TextInputProps } from "react-native";
  import type { Control, FieldPath, FieldValues } from "react-hook-form";
  import { Controller } from "react-hook-form";

  type FormFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    error?: string;
  } & Omit<TextInputProps, "value" | "onChangeText" | "onBlur">;

  export function FormField<T extends FieldValues>({
    control,
    name,
    label,
    error,
    ...textInputProps
  }: FormFieldProps<T>) {
    return (
      <View className="mb-4">
        <Text className="mb-1 text-sm text-zinc-300">{label}</Text>
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              {...textInputProps}
              value={value as string}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor="#52525b"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-base text-white"
            />
          )}
        />
        {error ? <Text className="mt-1 text-xs text-red-400">{error}</Text> : null}
      </View>
    );
  }
  ```

- [ ] **Step 3: Create a reusable PrimaryButton component.**

  Create `apps/mobile/components/primary-button.tsx`:
  ```typescript
  import { ActivityIndicator, Pressable, Text } from "react-native";

  type PrimaryButtonProps = {
    label: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
  };

  export function PrimaryButton({ label, onPress, isLoading = false, disabled = false }: PrimaryButtonProps) {
    const inactive = disabled || isLoading;
    return (
      <Pressable
        onPress={inactive ? undefined : onPress}
        className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${
          inactive ? "bg-zinc-700" : "bg-white active:bg-zinc-200"
        }`}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className={`text-base font-semibold ${inactive ? "text-zinc-400" : "text-zinc-950"}`}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
  ```

- [ ] **Step 4: Build the SignUp screen.**

  Create `apps/mobile/app/(auth)/sign-up.tsx`:
  ```typescript
  import { useState } from "react";
  import { Text, View, Alert } from "react-native";
  import { Link } from "expo-router";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { signUpInputSchema, type SignUpInput } from "@mygang/shared";

  import { supabase } from "../../lib/supabase";
  import { FormField } from "../../components/form-field";
  import { PrimaryButton } from "../../components/primary-button";

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
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      setIsSubmitting(false);

      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }
      setSubmitted(true);
    }

    if (submitted) {
      return (
        <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
          <Text className="text-2xl font-bold text-white">Check your email</Text>
          <Text className="mt-2 text-center text-zinc-400">
            We sent a verification link. Tap it to finish creating your account.
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center bg-zinc-950 px-6">
        <Text className="mb-2 text-3xl font-bold text-white">Create account</Text>
        <Text className="mb-6 text-zinc-400">Join the gang.</Text>

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

        <PrimaryButton label="Sign Up" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-zinc-400">Already have an account? </Text>
          <Link href="/(auth)/sign-in" className="text-white underline">
            Sign in
          </Link>
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 5: Update the placeholder Sign In screen to link to Sign Up.**

  Replace `apps/mobile/app/(auth)/sign-in.tsx`:
  ```typescript
  import { Text, View } from "react-native";
  import { Link } from "expo-router";

  export default function SignInScreen() {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="text-2xl font-bold text-white">Sign In (placeholder)</Text>
        <Text className="mt-2 text-zinc-400">Real screen comes in Task 1.4.</Text>
        <Link href="/(auth)/sign-up" className="mt-6 text-white underline">
          Go to Sign Up →
        </Link>
      </View>
    );
  }
  ```

- [ ] **Step 6: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 7: Run the app, navigate to Sign Up, fill out the form.**

  Restart Expo Go. Tap "Go to Sign Up." Enter a new email + password. Tap Sign Up. Expected: validation works (try a too-short password, see the error); a real submission shows "Check your email." Verify the email arrives in the user's inbox.

- [ ] **Step 8: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): sign-up screen with shared Zod validation"
  ```

---

## Task 1.4 — Build the Sign-In screen + flow

**Goal:** A user can sign in with their existing email + password. On success, the route gate (Task 1.2) redirects them to `(app)`.

**Files:**
- Modify: `apps/mobile/app/(auth)/sign-in.tsx` (replace placeholder)

- [ ] **Step 1: Replace the placeholder Sign In with the real screen.**

  Overwrite `apps/mobile/app/(auth)/sign-in.tsx`:
  ```typescript
  import { useState } from "react";
  import { Text, View, Alert } from "react-native";
  import { Link } from "expo-router";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { signInInputSchema, type SignInInput } from "@mygang/shared";

  import { supabase } from "../../lib/supabase";
  import { FormField } from "../../components/form-field";
  import { PrimaryButton } from "../../components/primary-button";

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
      // Route gate redirects on session change; nothing to do here.
    }

    return (
      <View className="flex-1 justify-center bg-zinc-950 px-6">
        <Text className="mb-2 text-3xl font-bold text-white">Welcome back</Text>
        <Text className="mb-6 text-zinc-400">Your gang's been waiting.</Text>

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

        <PrimaryButton label="Sign In" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />

        <Link href="/(auth)/forgot-password" className="mt-4 self-center text-sm text-zinc-400 underline">
          Forgot password?
        </Link>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-zinc-400">No account yet? </Text>
          <Link href="/(auth)/sign-up" className="text-white underline">
            Sign up
          </Link>
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 2: Update the (app)/index.tsx placeholder to show the user's email.**

  Replace `apps/mobile/app/(app)/index.tsx`:
  ```typescript
  import { Pressable, Text, View } from "react-native";
  import { useAuth } from "../../lib/auth-context";
  import { supabase } from "../../lib/supabase";

  export default function HomeScreen() {
    const { user } = useAuth();

    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="text-3xl font-bold text-white">MyGang</Text>
        <Text className="mt-2 text-zinc-400">Signed in as</Text>
        <Text className="text-base text-white">{user?.email ?? "(unknown)"}</Text>
        <Pressable
          className="mt-8 rounded-lg bg-red-600 px-4 py-2"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="text-white">Sign out</Text>
        </Pressable>
      </View>
    );
  }
  ```

- [ ] **Step 3: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 4: Run the full sign-in flow on the phone.**

  - Sign in with the email/password you signed up with in Task 1.3.
  - Verify (after Supabase verification email is opened) that you land on the home screen showing your email.
  - Tap "Sign out." Verify you're back at the sign-in screen.
  - Force-close the app. Reopen it. **You should still be signed in** (session persists via AsyncStorage).

- [ ] **Step 5: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): sign-in screen + home shows logged-in user"
  ```

---

## Task 1.5 — Build Forgot Password screen + flow

**Goal:** User taps "Forgot password," enters their email, gets a reset email with a `mygang://reset-password?token=...` deep link.

**Files:**
- Create: `apps/mobile/app/(auth)/forgot-password.tsx`

- [ ] **Step 1: Create the Forgot Password screen.**

  Create `apps/mobile/app/(auth)/forgot-password.tsx`:
  ```typescript
  import { useState } from "react";
  import { Text, View, Alert } from "react-native";
  import { Link } from "expo-router";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { forgotPasswordInputSchema, type ForgotPasswordInput } from "@mygang/shared";

  import { supabase } from "../../lib/supabase";
  import { FormField } from "../../components/form-field";
  import { PrimaryButton } from "../../components/primary-button";
  import { makeDeepLink } from "../../lib/deep-links";

  export default function ForgotPasswordScreen() {
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<ForgotPasswordInput>({
      resolver: zodResolver(forgotPasswordInputSchema),
      defaultValues: { email: "" },
    });

    async function onSubmit(values: ForgotPasswordInput) {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: makeDeepLink("reset-password"),
      });
      setIsSubmitting(false);

      if (error) {
        Alert.alert("Could not send reset email", error.message);
        return;
      }
      setSubmitted(true);
    }

    if (submitted) {
      return (
        <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
          <Text className="text-2xl font-bold text-white">Check your email</Text>
          <Text className="mt-2 text-center text-zinc-400">
            We sent a password reset link. Tap it to set a new password.
          </Text>
          <Link href="/(auth)/sign-in" className="mt-6 text-white underline">
            Back to Sign In
          </Link>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center bg-zinc-950 px-6">
        <Text className="mb-2 text-3xl font-bold text-white">Reset password</Text>
        <Text className="mb-6 text-zinc-400">
          Enter your email and we'll send a reset link.
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

        <PrimaryButton label="Send Reset Link" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />

        <Link href="/(auth)/sign-in" className="mt-6 self-center text-sm text-zinc-400 underline">
          Back to Sign In
        </Link>
      </View>
    );
  }
  ```

- [ ] **Step 2: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 3: Run the flow.**

  - From Sign In, tap "Forgot password?"
  - Enter the email you signed up with.
  - Tap "Send Reset Link."
  - Verify "Check your email" message appears.
  - Open your email — you should see a reset link.
  - **DO NOT TAP THE LINK YET** — the reset-password screen lands in Task 1.6. For now, just verify the email arrives and that the link looks like `mygang://reset-password#access_token=...&type=recovery&...`.

- [ ] **Step 4: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): forgot-password screen + email-sending flow"
  ```

---

## Task 1.6 — Build Reset Password screen + deep-link handling

**Goal:** When the user taps the reset link from email, the app opens to the reset-password screen with the access token from the URL hash. They enter a new password and submit.

**Files:**
- Create: `apps/mobile/app/(auth)/reset-password.tsx`
- Modify: `apps/mobile/lib/deep-links.ts` (add hash-fragment parsing for Supabase auth URLs)

- [ ] **Step 1: Add Supabase URL hash parsing to the deep-links helper.**

  Append to `apps/mobile/lib/deep-links.ts`:
  ```typescript
  /**
   * Supabase auth deep-link URLs put parameters in the URL hash fragment, not the
   * query string. Example: mygang://reset-password#access_token=xxx&type=recovery
   * This helper extracts those params.
   */
  export function parseSupabaseHashParams(url: string): Record<string, string> {
    const hashIndex = url.indexOf("#");
    if (hashIndex === -1) return {};
    const fragment = url.slice(hashIndex + 1);
    const params: Record<string, string> = {};
    for (const pair of fragment.split("&")) {
      const [key, value] = pair.split("=");
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    return params;
  }
  ```

- [ ] **Step 2: Build the Reset Password screen.**

  Create `apps/mobile/app/(auth)/reset-password.tsx`:
  ```typescript
  import { useEffect, useState } from "react";
  import { Text, View, Alert } from "react-native";
  import { Link, useRouter } from "expo-router";
  import * as Linking from "expo-linking";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { resetPasswordInputSchema, type ResetPasswordInput } from "@mygang/shared";

  import { supabase } from "../../lib/supabase";
  import { FormField } from "../../components/form-field";
  import { PrimaryButton } from "../../components/primary-button";
  import { parseSupabaseHashParams } from "../../lib/deep-links";

  export default function ResetPasswordScreen() {
    const router = useRouter();
    const [hasSession, setHasSession] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<ResetPasswordInput>({
      resolver: zodResolver(resetPasswordInputSchema),
      defaultValues: { password: "", confirmPassword: "" },
    });

    // On mount: read the deep-link URL, extract access_token from hash, set session.
    useEffect(() => {
      async function attachSession() {
        const initialUrl = await Linking.getInitialURL();
        const url = initialUrl ?? "";
        const params = parseSupabaseHashParams(url);
        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;

        if (!accessToken || !refreshToken) {
          Alert.alert("Invalid reset link", "Please request a new password reset email.");
          router.replace("/(auth)/forgot-password");
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          Alert.alert("Reset link expired", error.message);
          router.replace("/(auth)/forgot-password");
          return;
        }
        setHasSession(true);
      }
      attachSession();
    }, [router]);

    async function onSubmit(values: ResetPasswordInput) {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password: values.password });
      setIsSubmitting(false);

      if (error) {
        Alert.alert("Could not update password", error.message);
        return;
      }
      setDone(true);
    }

    if (done) {
      return (
        <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
          <Text className="text-2xl font-bold text-white">Password updated</Text>
          <Text className="mt-2 text-center text-zinc-400">You can sign in with your new password.</Text>
          <Link href="/(auth)/sign-in" className="mt-6 text-white underline">
            Sign In
          </Link>
        </View>
      );
    }

    if (!hasSession) {
      return (
        <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
          <Text className="text-zinc-400">Verifying reset link…</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center bg-zinc-950 px-6">
        <Text className="mb-2 text-3xl font-bold text-white">New password</Text>
        <Text className="mb-6 text-zinc-400">Pick something you'll remember.</Text>

        <FormField
          control={control}
          name="password"
          label="New password"
          secureTextEntry
          autoComplete="password-new"
          error={errors.password?.message}
        />

        <FormField
          control={control}
          name="confirmPassword"
          label="Confirm new password"
          secureTextEntry
          autoComplete="password-new"
          error={errors.confirmPassword?.message}
        />

        <PrimaryButton label="Update Password" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />
      </View>
    );
  }
  ```

- [ ] **Step 3: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 4: End-to-end test the full reset flow.**

  - Open the reset-password email from Task 1.5 on your phone.
  - Tap the link. **It should open the MyGang app**, not a browser. (If it opens a browser instead, double-check Supabase's Redirect URLs config from Task 1.1.3.)
  - You should see the New Password screen.
  - Enter a new password (twice), tap Update.
  - You should see "Password updated" success.
  - Tap "Sign In," log in with the new password. Verify it works.

- [ ] **Step 5: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): reset-password screen + deep-link handler"
  ```

---

## Task 1.7 — Profile state hook (post-auth: did the user finish onboarding?)

**Goal:** After sign-in, the route gate needs to know: has this user completed onboarding? If not, send to the onboarding flow before the chat home. This requires reading from the Supabase `profiles` table.

**Files:**
- Modify: `apps/mobile/lib/auth-context.tsx` (load profile alongside session)
- Modify: `apps/mobile/app/_layout.tsx` (gate considers `profile.onboarding_completed`)

- [ ] **Step 1: Define the Profile type the mobile app cares about.**

  In `apps/mobile/lib/auth-context.tsx`, augment the auth state to load profile data. First add an import at top:
  ```typescript
  import type { Database } from "@mygang/shared/database/types";
  type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
  ```

- [ ] **Step 2: Update AuthProvider to fetch profile after session is set.**

  Replace the body of `AuthProvider` in `apps/mobile/lib/auth-context.tsx` with:
  ```typescript
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (mounted) setProfile(data);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user.id) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);
  ```

  And update the context value:
  ```typescript
  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        refreshProfile: async () => {
          if (session?.user.id) {
            const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
            setProfile(data);
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
  ```

  And the type:
  ```typescript
  type AuthState = {
    session: Session | null;
    user: User | null;
    profile: ProfileRow | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
  };
  ```

  And the default value:
  ```typescript
  const AuthContext = createContext<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    refreshProfile: async () => {},
  });
  ```

- [ ] **Step 3: Update the route gate to consider onboarding state.**

  In `apps/mobile/app/_layout.tsx`, replace the `useEffect` inside `RouteGate` with:
  ```typescript
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session && profile && !profile.onboarding_completed) {
      // Signed in but hasn't onboarded
      if (segments.join("/") !== "(app)/onboarding") {
        router.replace("/(app)/onboarding");
      }
      return;
    }

    if (session && (inAuthGroup || segments.length === 0)) {
      router.replace("/(app)");
    }
  }, [session, profile, isLoading, segments, router]);
  ```

  Also pull `profile` from `useAuth()` at the top of `RouteGate`.

- [ ] **Step 4: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

  Note: TypeScript may complain that `(app)/onboarding` doesn't exist yet. We create it in Task 1.8.

- [ ] **Step 5: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): load profile in auth-context, gate on onboarding_completed"
  ```

---

## Task 1.8 — Build the Onboarding flow (username + gang selection)

**Goal:** A newly-signed-up user goes through a 2-step onboarding: pick a username, pick their gang (4 characters from the catalog of 14). Result is written to the `profiles` table; route gate then redirects to the home.

**Files:**
- Create: `apps/mobile/app/(app)/onboarding.tsx`
- Create: `apps/mobile/components/character-card.tsx`

- [ ] **Step 1: Build the CharacterCard component.**

  Create `apps/mobile/components/character-card.tsx`:
  ```typescript
  import { Pressable, Text, View, Image } from "react-native";
  import type { Character } from "@mygang/shared";
  import { resolveAvatarUrl } from "@mygang/shared";

  type CharacterCardProps = {
    character: Character;
    selected: boolean;
    onPress: () => void;
    siteUrl: string; // e.g. "https://mygang.ai"
  };

  export function CharacterCard({ character, selected, onPress, siteUrl }: CharacterCardProps) {
    const avatarPath = resolveAvatarUrl(character.id);
    const avatarUrl = `${siteUrl}${avatarPath}`;

    return (
      <Pressable
        onPress={onPress}
        className={`mb-3 flex-row items-center rounded-xl border-2 p-3 ${
          selected ? "border-white bg-zinc-900" : "border-zinc-800 bg-zinc-950"
        }`}
      >
        <Image source={{ uri: avatarUrl }} className="h-14 w-14 rounded-full" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-white">{character.name}</Text>
          <Text className="text-sm text-zinc-400">{character.vibe}</Text>
        </View>
        {selected ? (
          <View className="h-6 w-6 items-center justify-center rounded-full bg-white">
            <Text className="text-xs font-bold text-zinc-950">✓</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }
  ```

- [ ] **Step 2: Build the Onboarding screen.**

  Create `apps/mobile/app/(app)/onboarding.tsx`:
  ```typescript
  import { useState } from "react";
  import { Alert, FlatList, Text, View } from "react-native";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";
  import { CHARACTERS, usernameSchema } from "@mygang/shared";

  import { supabase } from "../../lib/supabase";
  import { useAuth } from "../../lib/auth-context";
  import { FormField } from "../../components/form-field";
  import { PrimaryButton } from "../../components/primary-button";
  import { CharacterCard } from "../../components/character-card";

  const SITE_URL = "https://mygang.ai"; // for avatar images
  const GANG_SIZE = 4;

  const onboardingStepOneSchema = z.object({ username: usernameSchema });
  type OnboardingStepOneInput = z.infer<typeof onboardingStepOneSchema>;

  export default function OnboardingScreen() {
    const { user, refreshProfile } = useAuth();
    const [step, setStep] = useState<"username" | "gang">("username");
    const [username, setUsername] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<OnboardingStepOneInput>({
      resolver: zodResolver(onboardingStepOneSchema),
      defaultValues: { username: "" },
    });

    function onUsernameSubmit(values: OnboardingStepOneInput) {
      setUsername(values.username);
      setStep("gang");
    }

    function toggleCharacter(id: string) {
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= GANG_SIZE) return prev;
        return [...prev, id];
      });
    }

    async function finalize() {
      if (!user) return;
      if (selected.length !== GANG_SIZE) {
        Alert.alert("Pick your gang", `Choose exactly ${GANG_SIZE} friends.`);
        return;
      }

      setIsSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          preferred_squad: selected,
          onboarding_completed: true,
        })
        .eq("id", user.id);
      setIsSubmitting(false);

      if (error) {
        Alert.alert("Could not save your gang", error.message);
        return;
      }
      await refreshProfile();
      // Route gate will redirect to (app)/index next render.
    }

    if (step === "username") {
      return (
        <View className="flex-1 justify-center bg-zinc-950 px-6">
          <Text className="mb-2 text-3xl font-bold text-white">Pick a username</Text>
          <Text className="mb-6 text-zinc-400">Your gang will know you by this.</Text>

          <FormField
            control={control}
            name="username"
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username?.message}
          />

          <PrimaryButton label="Next" onPress={handleSubmit(onUsernameSubmit)} />
        </View>
      );
    }

    return (
      <View className="flex-1 bg-zinc-950 px-6 pt-12">
        <Text className="mb-2 text-3xl font-bold text-white">Pick your gang</Text>
        <Text className="mb-4 text-zinc-400">
          Choose {GANG_SIZE}. Selected: {selected.length}/{GANG_SIZE}.
        </Text>

        <FlatList
          data={CHARACTERS}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CharacterCard
              character={item}
              selected={selected.includes(item.id)}
              onPress={() => toggleCharacter(item.id)}
              siteUrl={SITE_URL}
            />
          )}
          contentContainerClassName="pb-32"
        />

        <View className="absolute bottom-6 left-6 right-6">
          <PrimaryButton
            label={`Finish (${selected.length}/${GANG_SIZE})`}
            onPress={finalize}
            isLoading={isSubmitting}
            disabled={selected.length !== GANG_SIZE}
          />
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 3: Type-check.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 4: Test end-to-end.**

  - Sign up a fresh email → verify email → sign in.
  - Should land on Onboarding (not the home screen, because profile.onboarding_completed is false).
  - Pick a username → next.
  - Select 4 characters from the list.
  - Tap "Finish."
  - Should redirect to the home screen with your email shown.
  - Force-close + reopen the app. Should land directly on the home (onboarding completed sticks).

- [ ] **Step 5: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): onboarding flow (username + 4-character gang selection)"
  ```

---

## Task 1.9 — Polish: handle loading states + edge cases

**Goal:** Clean up rough edges. Handle the in-between states (loading, empty profile after fresh sign-up, expired sessions).

**Files:**
- Modify: `apps/mobile/app/_layout.tsx` (loading splash)
- Create: `apps/mobile/components/loading-screen.tsx`

- [ ] **Step 1: Build a loading screen component.**

  Create `apps/mobile/components/loading-screen.tsx`:
  ```typescript
  import { ActivityIndicator, Text, View } from "react-native";

  export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator color="#ffffff" />
        <Text className="mt-3 text-sm text-zinc-400">{label}</Text>
      </View>
    );
  }
  ```

- [ ] **Step 2: Show LoadingScreen while auth state initializes.**

  In `apps/mobile/app/_layout.tsx`, update `RouteGate` to render `<LoadingScreen />` when `isLoading` is true. The Stack should only render once we know the user's status.

  ```typescript
  function RouteGate() {
    const { session, profile, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
      // ... existing redirect logic ...
    }, [session, profile, isLoading, segments, router]);

    if (isLoading) {
      return <LoadingScreen label="Waking up the gang…" />;
    }

    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    );
  }
  ```

- [ ] **Step 3: Handle the "signed in but no profile row yet" case.**

  Right after sign-up, the user is signed in but the `profiles` row may not exist yet (depends on Supabase trigger behavior). The route gate should treat "signed in + null profile" the same as "signed in + onboarding_completed: false" — send to onboarding.

  Verify this by reading the existing logic in apps/web/src/lib/supabase to see how the web app handles first-login. If the web has a Postgres trigger that auto-creates a profile row, then null profile shouldn't happen. Otherwise, our gate already handles it.

- [ ] **Step 4: Final type-check + run.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  cd apps/mobile && pnpm exec expo start --clear
  ```

  Sign up, sign in, sign out, force-close, reopen. Each transition should feel smooth (loading splash, no flicker between screens).

- [ ] **Step 5: Commit.**

  ```bash
  git add -A
  git commit -m "feat(mobile): loading screen + smooth auth state transitions"
  ```

---

## Task 1.10 — Phase 1 exit verification

**Files:** none (verification only).

- [ ] **Step 1: Web app at https://mygang.ai still works.**

  ```bash
  pnpm --filter=@mygang/web build
  pnpm --filter=@mygang/web test:fast
  ```

  Build clean. Tests = 52 pass / 2 fail (chat-arrival baseline).

- [ ] **Step 2: Mobile app passes typecheck.**

  ```bash
  pnpm --filter=@mygang/mobile typecheck
  ```

- [ ] **Step 3: Manual test on real Android phone — happy path.**

  - [ ] Cold start → land on Sign In screen
  - [ ] Tap "Sign up" → fill out form → submit → see "Check your email"
  - [ ] Receive Supabase verification email → tap link → verifies
  - [ ] Return to app, sign in with email/password
  - [ ] Land on onboarding → pick username → pick gang of 4 → Finish
  - [ ] Land on home screen showing your email
  - [ ] Force-close app → reopen → still on home screen (session persists)
  - [ ] Tap Sign Out → back on Sign In screen

- [ ] **Step 4: Manual test — password reset flow.**

  - [ ] From Sign In, tap "Forgot password?"
  - [ ] Enter email → send reset link → see "Check your email"
  - [ ] Receive Supabase password reset email → tap link
  - [ ] Link opens MyGang app (NOT browser) → land on Reset Password screen
  - [ ] Enter new password (twice) → submit → see "Password updated"
  - [ ] Tap "Sign In" → log in with new password → success

- [ ] **Step 5: Manual test — error paths.**

  - [ ] Try to sign in with wrong password → see error toast
  - [ ] Try to sign up with already-used email → see Supabase error
  - [ ] Try to submit forms with empty fields → Zod errors show
  - [ ] Try a too-short password on sign-up → Zod error shows

- [ ] **Step 6: Update the master plan's Phase index.**

  Open `docs/superpowers/plans/2026-04-29-mobile-app-plan.md`. Update the row for Phase 1: status changes from "Plan to be written when Phase 0 completes" to "✅ Done — see <this file>".

- [ ] **Step 7: Write Phase 1 completion to a session log.**

  Create `docs/superpowers/sessions/<today's-date>-session-NN.md` with the standard template (per AGENTS.md §5).

- [ ] **Step 8: Optional — write Phase 1.5 plan (Google OAuth).**

  Use the writing-plans skill (or follow the manual workflow). Save to `docs/superpowers/plans/<today's-date>-mobile-app-phase-1.5-google-oauth.md`. Outline only required: needs Android OAuth client ID (gated on EAS Build setup) + `expo-auth-session/providers/google` + `supabase.auth.signInWithIdToken({ provider: 'google', token })`.

- [ ] **Step 9: Optional — write Phase 2 plan (chat).**

  This is the next major feature phase. Significantly larger than Phase 1. Use the writing-plans skill.

---

## Self-review (writing-plans skill required)

Performed 2026-04-29 by Claude Opus 4.7:

**1. Spec coverage:** Each Phase 1 outline item from the master plan maps to a task here.
- Master plan §Phase 1 outline item "Configure Expo deep linking + Supabase Auth redirect URLs" → Task 1.1 ✓
- "Build sign-up, sign-in, forgot-password, reset-password, post-auth onboarding screens" → Tasks 1.3, 1.4, 1.5, 1.6, 1.8 ✓
- "Wire Google OAuth via expo-auth-session" → moved to Phase 1.5 (deferred until EAS Build is set up; Task 1.10 step 8 prompts writing that plan) ✓
- "Set up Expo Router file tree mirroring web's main routes" → Task 1.2 ✓
- "Confirm session persistence across app restarts" → Task 1.4 step 4, Task 1.10 step 3 ✓
- "Confirm deep links from password-reset email open the app correctly" → Task 1.6 step 4, Task 1.10 step 4 ✓

**2. Placeholder scan:** No `TBD`/`TODO`/`FIXME`/`XXX` literals (confirmed via grep). Every step has explicit code, command, or user action.

**3. Type consistency:** Naming consistent across tasks — `signInInputSchema`, `SignInInput`, `signUpInputSchema`, `SignUpInput`, `forgotPasswordInputSchema`, `ForgotPasswordInput`, `resetPasswordInputSchema`, `ResetPasswordInput`, `usernameSchema`. `Profile` row type imported from `@mygang/shared/database/types`. `Character` from `@mygang/shared`. NativeWind classes consistent (zinc-950 backgrounds, white headers, zinc-400 secondaries).

**4. Known fragilities:**
- Avatar URLs in onboarding hard-code `SITE_URL = "https://mygang.ai"`. This is fine for production but won't work for local dev against a localhost web server — flag for future config-via-env if/when local dev becomes painful.
- The Supabase password-reset flow uses URL hash fragments (`#access_token=...`) which is Supabase's current convention. If Supabase changes that to query params in a future SDK upgrade, Task 1.6's `parseSupabaseHashParams` helper will need to handle both.
- The route gate uses `segments[0] === "(auth)"` which works with Expo Router 6's segment exposure. If that representation changes, the gate logic needs updating.

---

## Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-29 | Initial Phase 1 plan created. Email/password auth path detailed. Google OAuth deferred to Phase 1.5 (gated on EAS Build setup). | Claude Opus 4.7 |
