import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import net from "net";
import dotenv from "dotenv";

dotenv.config();

const SERIAL_PORT = process.env.REACH_PORT || "COM3";
const BAUD_RATE = Number(process.env.REACH_BAUD || 115200);

const BACKEND_URL = process.env.BACKEND_URL;

const NTRIP_HOST = process.env.NTRIP_HOST;
const NTRIP_PORT = Number(process.env.NTRIP_PORT || 2101);
const NTRIP_MOUNTPOINT = process.env.NTRIP_MOUNTPOINT || "MSM5";

const NTRIP_USERNAME = process.env.NTRIP_USERNAME;
const NTRIP_PASSWORD = process.env.NTRIP_PASSWORD;

let serialPort = null;
let parser = null;
let ntripSocket = null;

let latestGGA = null;
let latestGST = null;

let serialConnected = false;
let ntripConnected = false;
let headersReceived = false;

let lastGNSSDataTime = 0;
let rtcmBytes = 0;

const DISCONNECT_TIMEOUT = 5000;


// ======================================================
// SERIAL CONNECTION
// ======================================================

function connectSerial() {

    console.log(
        `Connecting to Reach RX on ${SERIAL_PORT}...`
    );

    serialPort = new SerialPort({
        path: SERIAL_PORT,
        baudRate: BAUD_RATE,
    });

    parser = serialPort.pipe(
        new ReadlineParser({
            delimiter: "\r\n",
        })
    );


    // --------------------------------------------------
    // SERIAL OPEN
    // --------------------------------------------------

    serialPort.on("open", () => {

        serialConnected = true;

        console.log(
            `Reach RX connected on ${SERIAL_PORT}`
        );

        console.log(
            "Waiting for Reach RX GGA before connecting to NTRIP..."
        );
    });


    // --------------------------------------------------
    // SERIAL ERROR
    // --------------------------------------------------

    serialPort.on("error", (err) => {

        serialConnected = false;

        console.error(
            "Reach RX serial error:",
            err.message
        );
    });


    // --------------------------------------------------
    // SERIAL CLOSE
    // --------------------------------------------------

    serialPort.on("close", () => {

        serialConnected = false;

        console.log(
            "Reach RX disconnected"
        );

        if (ntripSocket) {

            ntripSocket.destroy();

            ntripSocket = null;
        }

        ntripConnected = false;
        headersReceived = false;
    });


    // ==================================================
    // NMEA DATA FROM REACH RX
    // ==================================================

    parser.on("data", async (line) => {

        line = line.trim();

        if (!line.startsWith("$")) {
            return;
        }


        // ----------------------------------------------
        // GST
        // ----------------------------------------------

        if (
            line.startsWith("$GNGST") ||
            line.startsWith("$GPGST")
        ) {

            const fields = line.split(",");

            latestGST = {

                latitudeError:
                    Number(fields[6]),

                longitudeError:
                    Number(fields[7]),

                altitudeError:
                    Number(
                        fields[8]?.split("*")[0]
                    ),
            };

            return;
        }


        // ----------------------------------------------
        // GGA
        // ----------------------------------------------

        if (
            !line.startsWith("$GNGGA") &&
            !line.startsWith("$GPGGA")
        ) {
            return;
        }


        latestGGA = line;


        // ----------------------------------------------
        // Connect to NTRIP after first GGA
        // ----------------------------------------------

        if (!ntripSocket) {

        console.log(
            "First GGA received - connecting to NTRIP..."
        );

        connectNTRIP();

    }


        // ----------------------------------------------
        // Parse GGA
        // ----------------------------------------------

        const fields = line.split(",");


        const latitude = parseCoordinate(
            fields[2],
            fields[3]
        );


        const longitude = parseCoordinate(
            fields[4],
            fields[5]
        );


        const quality = Number(
            fields[6]
        );


        const satellites = Number(
            fields[7]
        );


        const hdop = Number(
            fields[8]
        );


        const altitude = Number(
            fields[9]
        );


        // ----------------------------------------------
        // Fix type
        // ----------------------------------------------

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


        // ----------------------------------------------
        // Accuracy
        // ----------------------------------------------

        let accuracy = null;


        if (
            latestGST &&
            Number.isFinite(
                latestGST.latitudeError
            ) &&
            Number.isFinite(
                latestGST.longitudeError
            )
        ) {

            accuracy = Number(
                Math.max(
                    latestGST.latitudeError,
                    latestGST.longitudeError
                ).toFixed(2)
            );
        }


        // ----------------------------------------------
        // GNSS data
        // ----------------------------------------------

        const gnssData = {

            latitude,

            longitude,

            altitude,

            satellites,

            hdop,

            accuracy,

            fixType,

            connected: true,

            status: "connected",

            timestamp:
                new Date().toISOString(),
        };


        lastGNSSDataTime = Date.now();


        // ----------------------------------------------
        // Send to backend
        // ----------------------------------------------

        await sendToBackend(
            gnssData
        );
    });
}


