import express from "express";
import cors from "cors";
import http from "http";
import initializeSocket from "./config/socket.js";
import { getGnssData, updateReceiverPacket, getReceiverState } from "./services/gnssService.js";
import { broadcastGnss } from "./services/broadcaster.js";
import { DRIVER } from "./config/driverConfig.js";
import { startRecording, stopRecording, getRecorderStatus } from "./services/recorderService.js";
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

if (DRIVER === "simulator") {
  setInterval(() => {
    broadcastGnss(getGnssData());
  }, 1000);
}

setInterval(() => {             // ESP32 disconnect checker
  if (DRIVER !== "esp32") return;
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
  const file = stopRecording();
  res.json({
    success: true,
    file,
  });
});

app.get("/api/record/status", (req, res) => {
  res.json(
    getRecorderStatus()
  );
});

app.get("/", (req, res) => {
  res.send("GNSS Backend Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});