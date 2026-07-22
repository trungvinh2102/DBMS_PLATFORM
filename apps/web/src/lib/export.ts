export type ExportFormat = "csv" | "xlsx";

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
};

const escapeCsvCell = (value: unknown) => {
  const text = String(formatCellValue(value));
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (
  data: any[],
  columns: string[],
  filename: string,
  encoding: string,
) => {
  const rows = [
    columns.map(escapeCsvCell).join(","),
    ...data.map((row) =>
      columns.map((column) => escapeCsvCell(row[column])).join(","),
    ),
  ];
  const blob = new Blob([rows.join("\r\n")], {
    type: `text/csv;charset=${encoding}`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

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

  if (format === "csv") {
    downloadCsv(data, columns, filename, encoding);
    return;
  }

  const formattedData = data.map((row) => {
    const newRow: any = {};
    columns.forEach((col) => {
      newRow[col] = formatCellValue(row[col]);
    });
    return newRow;
  });

  const XLSX = await import("xlsx");

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  const colWidths = columns.map((col) => {
    const maxDataLength = Math.max(
      ...formattedData.map((row) => String(row[col] || "").length),
    );
    const headerLength = col.length;
    return { wch: Math.min(Math.max(maxDataLength, headerLength) + 2, 50) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
