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
import "./ErrorPanel.css";

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

  const getSeverityClass = (severity: MarkerSeverity) => {
    switch (severity) {
      case MarkerSeverity.Error:
        return "severity-error";
      case MarkerSeverity.Warning:
        return "severity-warning";
      case MarkerSeverity.Info:
        return "severity-info";
      case MarkerSeverity.Hint:
        return "severity-hint";
      default:
        return "severity-error";
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="error-panel">
      {/* Header */}
      <div className="error-panel-header">
        <span className="title">{title}</span>
        <span className="count">
          {errors.length === 0
            ? "No problems"
            : `${errors.length} problem${errors.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Error List */}
      <div className="error-list" style={{ maxHeight }}>
        {errors.length === 0 ? (
          <div className="empty-state">
            <span className="check-icon">✓</span>
            No syntax errors detected
          </div>
        ) : (
          errors.map((error) => (
            <div
              key={error.id}
              className={`error-item ${getSeverityClass(error.severity)}`}
              onClick={() => onErrorClick?.(error.line, error.column)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onErrorClick?.(error.line, error.column);
                }
              }}
            >
              <span className="severity-icon">
                {getSeverityIcon(error.severity)}
              </span>
              <span className="location">
                [{error.line}:{error.column}]
              </span>
              <span className="message">{error.message}</span>
              <span className="severity-label">{error.severityLabel}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorPanel;
