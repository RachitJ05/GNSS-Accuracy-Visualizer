import fs from "fs";
import path from "path";

let recording = false;

let stream = null;

let samples = 0;

let startedAt = null;

let currentFile = "";

const recordingsFolder = path.join(process.cwd(), "recordings");

if (!fs.existsSync(recordingsFolder)) {
    fs.mkdirSync(recordingsFolder);
}

export function startRecording() {

    if (recording)
        return;

    const filename =
        "GNSS_" +
        new Date()
            .toISOString()
            .replace(/:/g, "-")
            .replace(/\..+/, "") +
        ".csv";

    currentFile = path.join(
        recordingsFolder,
        filename
    );

    stream = fs.createWriteStream(currentFile);

    stream.write(
        "Timestamp,Latitude,Longitude,Accuracy,Satellites,HDOP,FixType,Mode,Connected\n"
    );

    recording = true;

    samples = 0;

    startedAt = Date.now();

}

export function stopRecording() {

    if (!recording)
        return null;

    recording = false;

    stream.end();

    return "/recordings/"+path.basename(currentFile);

}

export function appendRecord(data) {

    if (!recording)
        return;

    stream.write(
        `${data.timestamp},${data.latitude},${data.longitude},${data.accuracy},${data.satellites},${data.hdop},${data.fixType},${data.mode},${data.connected}\n`
    );

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