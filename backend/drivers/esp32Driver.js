class ESP32Driver {

  constructor() {
    this.latestPacket = null;
    this.connected = false;
  }

  connect() {
    console.log("Waiting for ESP32...");
  }

  disconnect() {
    this.connected = false;
  }

  getData() {
    return this.latestPacket;
  }

  setMode(mode) {
    console.log(`Requested mode: ${mode}`);
  }

  updatePacket(packet) {
    this.latestPacket = packet;
    this.connected = true;
  }
}

export default ESP32Driver;