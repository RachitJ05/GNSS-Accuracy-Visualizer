import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import * as NMEA from "nmea-simple";
import { updateReceiverPacket, getReceiverState } from "../services/gnssService.js";
import { broadcastGnss } from "../services/broadcaster.js";

class ReachRxDriver {
    constructor() {
        this.port = null;
        this.parser = null;
        this.latestGST = null;
        this.connected = false;
        this.disconnectTimer = null;
    }

    connect() {

        this.port = new SerialPort({
            path: "COM7",          // Change if needed
            baudRate: 115200,
        });

        this.parser = this.port.pipe(
            new ReadlineParser({
                delimiter: "\r\n",
            })
        );

        this.parser.on("data", (line) => {
            try {
                const rawLine = line;
                const packet = NMEA.parseNmeaSentence(line);

                if (packet.sentenceId === "GST") {
                    this.latestGST = packet;
                    return;
                }

                if (packet.sentenceId !== "GGA") return;

                const fields = rawLine.split(",");

                const quality = Number(fields[6]);

                let fixType = "Unknown";

                switch (quality) {
                    case 0:
                        fixType = "Invalid";
                        break;
                    case 1:
                        fixType = "Single";
                        break;
                    case 2:
                        fixType = "DGPS";
                        break;
                    case 4:
                        fixType = "RTK Fixed";
                        break;
                    case 5:
                        fixType = "RTK Float";
                        break;
                    case 6:
                        fixType = "Dead Reckoning";
                        break;
                }
                
                const receiverPacket = {
                    latitude: packet.latitude,
                    longitude: packet.longitude,
                    altitude: packet.altitudeMeters,
                    satellites: packet.satellitesInView,
                    hdop: packet.horizontalDilution,
                    accuracy: this.latestGST ? Number(Math.max(this.latestGST.latitudeError,this.latestGST.longitudeError).toFixed(2)): null,
                    fixType,
                    connected: true,
                    status: "connected",
                    timestamp: new Date().toISOString()
                };
                const state = updateReceiverPacket(receiverPacket);
                broadcastGnss(state);
                this.connected = true;
                clearTimeout(this.disconnectTimer);
                this.disconnectTimer = setTimeout(() => {
                const state = getReceiverState();
                state.connected = false;
                state.status = "disconnected";
                broadcastGnss(state);
                console.log("Reach RX Disconnected");
                }, 5000);
            }
            catch (err) {
                // Ignore unsupported NMEA sentences
            }

        });

        console.log("Reach RX Connected");
    }

    disconnect() {
        this.connected = false;

        if (this.port) {
            this.port.close();
        }
    }

    setMode(mode) {
        console.log(`Requested mode: ${mode}`);
    }

}

export default ReachRxDriver;