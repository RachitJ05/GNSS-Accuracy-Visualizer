import XLSX from "xlsx";

let recording = false;

let samples = 0;

let startedAt = null;

let recordedData = [];

let currentFilename = "";


export function startRecording() {

  if (recording) {
    return;
  }


  // Create IST timestamp for filename

  const timestamp =
    new Date()
      .toLocaleString("sv-SE", {
        timeZone: "Asia/Kolkata",
        hour12: false,
      })
      .replace(" ", "_")
      .replace(/:/g, "-")
      .replace(/\./g, "-");


  currentFilename =
    `GNSS_Recording_${timestamp}.xlsx`;


  // Reset recording data

  recordedData = [];

  samples = 0;

  startedAt = Date.now();

  recording = true;
}


export function stopRecording() {

  if (!recording) {
    return null;
  }


  recording = false;


  // Create workbook

  const workbook =
    XLSX.utils.book_new();


  // Create worksheet

  const worksheet =
    XLSX.utils.aoa_to_sheet([
      [
        "Timestamp",
        "Latitude",
        "Longitude",
        "Altitude (m)",
        "Accuracy (m)",
        "Satellites",
        "HDOP",
        "FixType",
      ],

      ...recordedData,
    ]);


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "GNSS Recording"
  );


  // Generate XLSX in memory

  const buffer =
    XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });


  return {
    filename: currentFilename,
    buffer,
  };
}


export function appendRecord(data) {

  if (!recording) {
    return;
  }


  recordedData.push([
    data.timestamp ?? "",
    data.latitude ?? "",
    data.longitude ?? "",
    data.altitude ?? "",
    data.accuracy ?? "",
    data.satellites ?? "",
    data.hdop ?? "",
    data.fixType ?? "",
  ]);


  samples++;
}


export function getRecorderStatus() {

  return {

    recording,

    samples,

    elapsed:
      startedAt == null
        ? 0
        : Math.floor(
            (Date.now() - startedAt) / 1000
          ),

  };
}