# Monaco Editor Real-time Syntax Validation

A production-ready Monaco Editor implementation with real-time syntax validation for multiple languages.

## 📁 Files Structure

```
apps/web/src/lib/monaco/
├── index.ts              # Barrel exports
├── types.ts              # TypeScript type definitions
├── validationService.ts  # Multi-language validation logic
├── useEditorValidation.ts # React hook for validation management
├── MonacoEditor.tsx      # Main editor component
└── ErrorPanel.tsx        # Error display panel component

apps/web/src/app/monaco-demo/
└── page.tsx              # Demo page with examples
```

## 🚀 Quick Start

```tsx
import { MonacoEditor } from "@/lib/monaco";

function MyComponent() {
  const [code, setCode] = useState("SELECT * FROM users");

  return (
    <MonacoEditor
      value={code}
      onChange={(value) => setCode(value || "")}
      language="sql"
      height="400px"
      showErrorPanel={true}
    />
  );
}
```

## ✨ Features

- **Real-time Validation**: Debounced validation (300ms) without blocking UI
- **Multi-language Support**: SQL, JSON, JavaScript, TypeScript, Python
- **Visual Markers**: Red squiggly underlines, glyph icons, hover tooltips
- **Error Panel**: Clickable error list with navigation
- **SQL Dialects**: PostgreSQL, MySQL, SQLite support
- **Dark/Light Themes**: Automatic theme switching
- **Clean Architecture**: Separated concerns (hook, service, component)

## 📖 Marker Object Structure

```typescript
{
  startLineNumber: number,  // Starting line (1-indexed)
  startColumn: number,      // Starting column (1-indexed)
  endLineNumber: number,    // Ending line (1-indexed)
  endColumn: number,        // Ending column (1-indexed)
  message: string,          // Error message
  severity: MarkerSeverity  // Error=8, Warning=4, Info=2, Hint=1
}
```

## 🔄 Validation Flow

```
User Types → onChange fires → useEditorValidation hook
     ↓
Debounce (300ms)
     ↓
validateCode() routes to language validator
     ↓
     ├── validateSQL() → node-sql-parser + custom rules
     ├── validateJSON() → JSON.parse + enhanced errors
     ├── validateJavaScript() → Function constructor + bracket check
     └── validatePython() → Indentation + bracket validation
     ↓
Returns ValidationResult { isValid, markers }
     ↓
monaco.editor.setModelMarkers() → Visual markers in editor
     ↓
ErrorPanel receives errors → Displays list with navigation
```

## 🛠️ SQL Validation Rules

Using `node-sql-parser` + custom validations:

| Rule                   | Detection                           |
| ---------------------- | ----------------------------------- |
| Syntax Error           | Parse failure with location         |
| Missing FROM           | SELECT without FROM clause          |
| JOIN without ON        | JOIN keyword without ON condition   |
| Trailing Comma         | Comma before FROM/WHERE/GROUP/ORDER |
| Unbalanced Parentheses | Count mismatch                      |

### SQL Example with Errors

```sql
-- This code has multiple errors:
SELECT
  u.id,
  u.name,  -- Error: Trailing comma before FROM
FROM users u
LEFT JOIN orders o  -- Warning: Missing ON clause
WHERE (u.status = 'active'  -- Error: Missing closing parenthesis
```

## 🎨 JSON Validation

Enhanced JSON.parse with better error messages:

| Issue            | Detection                      |
| ---------------- | ------------------------------ |
| Trailing Comma   | `[1, 2, ]` patterns            |
| Single Quotes    | `'value'` instead of `"value"` |
| Unquoted Keys    | `{name: "value"}`              |
| Invalid Position | Precise line/column extraction |

### JSON Example with Errors

```json
{
  "name": "Missing quotes on key",
  "value": "Single quotes not allowed",
  "list": [1, 2]
}
```

## 💻 JavaScript Validation

Using Function constructor + bracket analysis:

| Issue             | Detection                              |
| ----------------- | -------------------------------------- |
| Syntax Errors     | Unexpected token, missing semicolons   |
| Unclosed Brackets | `()`, `[]`, `{}` balance check         |
| Template Literals | Unclosed backtick strings              |
| Comment Awareness | Ignores errors inside comments/strings |

## 🐍 Python Validation

Basic validation (no full Python parser):

| Issue               | Detection                  |
| ------------------- | -------------------------- |
| Mixed Indentation   | Tabs + spaces in same line |
| Unbalanced Brackets | `()`, `[]`, `{}` balance   |
| Unclosed Strings    | Triple-quoted strings      |

## 📚 Component API

### MonacoEditor Props

| Prop                | Type                                                          | Default   | Description       |
| ------------------- | ------------------------------------------------------------- | --------- | ----------------- |
| `value`             | `string`                                                      | required  | Editor content    |
| `onChange`          | `(value: string \| undefined) => void`                        | required  | Change handler    |
| `language`          | `'sql' \| 'json' \| 'javascript' \| 'typescript' \| 'python'` | `'sql'`   | Language          |
| `height`            | `string \| number`                                            | `'300px'` | Editor height     |
| `showErrorPanel`    | `boolean`                                                     | `true`    | Show error list   |
| `showErrorBadge`    | `boolean`                                                     | `true`    | Show error count  |
| `enableValidation`  | `boolean`                                                     | `true`    | Enable validation |
| `debounceMs`        | `number`                                                      | `300`     | Debounce delay    |
| `validationOptions` | `ValidationOptions`                                           | `{}`      | Validation config |
| `readOnly`          | `boolean`                                                     | `false`   | Read-only mode    |

### useEditorValidation Hook

```typescript
const {
  errors, // ErrorPanelEntry[]
  markers, // ValidationMarker[]
  isValidating, // boolean
  isValid, // boolean
  errorCount, // number
  warningCount, // number
  lastValidationTime, // number | null
  validate, // (code: string) => void
  clearMarkers, // () => void
} = useEditorValidation({
  monacoRef,
  editorRef,
  language: "sql",
  debounceMs: 300,
  enabled: true,
});
```

## 🎯 Demo Page

Visit `/monaco-demo` to see the implementation in action with:

- Language switcher (SQL, JSON, JavaScript, Python)
- Valid/Invalid code examples
- SQL dialect selector
- Real-time validation

## 🔧 Extending Validation

Add custom rules:

```typescript
import { validateCode, ValidationOptions } from "@/lib/monaco";

const options: ValidationOptions = {
  sqlDialect: "postgresql",
  customRules: [
    {
      id: "no-select-star",
      description: "Avoid SELECT *",
      severity: MarkerSeverity.Warning,
      validate: (code) => {
        // Return markers for violations
        if (code.includes("SELECT *")) {
          return [
            {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 9,
              message: "Avoid using SELECT *, specify columns explicitly",
              severity: MarkerSeverity.Warning,
            },
          ];
        }
        return [];
      },
    },
  ],
};

const result = validateCode("SELECT * FROM users", "sql", options);
```

## 📦 Dependencies

- `@monaco-editor/react` - React wrapper for Monaco Editor
- `monaco-editor` - Core editor and types
- `node-sql-parser` - SQL parsing and validation

## 🎨 Theming

Custom themes with error highlighting:

- `validation-dark` - Dark theme with red/yellow error colors
- `validation-light` - Light theme with accessibility colors

Theme automatically syncs with `next-themes`.
