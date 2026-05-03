import { Redirect } from "expo-router";

// Delete-account is now inline inside the Settings page Danger Zone.
// This route stays as a redirect for any old links / deep links pointing here.
export default function DeleteAccountRedirect() {
  return <Redirect href="/(app)/settings" />;
}
