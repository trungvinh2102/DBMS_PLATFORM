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

"use client";

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

      {/* Styles */}
      <style jsx>{`
        .error-panel {
          border-top: 1px solid var(--border, #333);
          background: var(--muted, #0a0a0a);
          font-size: 12px;
        }

        .error-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: var(--muted, #111);
          border-bottom: 1px solid var(--border, #222);
        }

        .title {
          font-weight: 600;
          color: var(--foreground, #ccc);
        }

        .count {
          color: #888;
          font-size: 11px;
        }

        .error-list {
          overflow-y: auto;
          padding: 4px 0;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          color: #6b7280;
        }

        .check-icon {
          color: #22c55e;
          font-size: 16px;
        }

        .error-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .error-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .error-item:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
        }

        .severity-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .severity-error .severity-icon {
          color: #f87171;
        }

        .severity-warning .severity-icon {
          color: #fbbf24;
        }

        .severity-info .severity-icon {
          color: #60a5fa;
        }

        .severity-hint .severity-icon {
          color: #a78bfa;
        }

        .location {
          color: #6b7280;
          font-family: monospace;
          font-size: 11px;
          flex-shrink: 0;
        }

        .message {
          flex: 1;
          color: var(--foreground, #ccc);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .severity-label {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          font-weight: 600;
          flex-shrink: 0;
        }

        .severity-error .severity-label {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .severity-warning .severity-label {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        .severity-info .severity-label {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .severity-hint .severity-label {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorPanel;
