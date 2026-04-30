import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Text, type TextProps, type StyleProp, type TextStyle } from "react-native";

type GradientTextProps = TextProps & {
  /** Two-color gradient. Defaults to brand teal → magenta. */
  colors?: [string, string];
  textClassName?: string;
  textStyle?: StyleProp<TextStyle>;
};

export function GradientText({
  children,
  colors = ["#3eddc0", "#d56db5"],
  textClassName,
  textStyle,
  ...textProps
}: GradientTextProps) {
  return (
    <MaskedView
      maskElement={
        <Text
          {...textProps}
          className={textClassName}
          style={[textStyle, { backgroundColor: "transparent" }]}
        >
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text
          {...textProps}
          className={textClassName}
          style={[textStyle, { opacity: 0 }]}
        >
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
