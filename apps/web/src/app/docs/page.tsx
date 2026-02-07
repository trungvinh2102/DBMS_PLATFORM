import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyIcon } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Introduction */}
      <section id="introduction" className="space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="text-primary border-primary">
            v1.0.0
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Documentation
          </h1>
          <p className="text-xl text-muted-foreground">
            A guide to using the DBMS Platform to manage your databases, execute
            queries, and leverage AI assistance.
          </p>
        </div>
        <div className="flex gap-4">
          <Button>Get Started</Button>
          <Button variant="outline">View on GitHub</Button>
        </div>
      </section>

      {/* Quick Start */}
      <section
        id="quick-start"
        className="space-y-6 border-t pt-8 scroll-mt-20"
      >
        <h2 className="text-3xl font-bold tracking-tight">Quick Start</h2>
        <p className="leading-7 font-light">
          Follow these steps to set up your environment and start querying your
          databases within minutes.
        </p>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">Installation</h3>
          <div className="relative rounded-lg border bg-muted p-4 font-mono text-sm">
            <p>git clone https://github.com/dbms-platform/core.git</p>
            <p>cd core</p>
            <p>npm install</p>
            <p>npm run dev</p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 hover:bg-background/80"
              disabled
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Connections */}
      <section
        id="connections"
        className="space-y-6 border-t pt-8 scroll-mt-20"
      >
        <h2 className="text-3xl font-bold tracking-tight">
          Database Connections
        </h2>
        <p className="leading-7">
          Connect to your PostgreSQL, MySQL, or other supported databases easily
          via the Connections page.
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
          <li>
            <strong className="text-foreground">Supports:</strong> PostgreSQL,
            MySQL, SQLite (Soon)
          </li>
          <li>
            <strong className="text-foreground">Security:</strong> Encrypted
            credentials storage.
          </li>
          <li>
            <strong className="text-foreground">SSL Modes:</strong> Configurable
            SSL verification for secure connections.
          </li>
        </ul>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h4 className="font-semibold mb-2">Connection String Format</h4>
          <p className="text-sm text-muted-foreground mb-4">
            You can use a standard connection URI or fill out individual fields.
          </p>
          <code className="bg-muted px-2 py-1 rounded text-sm">
            postgresql://user:password@localhost:5432/dbname
          </code>
        </div>
      </section>

      {/* SQL Lab */}
      <section id="sqllab" className="space-y-6 border-t pt-8 scroll-mt-20">
        <h2 className="text-3xl font-bold tracking-tight">SQL Lab</h2>
        <p className="leading-7">
          A powerful SQL editor with syntax highlighting, auto-completion, and
          multi-tab support.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Multiple Tabs</h3>
            <p className="text-sm text-muted-foreground">
              Work on multiple queries simultaneously without losing context.
              Each tab maintains its own state.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Result Viewer</h3>
            <p className="text-sm text-muted-foreground">
              Interactive table view for query results. Sort, filter, and export
              data directly from the UI.
            </p>
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section
        id="ai-generation"
        className="space-y-6 border-t pt-8 scroll-mt-20"
      >
        <h2 className="text-3xl font-bold tracking-tight">
          AI Assistant <Badge variant="secondary">Beta</Badge>
        </h2>
        <p className="leading-7">
          Leverage the power of LLMs to write complex SQL queries using natural
          language instructions.
        </p>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">How it works</h3>
          <p className="text-muted-foreground">
            1. Describe your query intent in the chat input.
            <br />
            2. The AI analyzes your database schema.
            <br />
            3. A generated SQL query is presented for your review.
            <br />
            4. Execute or refine the query directly in the editor.
          </p>
        </div>

        <div id="ai-explanation" className="pt-4 scroll-mt-20">
          <h3 className="text-xl font-semibold mb-2">Query Explanation</h3>
          <p className="text-muted-foreground">
            Select any part of your SQL code and ask the AI to explain its logic
            or optimize it for better performance.
          </p>
        </div>
      </section>

      {/* Settings */}
      <section id="settings" className="space-y-6 border-t pt-8 scroll-mt-20">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="leading-7">
          Customize your workspace appearance, including theme preferences and
          default configurations.
        </p>
      </section>
    </div>
  );
}
