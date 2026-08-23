/**
 * @file app/dev/error-panel-fixture/page.tsx
 * @description Development-only visual fixture for ErrorPanel. Renders a
 * populated panel (Error/Warning/Info/Hint at maxHeight 90) and an empty
 * panel with static, deterministic data. Excluded from production builds;
 * reachable only via the /__test/error-panel URL served by the Vite
 * development-server-only middleware registered in vite.config.ts
 * (command === 'serve'), which mounts this page through entry.tsx.
 */
import ErrorPanel from "@/lib/monaco/ErrorPanel";
import { MarkerSeverity, type ErrorPanelEntry } from "@/lib/monaco/types";

const FIXTURE_ERRORS: ErrorPanelEntry[] = [
  {
    id: "fixture-error",
    line: 3,
    column: 7,
    endLine: 3,
    endColumn: 12,
    message: "Unexpected token near 'FROM'",
    severity: MarkerSeverity.Error,
    severityLabel: "Error",
  },
  {
    id: "fixture-warning",
    line: 10,
    column: 1,
    endLine: 10,
    endColumn: 18,
    message: "SELECT * used without a WHERE clause",
    severity: MarkerSeverity.Warning,
    severityLabel: "Warning",
  },
  {
    id: "fixture-info",
    line: 14,
    column: 5,
    endLine: 14,
    endColumn: 21,
    message: "Implicit type conversion applied",
    severity: MarkerSeverity.Info,
    severityLabel: "Info",
  },
  {
    id: "fixture-hint",
    line: 22,
    column: 9,
    endLine: 22,
    endColumn: 15,
    message: "Consider adding an explicit alias",
    severity: MarkerSeverity.Hint,
    severityLabel: "Hint",
  },
];

export default function ErrorPanelFixturePage() {
  return (
    <div className="flex h-screen w-full flex-col gap-6 overflow-y-auto bg-background p-6">
      <section>
        <ErrorPanel errors={FIXTURE_ERRORS} maxHeight={90} title="ErrorPanel visual fixture" />
      </section>
      <section>
        <ErrorPanel errors={[]} title="ErrorPanel empty fixture" />
      </section>
    </div>
  );
}
