import { useEffect, useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordInputSchema,
  type ResetPasswordInput,
} from "@mygang/shared";

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
    let mounted = true;

    async function attachSession() {
      const initialUrl = await Linking.getInitialURL();
      const url = initialUrl ?? "";
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

    attachSession();

    return () => {
      mounted = false;
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
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-2xl font-bold text-foreground">Password updated</Text>
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
    );
  }

  if (!hasSession) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-muted-foreground">Verifying reset link…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="mb-2 text-3xl font-bold text-foreground">New password</Text>
      <Text className="mb-6 text-muted-foreground">Pick something you'll remember.</Text>

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

      <PrimaryButton
        label="Update Password"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
      />
    </View>
  );
}
