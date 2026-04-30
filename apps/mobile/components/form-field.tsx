import { Text, TextInput, View, type TextInputProps } from "react-native";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";

type FormFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  error?: string;
  hint?: string;
} & Omit<TextInputProps, "value" | "onChangeText" | "onBlur">;

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  hint,
  ...textInputProps
}: FormFieldProps<T>) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </Text>
      ) : null}
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            {...textInputProps}
            value={(value as string) ?? ""}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor="#6b6f7a"
            className="rounded-2xl border border-border bg-muted/40 px-5 py-4 text-base text-foreground"
          />
        )}
      />
      {error ? (
        <Text className="mt-1.5 px-1 text-xs text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 px-1 text-[10px] text-muted-foreground/60">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
