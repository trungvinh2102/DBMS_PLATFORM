/**
 * @file SQLLabContext.tsx
 * @description Context to share SQLLab state across components and reduce prop drilling.
 */

import React, { createContext, useContext, ReactNode } from "react";
import { useSQLLab } from "../hooks/useSQLLab";

type SQLLabContextType = ReturnType<typeof useSQLLab>;

const SQLLabContext = createContext<SQLLabContextType | null>(null);

export function SQLLabProvider({ children }: { children: ReactNode }) {
  const value = useSQLLab();
  return (
    <SQLLabContext.Provider value={value}>
      {children}
    </SQLLabContext.Provider>
  );
}

export function useSQLLabContext() {
  const context = useContext(SQLLabContext);
  if (!context) {
    throw new Error("useSQLLabContext must be used within a SQLLabProvider");
  }
  return context;
}
