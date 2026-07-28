import { DRIVER } from "../config/driverConfig.js";
import SimulatorDriver from "./simulatorDriver.js";
import ESP32Driver from "./esp32Driver.js";

export function createDriver() {
  return DRIVER === "simulator"
    ? new SimulatorDriver()
    : new ESP32Driver();
}