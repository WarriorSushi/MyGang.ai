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
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="mb-2 text-3xl font-bold text-foreground">Welcome back</Text>
      <Text className="mb-6 text-muted-foreground">Your gang's been waiting.</Text>

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

      <PrimaryButton
        label="Sign In"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
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
    </View>
  );
}
