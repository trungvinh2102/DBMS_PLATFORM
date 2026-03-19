/**
 * @file EditorSettings.tsx
 * @description Main editor settings component that orchestrates appearance, behavior, and preview sub-components.
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorAppearanceCard } from "./editor-settings/EditorAppearanceCard";
import { BehaviorsAutomationCard } from "./editor-settings/BehaviorsAutomationCard";
import { EditorPreviewBox } from "./editor-settings/EditorPreviewBox";

export function EditorSettings({ settings, updateEditor }: any) {
  return (
    <TooltipProvider delay={200}>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
          <EditorAppearanceCard 
            settings={settings} 
            updateEditor={updateEditor} 
          />
          
          <BehaviorsAutomationCard 
            settings={settings} 
            updateEditor={updateEditor} 
          />
          
          <EditorPreviewBox settings={settings} />
        </div>
      </div>
    </TooltipProvider>
  );
}
