/**
 * @file utils.ts
 * @description Utility functions for logic and styling, including Tailwind CSS class merging.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
