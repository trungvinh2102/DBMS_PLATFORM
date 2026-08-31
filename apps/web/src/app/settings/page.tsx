/**
 * @file page.tsx
 * @description Settings page root wrapper providing SettingsActionsProvider and rendering SettingsContent.
 */

import { SettingsActionsProvider } from "./context/SettingsActionsContext";
import { SettingsContent } from "./components/SettingsContent";

export default function SettingsPage() {
  return (
    <SettingsActionsProvider>
      <SettingsContent />
    </SettingsActionsProvider>
  );
}
