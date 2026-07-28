import { useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import "./components/ControlPanel.css";
import StatsPanel from "./components/StatsPanel";
import { gnssModes } from "./data/mockData";
import socket from "./services/socket";

function App() {
  const [gnssData, setGnssData] = useState(null);

  useEffect(() => {
    socket.on("gnss", (data) => {
      console.log("Frontend received:", data);
      setGnssData(data);
    });

    return () => {
        socket.off("gnss");
    };
  }, []);

  if (!gnssData) {
    return (
      <LoadingScreen/>
    );
  }

  return (
    <div className="app">
      <MapView gnssData={gnssData} />

      <ControlPanel
        modes={gnssModes}
        currentMode={gnssData.mode}
      />

      <StatsPanel gnssData={gnssData} />
    </div>
  );
}

export default App;