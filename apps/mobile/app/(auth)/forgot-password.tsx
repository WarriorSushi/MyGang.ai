import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound, MailCheck } from "lucide-react-native";
import {
  forgotPasswordInputSchema,
  type ForgotPasswordInput,
} from "@mygang/shared";

import { supabase } from "../../lib/supabase";
import { FormField } from "../../components/form-field";
import { PrimaryButton } from "../../components/primary-button";
import { GlassCard } from "../../components/glass-card";
import { EyebrowPill } from "../../components/eyebrow-pill";
import { SITE_URL } from "../../lib/config";
import { AuthScreenFrame } from "../../components/auth-screen-frame";

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
      // The web landing page safely relays Supabase's recovery hash into the
      // installed app, avoiding a custom-scheme allowlist dependency.
      redirectTo: SITE_URL,
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
      <AuthScreenFrame contentClassName="flex-grow justify-center px-5 py-8">
        <GlassCard>
          <View className="items-center">
            <View
              style={{ backgroundColor: "rgba(125,211,252,0.15)" }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-full"
            >
              <MailCheck size={28} color="#7dd3fc" strokeWidth={2.2} />
            </View>
            <EyebrowPill label="CHECK YOUR EMAIL" tint="sky" />
            <Text className="mt-3 text-center text-2xl font-bold text-foreground">
              Reset link sent
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              We sent a password reset link. Tap it to set a new password.
            </Text>
            <Link
              href="/(auth)/sign-in"
              className="mt-6 text-foreground underline"
            >
              Back to Sign In
            </Link>
          </View>
        </GlassCard>
      </AuthScreenFrame>
    );
  }

  return (
    <AuthScreenFrame>
      <GlassCard>
        <EyebrowPill label="PASSWORD RECOVERY" tint="sky" icon={KeyRound} />
        <Text className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          Reset your password
        </Text>
        <Text className="mb-6 mt-1 text-muted-foreground">
          {"Enter the email tied to your MyGang account and we'll send you a secure link."}
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

        <View className="mt-2">
          <PrimaryButton
            label="Send Reset Link"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            variant="gradient"
            upperCase
            iconRight={ArrowRight}
            size="lg"
          />
        </View>

        <Text className="mt-4 text-xs text-muted-foreground/70">
          If you usually sign in with Google, you may not have a password yet. In
          that case, go back and keep using Google sign-in.
        </Text>

        <Link
          href="/(auth)/sign-in"
          className="mt-6 self-center text-sm text-muted-foreground underline"
        >
          Back to Sign In
        </Link>
      </GlassCard>
    </AuthScreenFrame>
  );
}
