import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Text, type TextProps, type StyleProp, type TextStyle } from "react-native";

type GradientTextProps = TextProps & {
  /** Multi-stop gradient. Defaults to brand teal → soft slate → magenta. */
  colors?: readonly [string, string, ...string[]];
  textClassName?: string;
  textStyle?: StyleProp<TextStyle>;
};

export function GradientText({
  children,
  colors = ["#3eddc0", "#cbd5e1", "#d56db5"],
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
        colors={colors as unknown as readonly [string, string, ...string[]]}
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
