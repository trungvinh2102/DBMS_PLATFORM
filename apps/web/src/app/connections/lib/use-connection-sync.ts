/**
 * @file use-connection-sync.ts
 * @description Custom hook to synchronize database connection fields with a URI string.
 */

import { useCallback, useEffect, useRef } from "react";
import { parseUri, buildUri } from "./uri-utils";
import { DEFAULT_PORTS } from "../database-connections/components/constants";

export interface ConnectionFormData {
  name: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  description: string;
  uri: string;
}

export function useConnectionSync(
  formData: ConnectionFormData,
  setFormData: (data: ConnectionFormData) => void,
  selectedType: string,
) {
  const lastEditSourceRef = useRef<"uri" | "fields" | null>(null);

  const updateUriFromFields = useCallback(() => {
    if (lastEditSourceRef.current === "uri") {
      lastEditSourceRef.current = null;
      return;
    }

    const newUri = buildUri(
      selectedType,
      formData.host,
      formData.port,
      formData.user,
      formData.password,
      formData.database,
    );

    if (newUri !== formData.uri) {
      setFormData({ ...formData, uri: newUri });
    }
  }, [formData, selectedType, setFormData]);

  const updateFieldsFromUri = useCallback(() => {
    if (lastEditSourceRef.current === "fields") {
      lastEditSourceRef.current = null;
      return;
    }

    const parsed = parseUri(formData.uri);
    if (parsed) {
      const hasChanges =
        (parsed.host !== undefined && parsed.host !== formData.host) ||
        (parsed.port !== undefined && parsed.port !== formData.port) ||
        (parsed.user !== undefined && parsed.user !== formData.user) ||
        (parsed.password !== undefined &&
          parsed.password !== formData.password) ||
        (parsed.database !== undefined &&
          parsed.database !== formData.database);

      if (hasChanges) {
        setFormData({
          ...formData,
          host: parsed.host ?? formData.host,
          port: parsed.port ?? formData.port,
          user: parsed.user ?? formData.user,
          password: parsed.password ?? formData.password,
          database: parsed.database ?? formData.database,
        });
      }
    }
  }, [formData, setFormData]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUriFromFields();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [
    formData.host,
    formData.port,
    formData.user,
    formData.password,
    formData.database,
    selectedType,
    updateUriFromFields,
  ]);

  const handleFieldChange = (
    field: keyof ConnectionFormData,
    value: string,
  ) => {
    lastEditSourceRef.current = "fields";

    let newPort = field === "port" ? value : formData.port;
    if (field !== "port" && !formData.port && field === "host") {
      newPort = DEFAULT_PORTS[selectedType] || "";
    }

    setFormData({
      ...formData,
      [field]: value,
      port: newPort,
    });
  };

  const handleUriChange = (value: string) => {
    lastEditSourceRef.current = "uri";
    setFormData({ ...formData, uri: value });

    setTimeout(() => {
      updateFieldsFromUri();
    }, 150);
  };

  return {
    handleFieldChange,
    handleUriChange,
  };
}
