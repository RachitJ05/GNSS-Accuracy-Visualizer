import { useEffect, useState } from "react";

import {
  FaLocationDot,
  FaSatelliteDish,
  FaBullseye,
  FaClock,
} from "react-icons/fa6";

import { MdGpsFixed } from "react-icons/md";


function StatsPanel({
  gnssData,
  onRecordingChange,
}) {

  const [secondsAgo, setSecondsAgo] = useState(0);

  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768
  );

  const [mobileExpanded, setMobileExpanded] =
    useState(false);

  const [mobileShowMore, setMobileShowMore] =
    useState(false);

  const [recordStatus, setRecordStatus] = useState({
    recording: false,
    elapsed: 0,
    samples: 0,
  });


  const currentTime = gnssData.timestamp
    ? new Date(
        gnssData.timestamp
      ).toLocaleTimeString()
    : "--";


  // ======================================================
  // Receiver disconnect timer
  // ======================================================

  useEffect(() => {

    if (gnssData.connected) {

      setSecondsAgo(5);

      return;
    }


    const interval = setInterval(() => {

      if (!gnssData.timestamp) {
        return;
      }


      const elapsed = Math.floor(
        (
          Date.now() -
          new Date(
            gnssData.timestamp
          ).getTime()
        ) / 1000
      );


      setSecondsAgo(elapsed);

    }, 1000);


    return () =>
      clearInterval(interval);

  }, [
    gnssData.connected,
    gnssData.timestamp,
  ]);


  // ======================================================
  // Recording status
  // ======================================================

  useEffect(() => {

    const interval = setInterval(
      async () => {

        try {

          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/record/status`
          );


          const data =
            await response.json();


          setRecordStatus(data);

        }
        catch (err) {

          console.error(
            "Recording status error:",
            err
          );

        }

      },
      1000
    );


    return () =>
      clearInterval(interval);

  }, []);


  // ======================================================
  // Mobile detection
  // ======================================================

  useEffect(() => {

    function handleResize() {

      setIsMobile(
        window.innerWidth <= 768
      );

    }


    window.addEventListener(
      "resize",
      handleResize
    );


    return () => {

      window.removeEventListener(
        "resize",
        handleResize
      );

    };

  }, []);


  // ======================================================
  // Start / Stop Recording
  // ======================================================

  async function handleRecording() {

    // ==================================================
    // STOP RECORDING
    // ==================================================

    if (recordStatus.recording) {

      try {

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/record/stop`,
          {
            method: "POST",
          }
        );


        if (!response.ok) {

          let message =
            "Failed to stop recording.";

          try {

            const errorData =
              await response.json();

            message =
              errorData.message ||
              message;

          }
          catch {
            // Response wasn't JSON
          }

          throw new Error(message);
        }


        // Get XLSX file

        const blob =
          await response.blob();


        // Get filename from backend

        const contentDisposition =
          response.headers.get(
            "Content-Disposition"
          );


        let filename =
          "GNSS_Recording.xlsx";


        if (contentDisposition) {

          const match =
            contentDisposition.match(
              /filename="([^"]+)"/
            );


          if (match) {
            filename = match[1];
          }

        }


        // Create download URL

        const url =
          window.URL.createObjectURL(
            blob
          );


        // Create download link

        const link =
          document.createElement("a");


        link.href = url;

        link.download = filename;


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);


        // Clean up

        window.URL.revokeObjectURL(url);


        // Stop map path recording

        onRecordingChange(false);

      }
      catch (err) {

        console.error(
          "Stop recording error:",
          err
        );


        alert(
          err.message ||
          "Failed to stop recording."
        );

      }


      return;
    }


    // ==================================================
    // START RECORDING
    // ==================================================

    try {

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/record/start`,
        {
          method: "POST",
        }
      );


      if (!response.ok) {

        throw new Error(
          "Failed to start recording."
        );

      }


      // Start a NEW map path

      onRecordingChange(true);

    }
    catch (err) {

      console.error(
        "Start recording error:",
        err
      );


      alert(
        err.message ||
        "Failed to start recording."
      );

    }
  }


  // ======================================================
  // Capture
  // ======================================================

  async function handleCapture() {

    if (
      gnssData.latitude == null ||
      gnssData.longitude == null
    ) {

      alert(
        "No valid GNSS position available."
      );

      return;
    }

    try {

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/capture`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(gnssData),
        }
      );


      if (!response.ok) {

        let message =
          "Failed to capture GNSS sample.";

        try {

          const errorData =
            await response.json();

          message =
            errorData.message ||
            message;

        } catch {
          // Response wasn't JSON
        }

        throw new Error(message);
      }


      // Get XLSX file

      const blob =
        await response.blob();


      // Get filename sent by backend

      const contentDisposition =
        response.headers.get(
          "Content-Disposition"
        );


      let filename =
        "GNSS_Capture.xlsx";


      if (contentDisposition) {

        const match =
          contentDisposition.match(
            /filename="([^"]+)"/
          );

        if (match) {
          filename = match[1];
        }
      }


      // Create temporary download URL

      const url =
        window.URL.createObjectURL(
          blob
        );


      // Create download link

      const link =
        document.createElement("a");

      link.href = url;

      link.download = filename;


      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);


      // Clean up

      window.URL.revokeObjectURL(url);


      console.log(
        "GNSS sample captured:",
        gnssData
      );

    }
    catch (err) {

      console.error(
        "Capture error:",
        err
      );

      alert(
        err.message ||
        "Failed to capture GNSS sample."
      );
    }
  }


  // ======================================================
  // Recording timer
  // ======================================================

  const hours = String(
    Math.floor(
      recordStatus.elapsed / 3600
    )
  ).padStart(2, "0");


  const minutes = String(
    Math.floor(
      (recordStatus.elapsed % 3600) / 60
    )
  ).padStart(2, "0");


  const seconds = String(
    recordStatus.elapsed % 60
  ).padStart(2, "0");


  // ======================================================
  // DESKTOP LAYOUT
  // ======================================================

  if (!isMobile) {

    return (

      <div
        className="stats-panel"
        style={{
          opacity:
            gnssData.connected
              ? 1
              : 0.7,

          transition:
            "0.3s ease",
        }}
      >

        {/* Header */}

        <div className="stats-header">

          <div className="stats-title">

            <div className="stats-icon">

              <FaSatelliteDish />

            </div>


            <div>

              <h3>
                GNSS Information
              </h3>

              <span>
                Live Receiver Data
              </span>

            </div>

          </div>

        </div>


        {/* Receiver Status */}

        <div
          style={{
            marginTop: "14px",
            marginBottom: "18px",
            padding: "12px",
            borderRadius: "10px",
            fontWeight: 600,
            textAlign: "center",

            background:
              gnssData.status === "connected"
                ? "#d1fae5"
                : "#fee2e2",

            color:
              gnssData.status === "connected"
                ? "#065f46"
                : "#991b1b",
          }}
        >

          {gnssData.status === "connected"
            ? "🟢 Receiver Connected"
            : "🔴 Receiver Disconnected"}

        </div>


        {/* Last update */}

        {!gnssData.connected && (

          <div
            style={{
              marginBottom: "18px",
              textAlign: "center",
              color: "#666",
              fontSize: "13px",
              lineHeight: "20px",
            }}
          >

            <div>
              Last update
            </div>

            <div
              style={{
                fontWeight: "600",
                marginTop: "4px",
              }}
            >

              {secondsAgo} second
              {secondsAgo !== 1 ? "s" : ""}
              {" "}ago

            </div>

          </div>

        )}


        {/* Record Button */}

        <div
          onClick={handleRecording}
          style={{
            marginTop: "14px",
            padding: "12px",
            borderRadius: "12px",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "600",
            fontSize: "16px",
            transition: "0.3s",
            userSelect: "none",

            background:
              recordStatus.recording
                ? "#ef4444"
                : "#2563eb",

            color: "#fff",
          }}
        >

          {recordStatus.recording
            ? "⏹ Stop"
            : "⏺ Record"}

        </div>


        {/* Capture */}

        <div
          onClick={handleCapture}
          style={{
            marginTop: "10px",
            padding: "12px",
            borderRadius: "12px",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "600",
            fontSize: "16px",
            transition: "0.3s",
            userSelect: "none",

            background: "#f3f4f6",
            color: "#2563eb",

            border: "1px solid #dbe3f0",
          }}
        >
          📷 Capture
        </div>


        {/* Recording information */}

        {recordStatus.recording && (

          <div
            style={{
              textAlign: "center",
              marginTop: "14px",
              marginBottom: "14px",
              color: "#555",
              fontSize: "14px",
              lineHeight: "24px",
            }}
          >

            <div>
              🔴 Recording...
            </div>

            <div
              style={{
                fontWeight: "600",
              }}
            >

              {hours}:{minutes}:{seconds}

            </div>

            <div>

              {recordStatus.samples}
              {" "}Samples

            </div>

          </div>

        )}


        {/* Latitude */}

        <div className="info-row">

          <div className="label">

            <FaLocationDot />

            Latitude

          </div>


          <span className="value">

            {gnssData.latitude?.toFixed(6) ?? "--"}

          </span>

        </div>


        {/* Longitude */}

        <div className="info-row">

          <div className="label">

            <FaLocationDot />

            Longitude

          </div>


          <span className="value">

            {gnssData.longitude?.toFixed(6) ?? "--"}

          </span>

        </div>


        {/* Accuracy */}

        <div className="info-row">

          <div className="label">

            <FaBullseye />

            Accuracy

          </div>


          <span className="value">

            {gnssData.accuracy?.toFixed(2) ?? "--"}
            {" "}m

          </span>

        </div>


        {/* Satellites */}

        <div className="info-row">

          <div className="label">

            <FaSatelliteDish />

            Satellites

          </div>


          <span className="value">

            {gnssData.satellites ?? "--"}

          </span>

        </div>


        {/* HDOP */}

        <div className="info-row">

          <div className="label">

            <MdGpsFixed />

            HDOP

          </div>


          <span className="value">

            {gnssData.hdop ?? "--"}

          </span>

        </div>


        {/* Fix Type */}

        <div className="info-row">

          <div className="label">

            <MdGpsFixed />

            Fix Type

          </div>


          <span className="status">

            {gnssData.fixType ?? "--"}

          </span>

        </div>


        {/* Time */}

        <div className="info-row">

          <div className="label">

            <FaClock />

            Time

          </div>


          <span className="value">

            {currentTime}

          </span>

        </div>

      </div>
    );
  }


  // ======================================================
  // MOBILE LAYOUT
  // ======================================================

  return (

    <div
      className="stats-panel mobile"
      style={{
        opacity:
          gnssData.connected
            ? 1
            : 0.75,

        transition:
          "0.3s ease",
      }}
    >

      {/* ==================================================
          Mobile Header
      ================================================== */}

      <div
        className="mobile-stats-header"
        onClick={() =>
          setMobileExpanded(
            !mobileExpanded
          )
        }
        style={{
          cursor: "pointer",
        }}
      >

        <div>

          <h3
            style={{
              margin: 0,
            }}
          >
            GNSS Information
          </h3>


          <span
            style={{
              fontSize: "13px",

              color:
                gnssData.connected
                  ? "#059669"
                  : "#dc2626",

              fontWeight: "600",
            }}
          >

            {gnssData.connected
              ? "🟢 Receiver Connected"
              : "🔴 Receiver Disconnected"}

          </span>

        </div>


        <div
          style={{
            fontSize: "18px",
            color: "#2563eb",
            fontWeight: "600",
          }}
        >

          {mobileExpanded
            ? "▲"
            : "▼"}

        </div>

      </div>


      {/* ==================================================
          Mobile Expanded Content
      ================================================== */}

      {mobileExpanded && (

        <>

          {/* ----------------------------------------------
              Record Button
          ---------------------------------------------- */}

          <div
            onClick={handleRecording}
            style={{
              marginTop: "16px",
              padding: "11px",
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: "600",

              background:
                recordStatus.recording
                  ? "#ef4444"
                  : "#2563eb",

              color: "#fff",
              userSelect: "none",
            }}
          >

            {recordStatus.recording
              ? "⏹ Stop"
              : "⏺ Record"}

          </div>


          {/* Capture Button */}

          <div
            onClick={handleCapture}
            style={{
              marginTop: "10px",
              padding: "11px",
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: "600",
              userSelect: "none",

              background: "#f3f4f6",
              color: "#2563eb",

              border: "1px solid #dbe3f0",
            }}
          >
            📷 Capture
          </div>


          {/* ----------------------------------------------
              Recording Status
          ---------------------------------------------- */}

          {recordStatus.recording && (

            <div
              style={{
                textAlign: "center",
                marginTop: "10px",
                marginBottom: "10px",
                color: "#555",
                fontSize: "13px",
                lineHeight: "22px",
              }}
            >

              <div>
                🔴 Recording...
              </div>

              <div
                style={{
                  fontWeight: "600",
                }}
              >

                {hours}:{minutes}:{seconds}

              </div>

              <div>

                {recordStatus.samples}
                {" "}Samples

              </div>

            </div>

          )}


          {/* ----------------------------------------------
              Latitude
          ---------------------------------------------- */}

          <div className="info-row">

            <div className="label">

              <FaLocationDot />

              Latitude

            </div>


            <span className="value">

              {gnssData.latitude?.toFixed(6) ?? "--"}

            </span>

          </div>


          {/* ----------------------------------------------
              Longitude
          ---------------------------------------------- */}

          <div className="info-row">

            <div className="label">

              <FaLocationDot />

              Longitude

            </div>


            <span className="value">

              {gnssData.longitude?.toFixed(6) ?? "--"}

            </span>

          </div>


          {/* ----------------------------------------------
              Accuracy
          ---------------------------------------------- */}

          <div className="info-row">

            <div className="label">

              <FaBullseye />

              Accuracy

            </div>


            <span className="value">

              {gnssData.accuracy?.toFixed(2) ?? "--"}
              {" "}m

            </span>

          </div>


          {/* ----------------------------------------------
              FIX TYPE - MOVED HERE
          ---------------------------------------------- */}

          <div className="info-row">

            <div className="label">

              <MdGpsFixed />

              Fix Type

            </div>


            <span className="status">

              {gnssData.fixType ?? "--"}

            </span>

          </div>


          {/* ----------------------------------------------
              Show More
          ---------------------------------------------- */}

          <div
            onClick={() =>
              setMobileShowMore(
                !mobileShowMore
              )
            }
            style={{
              marginTop: "14px",
              marginBottom: "6px",
              textAlign: "center",
              color: "#2563eb",
              fontWeight: "600",
              cursor: "pointer",
              userSelect: "none",
            }}
          >

            {mobileShowMore
              ? "Show Less ▲"
              : "Show More ▼"}

          </div>


          {/* ----------------------------------------------
              Remaining Information
              ----------------------------------------------

              Only these three are hidden initially:
              Satellites
              HDOP
              Time

          ---------------------------------------------- */}

          {mobileShowMore && (

            <>

              {/* Satellites */}

              <div className="info-row">

                <div className="label">

                  <FaSatelliteDish />

                  Satellites

                </div>


                <span className="value">

                  {gnssData.satellites ?? "--"}

                </span>

              </div>


              {/* HDOP */}

              <div className="info-row">

                <div className="label">

                  <MdGpsFixed />

                  HDOP

                </div>


                <span className="value">

                  {gnssData.hdop ?? "--"}

                </span>

              </div>


              {/* Time */}

              <div className="info-row">

                <div className="label">

                  <FaClock />

                  Time

                </div>


                <span className="value">

                  {currentTime}

                </span>

              </div>

            </>

          )}

        </>

      )}

    </div>
  );
}


export default StatsPanel;