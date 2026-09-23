import { useEffect, useState } from "react";
import CameraOverlay from "./CameraOverlay";

function StatsPanel({
  gnssData,
  qlmData,
  androidData,
  onRecordingChange,
}) {
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768
  );

  const [recordStatus, setRecordStatus] = useState({
    recording: false,
    elapsed: 0,
    samples: 0,
  });

  // ======================================================
  // RESPONSIVE
  // ======================================================

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ======================================================
  // RECORDING STATUS
  // ======================================================

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/record/status`
        );

        const data = await response.json();

        setRecordStatus(data);
      } catch (err) {
        console.error("Recording status error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ======================================================
  // DOWNLOAD XLSX
  // ======================================================

  async function downloadXlsx(blob, filename) {
    if (
      isMobile &&
      navigator.share &&
      navigator.canShare
    ) {
      try {
        const file = new File(
          [blob],
          filename,
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

        if (
          navigator.canShare({
            files: [file],
          })
        ) {
          await navigator.share({
            title: filename,
            files: [file],
          });

          return true;
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          return false;
        }

        console.error(
          "Mobile file share error:",
          err
        );
      }
    }

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    return true;
  }

  // ======================================================
  // RECORDING
  // ======================================================

  async function handleRecording() {
    // --------------------------------------------------
    // STOP
    // --------------------------------------------------

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
          } catch {
            // Not JSON
          }

          throw new Error(message);
        }

        const blob = await response.blob();

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

        await downloadXlsx(
          blob,
          filename
        );

        onRecordingChange(false);
      } catch (err) {
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

    // --------------------------------------------------
    // START
    // --------------------------------------------------

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

      onRecordingChange(true);
    } catch (err) {
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
  // CAPTURE
  // ======================================================

  async function handleCapture() {
    if (
      !gnssData ||
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
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            gnssData
          ),
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
          // Not JSON
        }

        throw new Error(message);
      }

      const blob = await response.blob();

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

      await downloadXlsx(
        blob,
        filename
      );
    } catch (err) {
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
  // RECORDING TIME
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
  // DATA CARD
  // ======================================================

  function DataCard({
    data,
    title,
    dotColor,
  }) {
    if (!data) {
      return null;
    }

    const currentTime = data.timestamp
      ? new Date(
          data.timestamp
        ).toLocaleTimeString()
      : "--";

    return (
      <div
        style={{
          width: "66%",
          boxSizing: "border-box",

          padding: isMobile
            ? "8px 10px"
            : "12px",

          borderRadius: isMobile
            ? "12px"
            : "14px",

          background:
            "rgba(255, 255, 255, 0.88)",

          backdropFilter: "blur(8px)",
          WebkitBackdropFilter:
            "blur(8px)",

          boxShadow:
            "0 2px 10px rgba(0,0,0,0.18)",

          border:
            "1px solid rgba(255,255,255,0.75)",
        }}
      >
        {/* Source */}

        <div
          style={{
            display: "flex",
            alignItems: "center",

            gap: "7px",

            marginBottom: isMobile
              ? "4px"
              : "7px",

            fontSize: isMobile
              ? "14px"
              : "16px",

            fontWeight: "600",

            color: "#1f2937",
          }}
        >
          <span
            style={{
              width: isMobile
                ? "9px"
                : "10px",

              height: isMobile
                ? "9px"
                : "10px",

              borderRadius: "50%",

              background: dotColor,

              flexShrink: 0,
            }}
          />

          {title}
        </div>

        {/* Latitude */}

        <div className="compact-stat-row">
          <span>Lat:</span>

          <strong>
            {Number.isFinite(
              Number(data.latitude)
            )
              ? Number(
                  data.latitude
                ).toFixed(6)
              : "--"}
          </strong>
        </div>

        {/* Longitude */}

        <div className="compact-stat-row">
          <span>Lon:</span>

          <strong>
            {Number.isFinite(
              Number(data.longitude)
            )
              ? Number(
                  data.longitude
                ).toFixed(6)
              : "--"}
          </strong>
        </div>

        {/* Horizontal Accuracy */}

        <div className="compact-stat-row">
          <span>H Acc:</span>

          <strong>
            {data.accuracy != null &&
            Number.isFinite(
              Number(data.accuracy)
            )
              ? `${Number(
                  data.accuracy
                ).toFixed(3)} m`
              : "--"}
          </strong>
        </div>

        {/* Fix Type */}

        <div className="compact-stat-row">
          <span>Fix:</span>

          <strong
            style={{
              color:
                data.fixType ===
                "RTK Fixed"
                  ? "#059669"
                  : "#2563eb",
            }}
          >
            {data.fixType ?? "--"}
          </strong>
        </div>

        {/* Time */}

        <div
          className="compact-stat-row"
          style={{
            borderBottom: "none",
          }}
        >
          <span>Time:</span>

          <strong>
            {currentTime}
          </strong>
        </div>
      </div>
    );
  }

  // ======================================================
  // MOBILE
  // ======================================================

  if (isMobile) {
    
    const firstData =
      androidData ??
      qlmData ??
      gnssData;

    const secondData =
      androidData
        ? qlmData
        : null;

    return (
      <>
      <CameraOverlay />
        <style>
          {`
            .compact-stat-row {
              display: flex;
              align-items: center;
              justify-content: space-between;

              min-height: 21px;

              padding: 1px 0;

              border-bottom:
                1px solid rgba(0,0,0,0.08);

              font-size: 12px;

              color: #4b5563;

              gap: 8px;
            }

            .compact-stat-row strong {
              color: #2563eb;
              font-weight: 600;
              text-align: right;
              white-space: nowrap;
            }
          `}
        </style>

        {/* ==================================================
            MOBILE TOP STATS
        ================================================== */}

        <div
          style={{
            position: "fixed",

            top: "65px",

            left: "12px",

            width:
              "min(235px, calc(100vw - 24px))",

            zIndex: 1500,

            display: "flex",
            flexDirection: "column",

            gap: "7px",
          }}
        >
          {/* First Source */}

          {firstData && (
            <DataCard
              data={firstData}
              title={
                androidData
                  ? "Android Location"
                  : "Quectel GNSS"
              }
              dotColor={
                androidData
                  ? "#ef4444"
                  : "#2563eb"
              }
            />
          )}

          {/* Second Source */}

          {secondData && (
            <DataCard
              data={secondData}
              title="QLM29H GNSS"
              dotColor="#2563eb"
            />
          )}
        </div>

        {/* ==================================================
            MOBILE BOTTOM CONTROLS
        ================================================== */}

        <div
          style={{
            position: "fixed",

            bottom:
              "calc(env(safe-area-inset-bottom, 0px) + 18px)",

            left: "50%",

            transform:
              "translateX(-50%)",

            width:
              "min(200px, calc(100vw - 40px))",

            display: "flex",

            gap: "8px",

            zIndex: 1600,
          }}
        >
          {/* Record / Stop */}

          <div
            onClick={
              handleRecording
            }
            style={{
              flex: 1,

              height: "40px",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              borderRadius: "10px",

              cursor: "pointer",
              userSelect: "none",

              fontSize: "14px",
              fontWeight: "600",

              color: "#fff",

              background:
                recordStatus.recording
                  ? "#ef4444"
                  : "#2563eb",

              boxShadow:
                "0 2px 8px rgba(0,0,0,0.22)",
            }}
          >
            {recordStatus.recording
              ? "Stop"
              : "Record"}
          </div>

          {/* Capture */}

          <div
            onClick={
              handleCapture
            }
            style={{
              flex: 1,

              height: "40px",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              borderRadius: "10px",

              cursor: "pointer",
              userSelect: "none",

              fontSize: "14px",
              fontWeight: "600",

              color: "#2563eb",

              background:
                "rgba(255,255,255,0.94)",

              border:
                "1px solid rgba(255,255,255,0.95)",

              boxShadow:
                "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            Capture
          </div>
        </div>

        {/* ==================================================
            MOBILE RECORDING STATUS
        ================================================== */}

        {recordStatus.recording && (
          <div
            style={{
              position: "fixed",

              bottom:
                "calc(env(safe-area-inset-bottom, 0px) + 64px)",

              left: "50%",

              transform:
                "translateX(-50%)",

              zIndex: 1600,

              background:
                "rgba(255,255,255,0.92)",

              borderRadius: "8px",

              padding: "3px 9px",

              textAlign: "center",

              fontSize: "10px",

              color: "#555",

              boxShadow:
                "0 1px 5px rgba(0,0,0,0.15)",

              whiteSpace: "nowrap",
            }}
          >
            🔴 {hours}:{minutes}:{seconds}
            {" • "}
            {recordStatus.samples} samples
          </div>
        )}
      </>
    );
  }

  // ======================================================
  // DESKTOP
  // ======================================================

  const desktopData =
    gnssData ??
    qlmData ??
    androidData;

  return (
    <div
      style={{
        position: "fixed",

        top: "20px",
        right: "0px",

        width: "300px",

        zIndex: 1500,

        display: "flex",
        flexDirection: "column",

        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          width: "60%",
        }}
      >
        <div
          onClick={
            handleRecording
          }
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "9px",

            textAlign: "center",

            cursor: "pointer",

            background:
              recordStatus.recording
                ? "#ef4444"
                : "#2563eb",

            color: "#fff",
            fontWeight: "600",
          }}
        >
          {recordStatus.recording
            ? "■ Stop"
            : "● Record"}
        </div>

        <div
          onClick={
            handleCapture
          }
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "9px",

            textAlign: "center",

            cursor: "pointer",

            background: "#fff",
            color: "#2563eb",

            fontWeight: "600",

            border:
              "1px solid #dbe3f0",
          }}
        >
          Capture
        </div>
      </div>

      <DataCard
        data={desktopData}
        title={
          desktopData?.fixType ===
          "Android Location"
            ? "Android Location"
            : "QLM29H GNSS"
        }
        dotColor="#2563eb"
      />
    </div>
  );
}

export default StatsPanel;