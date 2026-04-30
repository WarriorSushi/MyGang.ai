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
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-2xl font-bold text-foreground">Check your email</Text>
        <Text className="mt-2 text-center text-muted-foreground">
          We sent a verification link. Tap it to finish creating your account.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="mb-2 text-3xl font-bold text-foreground">Create account</Text>
      <Text className="mb-6 text-muted-foreground">Join the gang.</Text>

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

      <PrimaryButton
        label="Sign Up"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
      />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-muted-foreground">Already have an account? </Text>
        <Link href="/(auth)/sign-in" className="text-foreground underline">
          Sign in
        </Link>
      </View>
    </View>
  );
}
