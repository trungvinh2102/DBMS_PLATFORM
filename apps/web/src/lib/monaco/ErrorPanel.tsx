/**
 * @file ErrorPanel.tsx
 * @description Error panel component for displaying validation errors below the Monaco Editor.
 * Shows line number, column, severity, and message for each error.
 *
 * ## Features:
 * - Clickable errors to navigate to error location
 * - Severity icons (error, warning, info, hint)
 * - Scrollable for many errors
 * - Dark/light theme support
 * - Empty state when no errors
 */

import type { ErrorPanelEntry } from "./types";
import { MarkerSeverity } from "./types";

// ============================================================================
// TYPES
// ============================================================================

interface ErrorPanelProps {
  /** Array of errors to display */
  errors: ErrorPanelEntry[];
  /** Callback when user clicks an error */
  onErrorClick?: (line: number, column: number) => void;
  /** Maximum height of the panel */
  maxHeight?: number;
  /** Optional title */
  title?: string;
}

// ============================================================================
// ICONS
// ============================================================================

const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM7.25 4v5h1.5V4h-1.5zM8 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1.5L14.5 13h-13L8 1.5zm0-1.5L.5 14h15L8 0zM7.25 5v4h1.5V5h-1.5zM8 10.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM7.25 7v5h1.5V7h-1.5zM8 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
  </svg>
);

const HintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm-.75 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5zM8 10.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
);

// ============================================================================
// STYLES
// ============================================================================

/** Static Tailwind class mapping per severity (replaces the former CSS file). */
const SEVERITY_STYLES: Record<MarkerSeverity, { icon: string; label: string }> = {
  [MarkerSeverity.Error]: { icon: "text-red-400", label: "bg-red-500/20 text-red-400" },
  [MarkerSeverity.Warning]: {
    icon: "text-amber-400",
    label: "bg-amber-500/20 text-amber-400",
  },
  [MarkerSeverity.Info]: { icon: "text-blue-400", label: "bg-blue-500/20 text-blue-400" },
  [MarkerSeverity.Hint]: {
    icon: "text-violet-400",
    label: "bg-violet-500/20 text-violet-400",
  },
};

const getSeverityStyles = (severity: MarkerSeverity) =>
  SEVERITY_STYLES[severity] ?? SEVERITY_STYLES[MarkerSeverity.Error];

// ============================================================================
// COMPONENT
// ============================================================================

export function ErrorPanel({
  errors,
  onErrorClick,
  maxHeight = 150,
  title = "Problems",
}: ErrorPanelProps) {
  // ============================================================================
  // HELPERS
  // ============================================================================

  const getSeverityIcon = (severity: MarkerSeverity) => {
    switch (severity) {
      case MarkerSeverity.Error:
        return <ErrorIcon />;
      case MarkerSeverity.Warning:
        return <WarningIcon />;
      case MarkerSeverity.Info:
        return <InfoIcon />;
      case MarkerSeverity.Hint:
        return <HintIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="border-t border-border bg-muted text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-1.5">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-[11px] text-[#888]">
          {errors.length === 0
            ? "No problems"
            : `${errors.length} problem${errors.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Error List */}
      <div className="overflow-y-auto py-1" style={{ maxHeight }}>
        {errors.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-5 text-gray-500">
            <span className="text-base text-green-500">✓</span>
            No syntax errors detected
          </div>
        ) : (
          errors.map((error) => {
            const severityStyles = getSeverityStyles(error.severity);
            return (
              <div
                key={error.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 transition-colors duration-150 hover:bg-white/[0.05] focus:bg-white/[0.08] focus:outline-none"
                onClick={() => onErrorClick?.(error.line, error.column)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onErrorClick?.(error.line, error.column);
                  }
                }}
              >
                <span className={`flex shrink-0 items-center ${severityStyles.icon}`}>
                  {getSeverityIcon(error.severity)}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-gray-500">
                  [{error.line}:{error.column}]
                </span>
                <span className="flex-1 truncate text-foreground">{error.message}</span>
                <span
                  className={`shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-semibold uppercase ${severityStyles.label}`}
                >
                  {error.severityLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorPanel;
