/**
 * @file page.tsx
 * @description Main entry point for connections that redirects to database connections.
 */

import { redirect } from "next/navigation";

export default function ConnectionsPage() {
  redirect("/connections/database-connections");
}
