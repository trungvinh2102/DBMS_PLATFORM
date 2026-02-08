/**
 * @file DataSettings.tsx
 * @description Data display and export settings.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DataSettings({ settings, updateData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & Results</CardTitle>
        <CardDescription>
          Manage how query results are displayed and exported.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Default Query Limit (Rows)</Label>
          <Input
            type="number"
            value={settings.defaultQueryLimit}
            onChange={(e) =>
              updateData({ defaultQueryLimit: parseInt(e.target.value) || 100 })
            }
          />
          <p className="text-[0.8rem] text-muted-foreground">
            Maximum number of rows to fetch by default.
          </p>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Null Value Display</Label>
            <Input
              value={settings.showNullAs}
              onChange={(e) => updateData({ showNullAs: e.target.value })}
              placeholder="(null)"
            />
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Input
              value={settings.dateTimeFormat}
              onChange={(e) => updateData({ dateTimeFormat: e.target.value })}
              placeholder="YYYY-MM-DD HH:mm:ss"
            />
          </div>
          <div className="space-y-2">
            <Label>CSV Export Delimiter</Label>
            <Select
              value={settings.csvDelimiter}
              onValueChange={(val) => val && updateData({ csvDelimiter: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">Comma (,)</SelectItem>
                <SelectItem value=";">Semicolon (;)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