// ======================================================
// NTRIP CONNECTION
// ======================================================

function connectNTRIP() {

    if (!serialConnected) {

        console.log(
            "Cannot connect to NTRIP: Reach RX is not connected."
        );

        return;
    }


    if (ntripSocket) {
        return;
    }


    console.log(
        "Connecting to NTRIP caster..."
    );


    ntripSocket = new net.Socket();

    headersReceived = false;


    ntripSocket.connect(
        NTRIP_PORT,
        NTRIP_HOST,
        () => {

            console.log(
                "Connected to NTRIP caster"
            );


            const credentials =
                Buffer
                    .from(
                        `${NTRIP_USERNAME}:${NTRIP_PASSWORD}`
                    )
                    .toString("base64");


            const request =
                `GET /${NTRIP_MOUNTPOINT} HTTP/1.0\r\n` +
                `Host: ${NTRIP_HOST}:${NTRIP_PORT}\r\n` +
                `User-Agent: NTRIP ReachRXBridge/1.0\r\n` +
                `Ntrip-Version: Ntrip/1.0\r\n` +
                `Accept: */*\r\n` +
                `Authorization: Basic ${credentials}\r\n` +
                `Connection: keep-alive\r\n\r\n`;


            console.log(
                "Sending NTRIP request:"
            );


            console.log(
                request.replace(
                    `Authorization: Basic ${credentials}`,
                    "Authorization: Basic [HIDDEN]"
                )
            );


            ntripSocket.write(
                request
            );


            // ------------------------------------------
            // Send initial GGA shortly after request
            // ------------------------------------------

            setTimeout(() => {

                if (
                    ntripSocket &&
                    !ntripSocket.destroyed &&
                    latestGGA
                ) {

                    console.log(
                        "Sending initial GGA to NTRIP caster:"
                    );

                    console.log(
                        latestGGA
                    );


                    ntripSocket.write(
                        latestGGA + "\r\n"
                    );
                }

            }, 500);
        }
    );


    // ==================================================
    // NTRIP DATA
    // ==================================================

    ntripSocket.on("data", (chunk) => {

        // ----------------------------------------------
        // Wait for NTRIP response
        // ----------------------------------------------

        if (!headersReceived) {

            // Keep collecting response data
            // until we know whether this is a
            // correction stream or an error.

            const text =
                chunk.toString("ascii");


            console.log(
                "NTRIP raw response:",
                text
            );


            // ------------------------------------------
            // Source table
            // ------------------------------------------

            if (
                text.includes("SOURCETABLE")
            ) {

                console.error(
                    "ERROR: Caster returned SOURCETABLE instead of the correction stream."
                );


                ntripSocket.destroy();

                return;
            }


            // ------------------------------------------
            // Authentication failure
            // ------------------------------------------

            if (
                text.includes("401") ||
                text.includes("403")
            ) {

                console.error(
                    "ERROR: NTRIP authentication rejected."
                );


                ntripSocket.destroy();

                return;
            }


            // ------------------------------------------
            // Successful NTRIP connection
            // ------------------------------------------

            if (
                text.includes("ICY 200") ||
                text.includes("HTTP/1.1 200") ||
                text.includes("HTTP/1.0 200")
            ) {

                console.log(
                    "NTRIP correction stream accepted."
                );


                headersReceived = true;

                ntripConnected = true;


                // --------------------------------------
                // Find end of HTTP/NTRIP headers
                // --------------------------------------

                const headerEnd =
                    chunk.indexOf(
                        Buffer.from("\r\n\r\n")
                    );


                if (headerEnd !== -1) {

                    const rtcmData =
                        chunk.subarray(
                            headerEnd + 4
                        );


                    if (
                        rtcmData.length > 0
                    ) {

                        writeRTCM(
                            rtcmData
                        );
                    }
                }


                return;
            }


            return;
        }


        // ----------------------------------------------
        // RTCM correction data
        // ----------------------------------------------

        writeRTCM(
            chunk
        );
    });


    // ==================================================
    // NTRIP ERROR
    // ==================================================

    ntripSocket.on("error", (err) => {

        ntripConnected = false;

        headersReceived = false;

        console.error(
            "NTRIP error:",
            err.message
        );
    });


    // ==================================================
    // NTRIP CLOSE
    // ==================================================

    ntripSocket.on("close", () => {

        ntripConnected = false;

        headersReceived = false;

        console.log(
            "NTRIP connection closed"
        );


        ntripSocket = null;
    });
}


