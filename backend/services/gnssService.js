import SimulatorDriver from "../drivers/simulatorDriver.js";
import ESP32Driver from "../drivers/esp32Driver.js";
import receiverState from "./receiverState.js";
import { DRIVER } from "../config/driverConfig.js";
import { appendRecord } from "./recorderService.js";

const driver = DRIVER === "simulator" ? new SimulatorDriver() : new ESP32Driver();

if (typeof driver.connect === "function") {
  driver.connect();
}

export function getGnssData() {

  if (DRIVER === "esp32") {
    return receiverState;
  }

  const data = driver.getData();

  Object.assign(receiverState, data);

  receiverState.connected = true;

  receiverState.timestamp = new Date().toISOString();

  return receiverState;
}

export function updateReceiverPacket(packet) {

  if (DRIVER === "esp32") {
    driver.updatePacket(packet);
  }

  Object.assign(receiverState, packet);

  receiverState.connected = true;

  receiverState.status = "connected";

  receiverState.lastSeen = Date.now();

  receiverState.timestamp = new Date().toISOString();

  appendRecord(receiverState);

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