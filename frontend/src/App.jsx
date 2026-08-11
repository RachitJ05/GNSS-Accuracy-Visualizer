import { useEffect, useState, useRef } from "react";
import LoadingScreen from "./components/LoadingScreen";
import MapView from "./components/MapView";
import StatsPanel from "./components/StatsPanel";
import socket from "./services/socket";
import airtelLogo from "./assets/IOT_Logo.svg";

function App() {
  const [gnssData, setGnssData] = useState(null);
  const [recordedPath, setRecordedPath] = useState([]);

  const isRecordingRef = useRef(false);

  useEffect(() => {
    socket.on("gnss", (data) => {
      console.log("Frontend received:", data);

      setGnssData(data);

      // Only record the path while recording
      if (
        isRecordingRef.current &&
        data.latitude != null &&
        data.longitude != null
      ) {
        setRecordedPath((prev) => {
          const newPoint = [
            data.latitude,
            data.longitude,
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

          // Ignore extremely small movements
          // (~0.5 m or less)
          if (
            latDiff < 0.000005 &&
            lngDiff < 0.000005
          ) {
            return prev;
          }

          return [
            ...prev,
            newPoint,
          ];
        });
      }
    });

    return () => {
      socket.off("gnss");
    };
  }, []);

  function handleRecordingChange(recording) {
    isRecordingRef.current = recording;

    if (recording) {
      // Start a completely new path
      setRecordedPath([]);
    }
  }

  if (!gnssData) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">

      <MapView
        gnssData={gnssData}
        recordedPath={recordedPath}
      />

      <img
        src={airtelLogo}
        alt="Airtel"
        className="airtel-logo"
      />

      <StatsPanel
        gnssData={gnssData}
        onRecordingChange={handleRecordingChange}
      />

    </div>
  );
}

export default App;