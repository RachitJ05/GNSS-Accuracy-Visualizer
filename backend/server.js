import express from "express";
import cors from "cors";
import http from "http";
import initializeSocket from "./config/socket.js";
import { getGnssData, updateReceiverPacket, getReceiverState } from "./services/gnssService.js";
import { broadcastGnss } from "./services/broadcaster.js";
import { startRecording, stopRecording, getRecorderStatus } from "./services/recorderService.js";
import { createCaptureWorkbook } from "./services/captureService.js";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(
  "/recordings",
  express.static(
    path.join(
      process.cwd(),
      "recordings"
    )
  )
);

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

initializeSocket(server);

const DRIVER = process.env.DRIVER;

if (DRIVER === "simulator") {
  setInterval(() => {
    broadcastGnss(getGnssData());
  }, 1000);
}

setInterval(() => {             // Disconnect checker
  if (DRIVER !== "esp32" && DRIVER !== "bridge") return;
  const state = getReceiverState();
  if (!state.connected) return;
  const elapsed = Date.now() - state.lastSeen;
  if (elapsed > 5000) {
    state.connected = false;
    state.status = "disconnected";
    broadcastGnss(state);
    console.log("GNSS Receiver Disconnected");
  }
}, 1000);

app.post("/api/gnss", (req, res) => {
  const state = updateReceiverPacket(req.body);
  console.log("Broadcasting:", state);
  broadcastGnss(state);
  res.json({
    success: true
  });
  console.log("POST:", req.body);
});

app.post("/api/record/start", (req, res) => {
  startRecording();
  res.json({
    success: true,
  });
});

app.post("/api/record/stop", (req, res) => {
  try {
    const result = stopRecording();
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "No active recording",
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition"
    );

    res.setHeader(
      "Content-Length",
      result.buffer.length
    );

    res.send(result.buffer);
  }
  catch (err) {
    console.error(
      "Recording stop error:",
      err
    );
    res.status(500).json({
      success: false,
      message:
        "Failed to create recording file",
    });
  }
});

app.get("/api/record/status", (req, res) => {
  res.json(
    getRecorderStatus()
  );
});

app.post("/api/capture", (req, res) => {
  try {
    const buffer = createCaptureWorkbook(req.body);

    const now = new Date();

    const istTimestamp = now
      .toLocaleString("sv-SE", {
        timeZone: "Asia/Kolkata",
        hour12: false,
      })
      .replace(" ", "_")
      .replace(/:/g, "-")
      .replace(/\./g, "-");

    const filename =
      `GNSS_Capture_${istTimestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    // Important for frontend JavaScript to be able
    // to read the filename header
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition"
    );

    res.send(buffer);

  } catch (err) {

    console.error(
      "Capture error:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to create GNSS capture file",
    });
  }
});

app.get("/", (req, res) => {
  res.send("GNSS Backend Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});