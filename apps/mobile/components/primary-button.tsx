import { ActivityIndicator, Pressable, Text } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const inactive = disabled || isLoading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${
        inactive ? "bg-zinc-700" : "bg-white active:bg-zinc-200"
      }`}
    >
      {isLoading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <Text
          className={`text-base font-semibold ${
            inactive ? "text-zinc-400" : "text-zinc-950"
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
