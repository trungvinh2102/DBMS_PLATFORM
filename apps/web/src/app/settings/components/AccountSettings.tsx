/**
 * @file AccountSettings.tsx
 * @description User profile and security settings.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function AccountSettings({ user }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Manage your profile and security settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-lg font-medium">{user?.name || "User"}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button variant="link" className="px-0 h-auto mt-1">
              Change Avatar
            </Button>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" defaultValue={user?.name || ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={user?.email || ""} disabled />
          </div>
        </div>
        <div className="pt-4">
          <h3 className="text-sm font-medium mb-4">Security</h3>
          <Button variant="outline">Change Password</Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <span className="text-xs text-muted-foreground">
          Last login: {new Date().toLocaleDateString()}
        </span>
        <Button variant="destructive" size="sm">
          Delete Account
        </Button>
      </CardFooter>
    </Card>
  );
}
