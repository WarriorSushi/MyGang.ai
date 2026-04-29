import { StyleSheet, Text, View } from "react-native";
import type { TokenUsage } from "@mygang/shared";

const placeholderTokenUsage: TokenUsage = {
  promptChars: 0,
  responseChars: 0,
  historyCount: 0,
  provider: "none",
};

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyGang</Text>
      <Text style={styles.subtitle}>Hello from the gang.</Text>
      <Text style={styles.debug}>shared:{placeholderTokenUsage.provider}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09090b",
    padding: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: "#a1a1aa",
    marginTop: 8,
    fontSize: 16,
  },
  debug: {
    color: "#52525b",
    marginTop: 24,
    fontSize: 12,
  },
});
