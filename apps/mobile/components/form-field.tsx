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
            value={(value as string) ?? ""}
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
