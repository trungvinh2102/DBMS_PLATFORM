/**
 * @file SettingsActionsContext.tsx
 * @description Provides a way for settings sub-components to register their save and reset actions
 * with the global buttons in the Settings page.
 */

import React, { createContext, useContext, useCallback, useRef } from "react";

interface SettingsActions {
  onSave?: () => Promise<void> | void;
  onReset?: () => void;
}

interface SettingsActionsContextType {
  registerActions: (tab: string, actions: SettingsActions) => void;
  triggerSave: (tab: string) => Promise<void>;
  triggerReset: (tab: string) => void;
}

const SettingsActionsContext = createContext<SettingsActionsContextType | undefined>(undefined);

export function SettingsActionsProvider({ children }: { children: React.ReactNode }) {
  const actionsMap = useRef<Record<string, SettingsActions>>({});

  const registerActions = useCallback((tab: string, actions: SettingsActions) => {
    actionsMap.current[tab] = actions;
  }, []);

  const triggerSave = useCallback(async (tab: string) => {
    const actions = actionsMap.current[tab];
    if (actions?.onSave) {
      await actions.onSave();
    }
  }, []);

  const triggerReset = useCallback((tab: string) => {
    const actions = actionsMap.current[tab];
    if (actions?.onReset) {
      actions.onReset();
    }
  }, []);

  return (
    <SettingsActionsContext.Provider value={{ registerActions, triggerSave, triggerReset }}>
      {children}
    </SettingsActionsContext.Provider>
  );
}

export function useSettingsActions() {
  const context = useContext(SettingsActionsContext);
  if (!context) {
    throw new Error("useSettingsActions must be used within a SettingsActionsProvider");
  }
  return context;
}