// ======================================================
// WRITE RTCM TO REACH RX
// ======================================================

function writeRTCM(data) {

    if (
        !serialPort ||
        !serialPort.isOpen
    ) {

        console.error(
            "Cannot send RTCM: Reach RX serial port is not open."
        );

        return;
    }


    serialPort.write(
        data
    );


    rtcmBytes += data.length;


    console.log(
        `RTCM received: ${rtcmBytes} bytes`
    );
}


// ======================================================
// SEND GGA TO NTRIP CASTER
// ======================================================

function sendGGA() {

    if (
        !ntripSocket ||
        ntripSocket.destroyed ||
        !ntripConnected ||
        !latestGGA
    ) {

        return;
    }


    ntripSocket.write(
        latestGGA + "\r\n"
    );


    console.log(
        "GGA sent to NTRIP caster:"
    );


    console.log(
        latestGGA
    );
}


// ======================================================
// SEND GGA EVERY 10 SECONDS
// ======================================================

setInterval(() => {

    sendGGA();

}, 10000);


// ======================================================
// SEND GNSS DATA TO BACKEND
// ======================================================

async function sendToBackend(data) {

    if (!BACKEND_URL) {

        console.error(
            "BACKEND_URL is not configured."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/gnss`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify(
                            data
                        ),
                }
            );


        if (!response.ok) {

            console.error(
                "Backend error:",
                response.status
            );

            return;
        }


        console.log(
            "GNSS data sent to backend:",
            data
        );

    }
    catch (err) {

        console.error(
            "Backend connection error:",
            err.message
        );
    }
}


// ======================================================
// COORDINATE PARSER
// ======================================================

function parseCoordinate(
    value,
    direction
) {

    if (!value) {
        return null;
    }


    const raw =
        Number(value);


    if (
        Number.isNaN(raw)
    ) {

        return null;
    }


    const degrees =
        Math.floor(
            raw / 100
        );


    const minutes =
        raw -
        degrees * 100;


    let coordinate =
        degrees +
        minutes / 60;


    if (
        direction === "S" ||
        direction === "W"
    ) {

        coordinate *= -1;
    }


    return coordinate;
}


// ======================================================
// CONNECTION MONITOR
// ======================================================

setInterval(() => {

    if (!serialConnected) {
        return;
    }


    if (
        lastGNSSDataTime === 0
    ) {

        return;
    }


    const elapsed =
        Date.now() -
        lastGNSSDataTime;


    if (
        elapsed >
        DISCONNECT_TIMEOUT
    ) {

        console.log(
            "No GNSS data received from Reach RX."
        );
    }

}, 1000);


// ======================================================
// START
// ======================================================

connectSerial();