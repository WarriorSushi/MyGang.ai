import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react-native";
import { signInInputSchema, type SignInInput } from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { signInWithGoogle } from "../../lib/google-oauth";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { GradientText } from "../../components/gradient-text";
import { GlassCard } from "../../components/glass-card";
import { EyebrowPill } from "../../components/eyebrow-pill";
import { AuthScreenFrame } from "../../components/auth-screen-frame";

export default function SignInScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInInputSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    if (isSubmitting || isGoogleSubmitting) return;
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

  async function onGooglePress() {
    if (isSubmitting || isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    const result = await signInWithGoogle();
    setIsGoogleSubmitting(false);
    if (!result.ok) {
      Alert.alert("Google sign-in failed", result.error ?? "Please try again.");
    }
  }

  return (
    <AuthScreenFrame>
      <GlassCard>
        <EyebrowPill label="WELCOME BACK" tint="teal" />
        <GradientText textClassName="mt-3 text-3xl font-bold tracking-tight">
          Welcome back
        </GradientText>
        <Text className="mb-6 mt-1 text-muted-foreground">
          {"Your gang's been waiting."}
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
            disabled={isGoogleSubmitting}
            variant="gradient"
            upperCase
            iconRight={ArrowRight}
            size="lg"
          />
        </View>

        <View className="my-4 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            or
          </Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <PrimaryButton
          label="Continue with Google"
          onPress={onGooglePress}
          isLoading={isGoogleSubmitting}
          disabled={isSubmitting || isGoogleSubmitting}
          variant="solid"
          size="lg"
        />

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
    </AuthScreenFrame>
  );
}
