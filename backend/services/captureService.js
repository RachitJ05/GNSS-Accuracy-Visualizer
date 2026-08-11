import XLSX from "xlsx";

function createCaptureWorkbook(data) {
  // Create a completely new workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheet with headers + exactly one captured sample
  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      "Timestamp",
      "Latitude",
      "Longitude",
      "Altitude (m)",
      "Accuracy (m)",
      "Satellites",
      "HDOP",
      "Fix Type",
    ],
    [
      data.timestamp ?? new Date().toISOString(),
      data.latitude ?? "",
      data.longitude ?? "",
      data.altitude ?? "",
      data.accuracy ?? "",
      data.satellites ?? "",
      data.hdop ?? "",
      data.fixType ?? "",
    ],
  ]);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Capture"
  );

  // Generate XLSX as a Buffer in memory
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return buffer;
}

export {
  createCaptureWorkbook,
};