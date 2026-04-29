import { Redirect } from "expo-router";

// Onboarded users go straight to chat. The route gate handles the
// not-yet-onboarded case before this screen renders.
export default function AppIndex() {
  return <Redirect href="/(app)/chat" />;
}
