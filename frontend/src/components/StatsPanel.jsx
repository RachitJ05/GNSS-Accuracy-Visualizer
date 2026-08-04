import { useEffect, useState } from "react";
import {
  FaLocationDot,
  FaSatelliteDish,
  FaBullseye,
  FaClock,
} from "react-icons/fa6";
import { MdGpsFixed } from "react-icons/md";

function StatsPanel({ gnssData }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [mobileShowMore, setMobileShowMore] = useState(false);
  const [recordStatus, setRecordStatus] = useState({
    recording: false,
    elapsed: 0,
    samples: 0,
  });
  const currentTime = gnssData.timestamp ? new Date(gnssData.timestamp).toLocaleTimeString() : "--";

  useEffect(() => {
    if (gnssData.connected) {
      setSecondsAgo(5);
      return;
    }
    const interval = setInterval(() => {
      if (!gnssData.timestamp) return;

      const elapsed = Math.floor(
        (Date.now() - new Date(gnssData.timestamp).getTime()) / 1000
      );
      setSecondsAgo(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [gnssData.connected, gnssData.timestamp]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/record/status`
        );
        const data = await response.json();
        setRecordStatus(data);
      }
      catch (err) {
        console.error(err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleResize(){
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener("resize", handleResize);
    return () =>
        window.removeEventListener("resize", handleResize);
  }, []);

  async function handleRecording() {
    if (recordStatus.recording) {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/record/stop`,
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (data.file) {
        window.open(
          import.meta.env.VITE_BACKEND_URL + data.file,
          "_blank"
        );
      }
    }
    else {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/record/start`,
        {
          method: "POST",
        }
      );
    }
  }

  const hours = String(
    Math.floor(recordStatus.elapsed / 3600)
  ).padStart(2, "0");

  const minutes = String(
    Math.floor((recordStatus.elapsed % 3600) / 60)
  ).padStart(2, "0");

  const seconds = String(
    recordStatus.elapsed % 60
  ).padStart(2, "0");

  if (!isMobile) {
    return (
        <div
        className="stats-panel"
        style={{
          opacity: gnssData.connected ? 1 : 0.7,
          transition: "0.3s ease",
        }}
      >
        <div className="stats-header">
          <div className="stats-title">
            <div className="stats-icon">
              <FaSatelliteDish />
            </div>

            <div>
              <h3>GNSS Information</h3>
              <span>Live Receiver Data</span>
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
              {secondsAgo} second{secondsAgo !== 1 ? "s" : ""} ago
            </div>
          </div>
        )}

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

            background: recordStatus.recording
              ? "#ef4444"
              : "#2563eb",

            color: "#fff",
          }}
        >
          {recordStatus.recording ? "⏹ Stop" : "⏺ Record"}
        </div>

        {
          recordStatus.recording && (
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

                {recordStatus.samples} Samples

              </div>
            </div>
          )
        }

        <div className="info-row">
          <div className="label">
            <FaLocationDot />
            Latitude
          </div>

          <span className="value">
            {gnssData.latitude?.toFixed(6) ?? "--"}
          </span>
        </div>

        <div className="info-row">
          <div className="label">
            <FaLocationDot />
            Longitude
          </div>

          <span className="value">
            {gnssData.longitude?.toFixed(6) ?? "--"}
          </span>
        </div>

        <div className="info-row">
          <div className="label">
            <FaBullseye />
            Accuracy
          </div>

          <span className="value">
            {gnssData.accuracy?.toFixed(2) ?? "--"} m
          </span>
        </div>

        <div className="info-row">
          <div className="label">
            <FaSatelliteDish />
            Satellites
          </div>

          <span className="value">
            {gnssData.satellites ?? "--"}
          </span>
        </div>

        <div className="info-row">
          <div className="label">
            <MdGpsFixed />
            HDOP
          </div>

          <span className="value">
            {gnssData.hdop ?? "--"}
          </span>
        </div>

        <div className="info-row">
          <div className="label">
            <MdGpsFixed />
            Fix Type
          </div>

          <span className="status">
            {gnssData.fixType ?? "--"}
          </span>
        </div>

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

  return (
    <div
      className="stats-panel mobile"
      style={{
        opacity: gnssData.connected ? 1 : 0.75,
        transition: "0.3s ease",
      }}
    >
      {/* Header */}

      <div
        className="mobile-stats-header"
        onClick={() => setMobileExpanded(!mobileExpanded)}
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
          {mobileExpanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded Content */}

      {mobileExpanded && (
        <>

          {/* Record Button */}

          <div
            onClick={handleRecording}
            style={{
              marginTop: "16px",
              padding: "11px",
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: "600",
              background: recordStatus.recording
                ? "#ef4444"
                : "#2563eb",
              color: "#fff",
              userSelect: "none",
            }}
          >
            {recordStatus.recording ? "⏹ Stop" : "⏺ Record"}
          </div>

          {/* Recording Status */}

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
              <div>🔴 Recording...</div>

              <div
                style={{
                  fontWeight: "600",
                }}
              >
                {hours}:{minutes}:{seconds}
              </div>

              <div>
                {recordStatus.samples} Samples
              </div>
            </div>
          )}

          {/* Important Information */}

          <div className="info-row">
            <div className="label">
              <FaLocationDot />
              Latitude
            </div>

            <span className="value">
              {gnssData.latitude?.toFixed(6) ?? "--"}
            </span>
          </div>

          <div className="info-row">
            <div className="label">
              <FaLocationDot />
              Longitude
            </div>

            <span className="value">
              {gnssData.longitude?.toFixed(6) ?? "--"}
            </span>
          </div>

          <div className="info-row">
            <div className="label">
              <FaBullseye />
              Accuracy
            </div>

            <span className="value">
              {gnssData.accuracy?.toFixed(2) ?? "--"} m
            </span>
          </div>

          {/* More Button */}

          <div
            onClick={() =>
              setMobileShowMore(!mobileShowMore)
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

          {/* Remaining Information */}

          {mobileShowMore && (
            <>

              <div className="info-row">
                <div className="label">
                  <FaSatelliteDish />
                  Satellites
                </div>

                <span className="value">
                  {gnssData.satellites ?? "--"}
                </span>
              </div>

              <div className="info-row">
                <div className="label">
                  <MdGpsFixed />
                  HDOP
                </div>

                <span className="value">
                  {gnssData.hdop ?? "--"}
                </span>
              </div>

              <div className="info-row">
                <div className="label">
                  <MdGpsFixed />
                  Fix Type
                </div>

                <span className="status">
                  {gnssData.fixType ?? "--"}
                </span>
              </div>

              <div className="info-row">
                <div className="label">
                  <FaClock />
                  Time
                </div>

                <span className="value">
                  {currentTime}
                </span>
              </div>

              {!gnssData.connected && (
                <div
                  style={{
                    marginTop: "14px",
                    textAlign: "center",
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  Last update {secondsAgo}s ago
                </div>
              )}

            </>
          )}

        </>
      )}
    </div>
  );
}

export default StatsPanel;