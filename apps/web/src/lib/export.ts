export type ExportFormat = "csv" | "xlsx";

export const exportData = async (
  data: any[],
  columns: string[],
  format: ExportFormat,
  filename: string,
  encoding: string = "UTF-8",
) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const formattedData = data.map((row) => {
    const newRow: any = {};
    columns.forEach((col) => {
      let val = row[col];
      if (val !== null && typeof val === "object") {
        val = JSON.stringify(val);
      }
      newRow[col] = val;
    });
    return newRow;
  });

  const XLSX = await import("xlsx");

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  if (format === "xlsx") {
    const colWidths = columns.map((col) => {
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
