import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordInputSchema,
  type ForgotPasswordInput,
} from "@mygang/shared";

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
        <Link
          href="/(auth)/sign-in"
          className="mt-6 text-white underline"
        >
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

      <PrimaryButton
        label="Send Reset Link"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
      />

      <Link
        href="/(auth)/sign-in"
        className="mt-6 self-center text-sm text-zinc-400 underline"
      >
        Back to Sign In
      </Link>
    </View>
  );
}
