"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native-based premium slider for maximum compatibility.
 * Replaces complex library components with highly-compatible HTML range inputs
 * while maintaining the premium styling.
 */
const Slider = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
    onValueChange?: (value: number[]) => void;
    value?: number | number[];
  }
>(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
  const numericValue = Array.isArray(value) ? value[0] : (value || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onValueChange?.([val]);
  };

  const progressPercent = ((numericValue - Number(min)) / (Number(max) - Number(min))) * 100;

  return (
    <div className={cn("relative w-full flex items-center py-4 group/slider", className)}>
      {/* Background Track */}
      <div className="absolute h-1.5 w-full bg-primary/20 rounded-full group-hover/slider:bg-primary/25 transition-colors" />
      
      {/* Active Indicator (Progress) */}
      <div 
        className="absolute h-1.5 bg-primary rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(var(--primary),0.3)]"
        style={{ width: `${progressPercent}%` }}
      />

      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={handleChange}
        className={cn(
          "relative w-full h-1.5 bg-transparent appearance-none cursor-pointer z-10",
          "focus:outline-none",
          // Webkit thumb styling
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary",
          "[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all",
          "[&::-webkit-slider-thumb]:active:scale-95 [&::-webkit-slider-thumb]:hover:scale-110",
          // Moz thumb styling  
          "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-lg",
          "[&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:active:scale-95",
          "[&::-moz-range-thumb]:border-none" // Fix for some moz versions
        )}
        {...props}
      />
    </div>
  );
});

Slider.displayName = "Slider";

export { Slider };
