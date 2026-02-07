/**
 * @file constants.tsx
 * @description Constants for the connections page including database types and default ports.
 */

import { SiPostgresql, SiMysql, SiOracle } from "react-icons/si";
import { DiMsqlServer } from "react-icons/di";

export const DB_TYPES = [
  {
    id: "postgres",
    name: "PostgreSQL",
    icon: <SiPostgresql />,
    color: "text-blue-600",
  },
  { id: "mysql", name: "MySQL", icon: <SiMysql />, color: "text-blue-500" },
  {
    id: "sqlserver",
    name: "SQL Server",
    icon: <DiMsqlServer />,
    color: "text-red-600",
  },
  { id: "oracle", name: "Oracle", icon: <SiOracle />, color: "text-red-600" },
] as const;

export const DEFAULT_PORTS: Record<string, string> = {
  postgres: "5432",
  mysql: "3306",
  sqlserver: "1433",
  oracle: "1521",
};

// URI protocol prefixes for each database type
export const DB_URI_PROTOCOLS: Record<string, string> = {
  postgres: "postgresql",
  mysql: "mysql",
  sqlserver: "sqlserver",
  oracle: "oracle",
};
