/**
 * @file GeneralSettings.tsx
 * @description Application appearance and language settings.
 */

import { Label } from "@/components/ui/label";
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

interface GeneralSettingsProps {
  theme: string;
  onThemeChange: (theme: string | null) => void;
}

export function GeneralSettings({
  theme,
  onThemeChange,
}: GeneralSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance & Behavior</CardTitle>
        <CardDescription>
          Customize how the application looks and feels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="theme">Theme</Label>
          <div className="flex items-center space-x-4">
            <Select value={theme} onValueChange={onThemeChange}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Select your preferred interface theme.
            </div>
          </div>
        </div>
        <Separator />
        <div className="space-y-1">
          <Label htmlFor="language">Language</Label>
          <Select disabled defaultValue="en">
            <SelectTrigger className="w-50">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="vi">Tiếng Việt (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[0.8rem] text-muted-foreground mt-2">
            Multi-language support is currently under development.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
