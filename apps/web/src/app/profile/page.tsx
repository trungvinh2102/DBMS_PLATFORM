"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">User not logged in</p>
      </div>
    );
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
            {/* <AvatarImage src={user.avatar} alt={user.name || ""} /> */}
            <AvatarFallback className="text-4xl bg-primary/10 text-primary">
              {getInitials(user.name || user.email)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic details about your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <div className="p-2 border rounded-md bg-muted/50 text-sm">
                  {user.name || "N/A"}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Username</Label>
                <div className="p-2 border rounded-md bg-muted/50 text-sm">
                  {user.username}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="p-2 border rounded-md bg-muted/50 text-sm">
                  {user.email}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Your assigned roles and access levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label className="mb-1">Primary Role</Label>
                  <div>
                    {user.role ? (
                      <Badge
                        variant="secondary"
                        className="px-3 py-1 text-sm font-medium"
                      >
                        {user.role}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No primary role assigned
                      </span>
                    )}
                  </div>
                </div>

                {user.roles && user.roles.length > 0 && (
                  <div className="grid gap-2">
                    <Label className="mb-1">All Roles</Label>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className="px-2 py-0.5"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            {/* 
            <CardFooter className="border-t bg-muted/50 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                To request role changes, please contact your administrator or use the Access Request feature.
              </p>
            </CardFooter>
             */}
          </Card>
        </div>
      </div>
    </div>
  );
}
