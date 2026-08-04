import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MailCheck } from "lucide-react-native";
import { signUpInputSchema, type SignUpInput } from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { signInWithGoogle } from "../../lib/google-oauth";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { GradientText } from "../../components/gradient-text";
import { GlassCard } from "../../components/glass-card";
import { EyebrowPill } from "../../components/eyebrow-pill";
import { AuthScreenFrame } from "../../components/auth-screen-frame";

export default function SignUpScreen() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpInputSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    if (isSubmitting || isGoogleSubmitting) return;
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

    // Supabase silently no-ops a sign-up for an existing confirmed email,
    // returning a user object with empty `identities`. Without this check
    // the user would see "Check your email" and wait forever for nothing.
    if (data?.user && (data.user.identities?.length ?? 0) === 0) {
      Alert.alert(
        "Account exists",
        "That email is already registered. Try signing in instead.",
      );
      return;
    }

    setSubmitted(true);
  }

  async function onGooglePress() {
    if (isSubmitting || isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    const result = await signInWithGoogle();
    setIsGoogleSubmitting(false);
    if (!result.ok && !result.cancelled) {
      Alert.alert("Google sign-in failed", result.error ?? "Please try again.");
    }
  }

  if (submitted) {
    return (
      <AuthScreenFrame contentClassName="flex-grow justify-center px-5 py-8">
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
      </AuthScreenFrame>
    );
  }

  return (
    <AuthScreenFrame>
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

        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted-foreground">Already have an account? </Text>
          <Link href="/(auth)/sign-in" className="text-foreground underline">
            Sign in
          </Link>
        </View>
      </GlassCard>
    </AuthScreenFrame>
  );
}
