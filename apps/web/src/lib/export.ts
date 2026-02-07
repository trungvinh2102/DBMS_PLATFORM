import * as XLSX from "xlsx";

export type ExportFormat = "csv" | "xlsx";

/**
 * Export data to CSV or Excel file
 * @param data Array of objects to export
 * @param columns List of keys to include in the export (optional, defaults to all keys in first object)
 * @param format 'csv' or 'xlsx'
 * @param filename Name of the file without extension
 */
export const exportData = (
  data: any[],
  columns: string[],
  format: ExportFormat,
  filename: string,
) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Filter data to only include specified columns and handle object values
  const formattedData = data.map((row) => {
    const newRow: any = {};
    columns.forEach((col) => {
      let val = row[col];
      // Stringify objects/arrays for CSV/Excel readability
      if (val !== null && typeof val === "object") {
        val = JSON.stringify(val);
      }
      newRow[col] = val;
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Auto-width for columns
  if (format === "xlsx") {
    const colWidths = columns.map((col) => {
      // Get max length of data in this column (capped at 50 chars to avoid huge columns)
      const maxDataLength = Math.max(
        ...formattedData.map((row) => String(row[col] || "").length),
      );
      const headerLength = col.length;
      return { wch: Math.min(Math.max(maxDataLength, headerLength) + 2, 50) };
    });
    worksheet["!cols"] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  XLSX.writeFile(workbook, `${filename}.${format}`);
};
