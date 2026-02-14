"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { maskingApi } from "@/lib/api-client";
import { type MaskingPreviewResponse } from "@/lib/types";

export function MaskingPreview() {
  const [sql, setSql] = useState("SELECT name, email, phone FROM users");
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MaskingPreviewResponse | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const data = await maskingApi.previewSQL(sql, roleId);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sql">Original SQL Query</Label>
          <Textarea
            id="sql"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Simulate Role ID</Label>
          <Input
            id="role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            placeholder="Optional (simulates user context)"
          />
        </div>
        <Button onClick={handlePreview} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Preview Rewrite
        </Button>
      </div>

      {result && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Rewritten SQL</h3>
                <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap break-all">
                  <code>{result.rewrittenSQL}</code>
                </pre>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                <strong>Applied Policies:</strong>{" "}
                {result.appliedPolicies.length > 0
                  ? result.appliedPolicies.join(", ")
                  : "None"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
