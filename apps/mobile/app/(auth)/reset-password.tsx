import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react-native";
import {
  resetPasswordInputSchema,
  type ResetPasswordInput,
} from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { GlassCard } from "../../components/glass-card";
import { EyebrowPill } from "../../components/eyebrow-pill";
import { parseSupabaseHashParams } from "../../lib/deep-links";
import { AuthScreenFrame } from "../../components/auth-screen-frame";

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
    let mounted = true;

    async function attachSession(url: string) {
      const params = parseSupabaseHashParams(url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (!accessToken || !refreshToken) {
        if (!mounted) return;
        Alert.alert(
          "Invalid reset link",
          "Please request a new password reset email."
        );
        router.replace("/(auth)/forgot-password");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!mounted) return;

      if (error) {
        Alert.alert("Reset link expired", error.message);
        router.replace("/(auth)/forgot-password");
        return;
      }
      setHasSession(true);
    }

    Linking.getInitialURL().then((url) => {
      if (!mounted) return;
      void attachSession(url ?? "");
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      void attachSession(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [router]);

  async function onSubmit(values: ResetPasswordInput) {
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert("Could not update password", error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthScreenFrame contentClassName="flex-grow justify-center px-5 py-8">
        <GlassCard>
          <View className="items-center">
            <View
              style={{ backgroundColor: "rgba(16,185,129,0.15)" }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-full"
            >
              <CheckCircle2 size={28} color="#34d399" strokeWidth={2.2} />
            </View>
            <EyebrowPill label="ALL DONE" tint="teal" />
            <Text className="mt-3 text-center text-2xl font-bold text-foreground">
              Password updated
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              You can sign in with your new password.
            </Text>
            <Link
              href="/(auth)/sign-in"
              className="mt-6 text-foreground underline"
            >
              Sign In
            </Link>
          </View>
        </GlassCard>
      </AuthScreenFrame>
    );
  }

  if (!hasSession) {
    return (
      <AuthScreenFrame contentClassName="flex-grow justify-center px-5 py-8">
        <GlassCard>
          <View className="items-center">
            <View
              style={{ backgroundColor: "rgba(125,211,252,0.15)" }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-full"
            >
              <ActivityIndicator color="#7dd3fc" />
            </View>
            <EyebrowPill label="VERIFYING" tint="sky" />
            <Text className="mt-3 text-center text-2xl font-bold text-foreground">
              Hold tight
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              Verifying your reset link…
            </Text>
          </View>
        </GlassCard>
      </AuthScreenFrame>
    );
  }

  return (
    <AuthScreenFrame>
      <GlassCard>
        <EyebrowPill label="NEW PASSWORD" tint="teal" icon={LockKeyhole} />
        <Text className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          New password
        </Text>
        <Text className="mb-6 mt-1 text-muted-foreground">
          {"Pick something you'll remember."}
        </Text>

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

        <View className="mt-2">
          <PrimaryButton
            label="Update Password"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            variant="gradient"
            upperCase
            iconRight={ArrowRight}
            size="lg"
          />
        </View>
      </GlassCard>
    </AuthScreenFrame>
  );
}
