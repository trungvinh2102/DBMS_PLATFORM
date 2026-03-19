/**
 * @file DataSettings.tsx
 * @description Main data settings component that orchestrates performance, formatting, and export sub-components.
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { QueryPerformanceCard } from "./data-settings/QueryPerformanceCard";
import { DisplayFormattingCard } from "./data-settings/DisplayFormattingCard";
import { ExportGovernanceCard } from "./data-settings/ExportGovernanceCard";

export function DataSettings({ settings, updateData }: any) {
  // Sample data for preview calculations
  const sampleNow = new Date();
  
  const getFormattedDate = (pattern: string) => {
    try {
      // Handle legacy YYYY/DD patterns for date-fns compatibility
      const sanitizedPattern = pattern.replace(/YYYY/g, "yyyy").replace(/DD/g, "dd");
      return format(sampleNow, sanitizedPattern);
    } catch {
      return "Invalid Format";
    }
  };

  return (
    <TooltipProvider delay={200}>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
          <QueryPerformanceCard 
            settings={settings} 
            updateData={updateData} 
          />
          
          <DisplayFormattingCard 
            settings={settings} 
            updateData={updateData} 
            getFormattedDate={getFormattedDate}
          />
          
          <ExportGovernanceCard 
            settings={settings} 
            updateData={updateData} 
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
