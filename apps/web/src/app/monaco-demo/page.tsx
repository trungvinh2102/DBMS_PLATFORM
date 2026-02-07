/**
 * @file page.tsx
 * @description Demo page showcasing Monaco Editor with real-time syntax validation.
 *
 * ## Features:
 * - Language switcher (SQL, JSON, JavaScript, Python)
 * - Example code for each language
 * - Real-time validation demonstration
 * - Error panel integration
 * - Dark theme
 *
 * ## Examples included:
 * - SQL: SELECT without FROM, JOIN without ON, trailing comma
 * - JSON: Trailing comma, single quotes, unquoted keys
 * - JavaScript: Unclosed brackets, unexpected tokens
 */

"use client";

import { useState, useCallback } from "react";
import { MonacoEditor, type SupportedLanguage } from "@/lib/monaco";

// ============================================================================
// EXAMPLE CODE SAMPLES
// ============================================================================

const EXAMPLE_CODE: Record<
  SupportedLanguage,
  { valid: string; invalid: string }
> = {
  sql: {
    valid: `-- Valid SQL Query
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 0
ORDER BY order_count DESC
LIMIT 10;`,
    invalid: `-- SQL with syntax errors
SELECT 
  u.id,
  u.name,
  u.email,  -- Trailing comma before FROM
FROM users u
LEFT JOIN orders o  -- Missing ON clause
WHERE u.status = 'active'
  AND (u.role = 'admin' OR u.role = 'user'  -- Missing closing parenthesis
GROUP BY u.id`,
  },
  json: {
    valid: `{
  "name": "Monaco Editor Demo",
  "version": "1.0.0",
  "features": [
    "syntax-validation",
    "real-time-errors",
    "multi-language"
  ],
  "config": {
    "enabled": true,
    "debounceMs": 300,
    "showErrorPanel": true
  }
}`,
    invalid: `{
  name: "Missing quotes on key",
  'singleQuote': 'JSON requires double quotes',
  "trailingComma": "not allowed",
  "array": [
    "item1",
    "item2",
  ],
}`,
  },
  javascript: {
    valid: `// Valid JavaScript
function calculateTotal(items) {
  const prices = items.map(item => item.price * item.quantity);
  const subtotal = prices.reduce((sum, price) => sum + price, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total,
    formattedTotal: \`$\${total.toFixed(2)}\`
  };
}

const result = calculateTotal([
  { name: 'Widget', price: 9.99, quantity: 3 },
  { name: 'Gadget', price: 24.99, quantity: 1 }
]);

console.log(result);`,
    invalid: `// JavaScript with syntax errors
function brokenFunction(items {  // Missing closing parenthesis
  const prices = items.map(item => item.price;  // Missing closing bracket
  
  const result = {
    name: "test"
    value: 123  // Missing comma between properties
  };
  
  // Unclosed template literal
  const message = \`Hello, this is broken
  
  return result;
}`,
  },
  typescript: {
    valid: `// Valid TypeScript
interface User {
  id: number;
  name: string;
  email: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}`,
    invalid: `// TypeScript with syntax errors
interface User {
  id: number
  name: string,  // Inconsistent semicolons (valid but warning)
  email; // Missing type
}

function greet(user: User: string {  // Syntax error
  return \`Hello, \${user.name\`;  // Unclosed template
`,
  },
  python: {
    valid: `# Valid Python
def calculate_average(numbers):
    if not numbers:
        return 0
    
    total = sum(numbers)
    count = len(numbers)
    average = total / count
    
    return round(average, 2)

def main():
    data = [10, 20, 30, 40, 50]
    result = calculate_average(data)
    print(f"Average: {result}")

if __name__ == "__main__":
    main()`,
    invalid: `# Python with potential issues
def broken_function():
    # Mixed tabs and spaces (will show error)
	    value = 10
    if True:
        # Unclosed parenthesis
        result = (value * 2
        
    # Unclosed string
    message = """
    This is a multi-line string
    that is never closed`,
  },
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function MonacoValidationDemo() {
  // ============================================================================
  // STATE
  // ============================================================================

  const [language, setLanguage] = useState<SupportedLanguage>("sql");
  const [code, setCode] = useState(EXAMPLE_CODE.sql.invalid);
  const [sqlDialect, setSqlDialect] = useState<
    "mysql" | "postgresql" | "sqlite"
  >("postgresql");
  const [cursorPosition, setCursorPosition] = useState({
    lineNumber: 1,
    column: 1,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLanguageChange = useCallback((newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    setCode(EXAMPLE_CODE[newLanguage].invalid);
  }, []);

  const handleLoadValidCode = useCallback(() => {
    setCode(EXAMPLE_CODE[language].valid);
  }, [language]);

  const handleLoadInvalidCode = useCallback(() => {
    setCode(EXAMPLE_CODE[language].invalid);
  }, [language]);

  const handlePositionChange = useCallback(
    (position: { lineNumber: number; column: number }) => {
      setCursorPosition(position);
    },
    [],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="demo-container">
      {/* Header */}
      <div className="demo-header">
        <h1>Monaco Editor - Real-time Syntax Validation</h1>
        <p>
          Type in the editor below to see real-time syntax validation with error
          highlighting
        </p>
      </div>

      {/* Controls */}
      <div className="controls">
        {/* Language Selector */}
        <div className="control-group">
          <label>Language:</label>
          <div className="button-group">
            {(
              ["sql", "json", "javascript", "python"] as SupportedLanguage[]
            ).map((lang) => (
              <button
                key={lang}
                className={`lang-button ${language === lang ? "active" : ""}`}
                onClick={() => handleLanguageChange(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Dialect Selector (only for SQL) */}
        {language === "sql" && (
          <div className="control-group">
            <label>SQL Dialect:</label>
            <select
              value={sqlDialect}
              onChange={(e) =>
                setSqlDialect(
                  e.target.value as "mysql" | "postgresql" | "sqlite",
                )
              }
              className="dialect-select"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
        )}

        {/* Example Buttons */}
        <div className="control-group">
          <label>Examples:</label>
          <div className="button-group">
            <button
              className="example-button valid"
              onClick={handleLoadValidCode}
            >
              ✓ Load Valid Code
            </button>
            <button
              className="example-button invalid"
              onClick={handleLoadInvalidCode}
            >
              ✗ Load Invalid Code
            </button>
          </div>
        </div>

        {/* Cursor Position */}
        <div className="cursor-position">
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </div>
      </div>

      {/* Editor */}
      <div className="editor-section">
        <MonacoEditor
          value={code}
          onChange={(value) => setCode(value || "")}
          language={language}
          height="500px"
          showErrorPanel={true}
          showErrorBadge={true}
          enableValidation={true}
          debounceMs={300}
          validationOptions={{
            sqlDialect: sqlDialect,
          }}
          onPositionChange={handlePositionChange}
          placeholder={`Enter ${language.toUpperCase()} code here...`}
        />
      </div>

      {/* Documentation */}
      <div className="documentation">
        <h2>Marker Object Structure</h2>
        <pre className="code-block">
          {`{
  startLineNumber: number,  // Starting line (1-indexed)
  startColumn: number,      // Starting column (1-indexed)
  endLineNumber: number,    // Ending line (1-indexed)
  endColumn: number,        // Ending column (1-indexed)
  message: string,          // Error message
  severity: MarkerSeverity  // Error = 8, Warning = 4, Info = 2, Hint = 1
}`}
        </pre>

        <h2>Validation Flow</h2>
        <ol className="flow-list">
          <li>
            User types in editor → <code>onChange</code> callback fires
          </li>
          <li>
            <code>useEditorValidation</code> hook receives new code
          </li>
          <li>Validation is debounced (300ms default)</li>
          <li>
            <code>validateCode()</code> routes to language-specific validator
          </li>
          <li>
            Validator returns <code>ValidationResult</code> with markers
          </li>
          <li>
            <code>monaco.editor.setModelMarkers()</code> applies markers to
            editor
          </li>
          <li>Editor displays squiggly underlines and glyph icons</li>
          <li>
            <code>ErrorPanel</code> displays list of all issues
          </li>
        </ol>

        <h2>Features</h2>
        <ul className="feature-list">
          <li>✅ Real-time validation with 300ms debounce</li>
          <li>✅ Red squiggly underlines for errors</li>
          <li>✅ Yellow underlines for warnings</li>
          <li>✅ Hover tooltips with error messages</li>
          <li>✅ Error panel with clickable navigation</li>
          <li>✅ Error count badge</li>
          <li>✅ Multi-language support (SQL, JSON, JS, Python)</li>
          <li>✅ SQL dialect support (PostgreSQL, MySQL, SQLite)</li>
          <li>✅ Dark/Light theme support</li>
          <li>✅ Clean architecture with separated concerns</li>
        </ul>
      </div>

      {/* Styles */}
      <style jsx>{`
        .demo-container {
          min-height: 100vh;
          padding: 24px;
          background: #0a0a0a;
          color: #e5e5e5;
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .demo-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .demo-header h1 {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .demo-header p {
          color: #888;
          font-size: 14px;
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding: 16px;
          background: #111;
          border-radius: 8px;
          border: 1px solid #222;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-group label {
          font-size: 12px;
          color: #888;
          font-weight: 500;
        }

        .button-group {
          display: flex;
          gap: 4px;
        }

        .lang-button {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #333;
          border-radius: 4px;
          background: #1a1a1a;
          color: #888;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .lang-button:hover {
          background: #252525;
          color: #ccc;
        }

        .lang-button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .dialect-select {
          padding: 6px 10px;
          font-size: 12px;
          border: 1px solid #333;
          border-radius: 4px;
          background: #1a1a1a;
          color: #ccc;
          cursor: pointer;
        }

        .example-button {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #333;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .example-button.valid {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
          color: #22c55e;
        }

        .example-button.valid:hover {
          background: rgba(34, 197, 94, 0.2);
        }

        .example-button.invalid {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }

        .example-button.invalid:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .cursor-position {
          margin-left: auto;
          font-size: 11px;
          font-family: monospace;
          color: #666;
          padding: 6px 12px;
          background: #1a1a1a;
          border-radius: 4px;
        }

        .editor-section {
          margin-bottom: 24px;
        }

        .documentation {
          padding: 24px;
          background: #111;
          border-radius: 8px;
          border: 1px solid #222;
        }

        .documentation h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #e5e5e5;
        }

        .documentation h2:not(:first-child) {
          margin-top: 24px;
        }

        .code-block {
          background: #0a0a0a;
          padding: 16px;
          border-radius: 6px;
          font-family: "JetBrains Mono", "Fira Code", monospace;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          border: 1px solid #222;
        }

        .flow-list {
          padding-left: 20px;
          line-height: 1.8;
          color: #aaa;
        }

        .flow-list code {
          background: #1a1a1a;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          color: #8b5cf6;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 8px;
        }

        .feature-list li {
          padding: 8px 12px;
          background: #0a0a0a;
          border-radius: 4px;
          font-size: 13px;
          color: #aaa;
        }
      `}</style>
    </div>
  );
}
