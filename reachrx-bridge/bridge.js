import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import * as NMEA from "nmea-simple";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.REACH_PORT || "COM7";
const BAUD_RATE = Number(process.env.REACH_BAUD || 115200);
const BACKEND_URL =
    process.env.BACKEND_URL ||
    "http://localhost:5000";

const DISCONNECT_TIMEOUT =
    Number(process.env.DISCONNECT_TIMEOUT || 5000);

const GNSS_ENDPOINT =
    `${BACKEND_URL}/api/gnss`;

let port = null;
let parser = null;

let latestGST = null;

let disconnectTimer = null;

let connected = false;

let sending = false;


/* =====================================================
   SEND DATA TO BACKEND
===================================================== */

async function sendToBackend(packet) {

    if (sending) {
        return;
    }

    sending = true;

    try {

        const response = await fetch(
            GNSS_ENDPOINT,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify(packet),
            }
        );

        if (!response.ok) {

            console.error(
                `Backend HTTP ${response.status}`
            );

        }

    }
    catch (error) {

        console.error(
            "Backend connection failed:",
            error.message
        );

    }
    finally {

        sending = false;

    }

}


/* =====================================================
   FIX TYPE
===================================================== */

function getFixType(rawLine) {

    const fields =
        rawLine.split(",");

    const quality =
        Number(fields[6]);

    switch (quality) {

        case 0:
            return "Invalid";

        case 1:
            return "Single";

        case 2:
            return "DGPS";

        case 4:
            return "RTK Fixed";

        case 5:
            return "RTK Float";

        case 6:
            return "Dead Reckoning";

        default:
            return "Unknown";

    }

}


/* =====================================================
   DISCONNECT WATCHDOG
===================================================== */

function resetDisconnectTimer() {

    clearTimeout(
        disconnectTimer
    );

    disconnectTimer =
        setTimeout(
            async () => {

                if (!connected) {
                    return;
                }

                connected = false;

                console.log(
                    "Reach RX disconnected"
                );

                await sendToBackend({

                    connected: false,

                    status: "disconnected",

                    timestamp:
                        new Date().toISOString(),

                });

            },
            DISCONNECT_TIMEOUT
        );

}


/* =====================================================
   PROCESS GGA
===================================================== */

async function processGGA(
    rawLine,
    packet
) {

    const fixType =
        getFixType(rawLine);

    const accuracy =
        latestGST
            ? Number(
                Math.max(
                    latestGST.latitudeError,
                    latestGST.longitudeError
                ).toFixed(2)
            )
            : null;


    const receiverPacket = {

        latitude:
            packet.latitude,

        longitude:
            packet.longitude,

        altitude:
            packet.altitudeMeters,

        satellites:
            packet.satellitesInView,

        hdop:
            packet.horizontalDilution,

        accuracy,

        fixType,

        connected: true,

        status: "connected",

        mode: "standard",

        timestamp:
            new Date().toISOString(),

    };


    connected = true;


    console.log(
        "GNSS:",
        receiverPacket
    );


    await sendToBackend(
        receiverPacket
    );


    resetDisconnectTimer();

}


/* =====================================================
   CONNECT TO REACH RX
===================================================== */

function connect() {

    console.log(
        `Connecting to Reach RX on ${PORT}...`
    );


    port = new SerialPort({

        path: PORT,

        baudRate: BAUD_RATE,

    });


    port.on(
        "open",
        () => {

            console.log(
                `Reach RX connected on ${PORT}`
            );

        }
    );


    port.on(
        "error",
        (error) => {

            console.error(
                "Serial port error:",
                error.message
            );

        }
    );


    port.on(
        "close",
        async () => {

            console.log(
                "Reach RX serial connection closed"
            );

            if (connected) {

                connected = false;

                await sendToBackend({

                    connected: false,

                    status: "disconnected",

                    timestamp:
                        new Date().toISOString(),

                });

            }

        }
    );


    parser =
        port.pipe(
            new ReadlineParser({
                delimiter: "\r\n",
            })
        );


    parser.on(
        "data",
        async (line) => {

            try {

                const rawLine =
                    line.trim();


                if (!rawLine) {
                    return;
                }


                const packet =
                    NMEA.parseNmeaSentence(
                        rawLine
                    );


                /* GST */

                if (
                    packet.sentenceId ===
                    "GST"
                ) {

                    latestGST =
                        packet;

                    return;

                }


                /* Only GGA */

                if (
                    packet.sentenceId !==
                    "GGA"
                ) {

                    return;

                }


                await processGGA(
                    rawLine,
                    packet
                );

            }
            catch (error) {

                console.error(
                    "NMEA parsing error:",
                    error.message
                );

            }

        }
    );

}


/* =====================================================
   START
===================================================== */

connect();