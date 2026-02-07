/**
 * @file constants.tsx
 * @description Constants for the connections page including database types and default ports.
 */

import {
  SiPostgresql,
  SiMysql,
  SiOracle,
  SiSqlite,
  SiMongodb,
  SiRedis,
} from "react-icons/si";
import { DiMsqlServer } from "react-icons/di";
import { RiDatabase2Line } from "react-icons/ri";

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
  { id: "sqlite", name: "SQLite", icon: <SiSqlite />, color: "text-blue-400" },
  {
    id: "mongodb",
    name: "MongoDB",
    icon: <SiMongodb />,
    color: "text-green-600",
  },
  {
    id: "documentdb",
    name: "DocumentDB",
    icon: <RiDatabase2Line />,
    color: "text-orange-500",
  },
  { id: "redis", name: "Redis", icon: <SiRedis />, color: "text-red-600" },
] as const;

export const DEFAULT_PORTS: Record<string, string> = {
  postgres: "5432",
  mysql: "3306",
  sqlserver: "1433",
  oracle: "1521",
  mongodb: "27017",
  documentdb: "27017",
  redis: "6379",
};
