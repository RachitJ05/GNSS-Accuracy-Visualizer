import SimulatorDriver from "../drivers/simulatorDriver.js";
import ESP32Driver from "../drivers/esp32Driver.js";
import receiverState from "./receiverState.js";
import { appendRecord } from "./recorderService.js";
import dotenv from "dotenv";
dotenv.config();

const DRIVER = process.env.DRIVER;
let driver;

if (DRIVER === "simulator") {
  driver = new SimulatorDriver();
} else if (DRIVER === "esp32") {
  driver = new ESP32Driver();
}

if (driver && typeof driver.connect === "function") {
  driver.connect();
}

export function getGnssData() {

  if (DRIVER !== "simulator") {
    return receiverState;
  }

  const data = driver.getData();

  if (!data) {
    return receiverState;
  }

  Object.assign(receiverState, data);

  receiverState.connected = true;
  receiverState.status = "connected";
  receiverState.lastSeen = Date.now();
  receiverState.timestamp = new Date().toISOString();

  appendRecord(receiverState);

  return receiverState;
}

export function updateReceiverPacket(packet) {

  Object.assign(
    receiverState,
    packet
  );

  if (packet.connected === false) {

    receiverState.connected = false;

    receiverState.status =
      "disconnected";

  }
  else {

    receiverState.connected = true;

    receiverState.status =
      "connected";

    receiverState.lastSeen =
      Date.now();

  }

  receiverState.timestamp =
    packet.timestamp ||
    new Date().toISOString();

  appendRecord(
    receiverState
  );

  return receiverState;
}

export function updateMode(mode) {

  receiverState.mode = mode;

  if (typeof driver.setMode === "function") {
    driver.setMode(mode);
  }
}

export function getReceiverState() {
  return receiverState;
}