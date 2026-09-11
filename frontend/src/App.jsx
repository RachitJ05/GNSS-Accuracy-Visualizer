import { useEffect, useRef, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import MapView from "./components/MapView";
import StatsPanel from "./components/StatsPanel";
import socket from "./services/socket";
import airtelLogo from "./assets/IOT_Logo.svg";

function App() {
  // ======================================================
  // Live position streams
  // ======================================================

  const [qlmData, setQlmData] = useState(null);
  const [androidData, setAndroidData] = useState(null);

  // The existing StatsPanel expects a single gnssData object.
  // Keep QLM/PDR as the primary data whenever it is available.
  const [gnssData, setGnssData] = useState(null);

  // ======================================================
  // Recorded trajectories
  // ======================================================

  const [recordedPath, setRecordedPath] = useState([]);
  const [recordedAndroidPath, setRecordedAndroidPath] = useState([]);

  const isRecordingRef = useRef(false);

  // ======================================================
  // Add a point to a recorded path
  // ======================================================

  function appendPoint(prev, data) {
    if (
      data?.latitude == null ||
      data?.longitude == null ||
      !Number.isFinite(Number(data.latitude)) ||
      !Number.isFinite(Number(data.longitude))
    ) {
      return prev;
    }

    const newPoint = [
      Number(data.latitude),
      Number(data.longitude),
    ];

    // First point
    if (prev.length === 0) {
      return [newPoint];
    }

    const lastPoint = prev[prev.length - 1];

    const latDiff = Math.abs(
      newPoint[0] - lastPoint[0]
    );

    const lngDiff = Math.abs(
      newPoint[1] - lastPoint[1]
    );

    // Ignore extremely small movements (~0.5 m or less)
    if (
      latDiff < 0.000005 &&
      lngDiff < 0.000005
    ) {
      return prev;
    }

    return [...prev, newPoint];
  }

  // ======================================================
  // Socket.IO
  // ======================================================

  useEffect(() => {
    function handleGnss(data) {
      console.log("Frontend received:", data);

      const isAndroid =
        data?.fixType === "Android Location";

      if (isAndroid) {
        // ----------------------------------------------
        // Android Location stream
        // ----------------------------------------------
        setAndroidData(data);

        if (isRecordingRef.current) {
          setRecordedAndroidPath((prev) =>
            appendPoint(prev, data)
          );
        }

        // Do not overwrite the QLM/PDR StatsPanel with
        // Android packets when both streams are active.
        setGnssData((current) => current ?? data);
      } else {
        // ----------------------------------------------
        // QLM29H GNSS + Phone PDR stream
        // ----------------------------------------------
        setQlmData(data);
        setGnssData(data);

        if (isRecordingRef.current) {
          setRecordedPath((prev) =>
            appendPoint(prev, data)
          );
        }
      }
    }

    socket.on("gnss", handleGnss);

    return () => {
      socket.off("gnss", handleGnss);
    };
  }, []);

  // ======================================================
  // Recording
  // ======================================================

  function handleRecordingChange(recording) {
    isRecordingRef.current = recording;

    if (recording) {
      // Start completely new trajectories for both streams.
      setRecordedPath([]);
      setRecordedAndroidPath([]);
    }
  }

  // ======================================================
  // Loading
  // ======================================================

  if (!gnssData && !qlmData && !androidData) {
    return <LoadingScreen />;
  }

  // Prefer QLM/PDR as the main map source. If it is not
  // available, use Android Location.
  const primaryData = qlmData ?? androidData;

  return (
    <div className="app">

      <MapView
        gnssData={primaryData}
        qlmData={qlmData}
        androidData={androidData}
        recordedPath={recordedPath}
        recordedAndroidPath={recordedAndroidPath}
      />

      <img
        src={airtelLogo}
        alt="Airtel"
        className="airtel-logo"
      />

      <StatsPanel
        gnssData={gnssData ?? primaryData}
        onRecordingChange={handleRecordingChange}
      />

    </div>
  );
}

export default App;
