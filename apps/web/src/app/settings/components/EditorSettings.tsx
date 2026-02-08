/**
 * @file EditorSettings.tsx
 * @description Monaco editor configuration settings.
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export function EditorSettings({ settings, updateEditor }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SQL Editor</CardTitle>
        <CardDescription>
          Configure the code editor experience in SQL Lab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Font Size (px)</Label>
            <Input
              type="number"
              min={10}
              max={32}
              value={settings.editorFontSize}
              onChange={(e) =>
                updateEditor({ editorFontSize: parseInt(e.target.value) || 14 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Tab Size</Label>
            <Select
              value={settings.editorTabSize.toString()}
              onValueChange={(val) =>
                val && updateEditor({ editorTabSize: parseInt(val) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Spaces</SelectItem>
                <SelectItem value="4">4 Spaces</SelectItem>
                <SelectItem value="8">8 Spaces</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Font Family</Label>
            <Input
              value={settings.editorFontFamily}
              onChange={(e) =>
                updateEditor({ editorFontFamily: e.target.value })
              }
              placeholder="'Fira Code', monospace"
            />
          </div>
          <div className="space-y-2">
            <Label>Word Wrap</Label>
            <Select
              value={settings.editorWordWrap}
              onValueChange={(val) =>
                val && updateEditor({ editorWordWrap: val })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">On</SelectItem>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="wordWrapColumn">Word Wrap Column</SelectItem>
                <SelectItem value="bounded">Bounded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Line Numbers</Label>
            <Select
              value={settings.editorLineNumbers}
              onValueChange={(val) =>
                val && updateEditor({ editorLineNumbers: val })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">On</SelectItem>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="relative">Relative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Editor Behaviors</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="minimap"
              checked={settings.editorMinimap}
              onCheckedChange={(c) => updateEditor({ editorMinimap: !!c })}
            />
            <Label htmlFor="minimap">Show Minimap</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="format-paste"
              checked={settings.editorFormatOnPaste}
              onCheckedChange={(c) =>
                updateEditor({ editorFormatOnPaste: !!c })
              }
            />
            <Label htmlFor="format-paste">Format on Paste</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="format-save"
              checked={settings.editorFormatOnSave}
              onCheckedChange={(c) => updateEditor({ editorFormatOnSave: !!c })}
            />
            <Label htmlFor="format-save">Format on Save</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
