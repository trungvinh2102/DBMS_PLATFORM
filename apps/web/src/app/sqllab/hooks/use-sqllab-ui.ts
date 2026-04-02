/**
 * @file use-sqllab-ui.ts
 * @description Hook to manage UI-only states for SQLLab (panels, modes, positions).
 */

import { useState, useCallback } from "react";
import type { RightPanelMode, ResultTab, CursorPosition } from "../types";

export function useSQLLabUI() {
  const [activeRightTab, setActiveRightTab] = useState<string>("info");
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>("results");
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("object");
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [showAISidebar, setShowAISidebar] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [dataOffset, setDataOffset] = useState<number>(0);
  
  const [cursorPos, setCursorPos] = useState<CursorPosition>({ lineNumber: 1, column: 1 });
  const [tabSize, setTabSize] = useState<number>(4);
  const [undoTrigger, setUndoTrigger] = useState<number>(0);
  const [redoTrigger, setRedoTrigger] = useState<number>(0);

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState<boolean>(false);
  const [fixSQLError, setFixSQLError] = useState<string | null>(null);

  const toggleRightPanel = useCallback(() => setShowRightPanel(prev => !prev), []);
  const toggleAISidebar = useCallback(() => setShowAISidebar(prev => !prev), []);
  
  const triggerUndo = useCallback(() => setUndoTrigger(v => v + 1), []);
  const triggerRedo = useCallback(() => setRedoTrigger(v => v + 1), []);

  return {
    // Panel States
    activeRightTab,
    setActiveRightTab,
    activeResultTab,
    setActiveResultTab,
    rightPanelMode,
    setRightPanelMode,
    showRightPanel,
    setShowRightPanel,
    toggleRightPanel,
    showAISidebar,
    setShowAISidebar,
    toggleAISidebar,
    selectedTable,
    setSelectedTable,
    dataOffset,
    setDataOffset,

    // Editor States
    cursorPos,
    setCursorPos,
    tabSize,
    setTabSize,
    undoTrigger,
    redoTrigger,
    triggerUndo,
    triggerRedo,

    // Dialog States
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    isOpenDialogOpen,
    setIsOpenDialogOpen,
    fixSQLError,
    setFixSQLError,
  };
}
