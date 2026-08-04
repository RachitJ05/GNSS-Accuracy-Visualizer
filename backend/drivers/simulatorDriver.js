const modes = {
  standard: {
    accuracy: 12,
    satellites: 18,
    hdop: 1.2,
  },

  sbas: {
    accuracy: 4,
    satellites: 20,
    hdop: 0.8,
  },

  dgnss: {
    accuracy: 1.5,
    satellites: 22,
    hdop: 0.6,
  },

  rtkFloat: {
    accuracy: 0.4,
    satellites: 24,
    hdop: 0.3,
  },

  rtkFixed: {
    accuracy: 0.02,
    satellites: 28,
    hdop: 0.1,
  },

  ppp: {
    accuracy: 0.15,
    satellites: 26,
    hdop: 0.2,
  },
};

let receiverState = {
  connected: true,
  status: "3D Fix",
  fixType: "3D",
  correctionStatus: "None",
  satellites: 18,
  hdop: 1.2,
  accuracy: 12,
  uptime: 0,
};

let currentMode = "standard";

const SIMULATE_MOVEMENT = true;
let latitude = 28.490642254295235;
let longitude = 77.07941202501088;

class SimulatorDriver {
  connect() {
    console.log("✅ Simulator Driver Connected");
  }

  disconnect() {
    console.log("❌ Simulator Driver Disconnected");
  }

  getData() {
    if (SIMULATE_MOVEMENT) {
      latitude += (Math.random() - 0.5) * 0.000005;
      longitude += (Math.random() - 0.5) * 0.000005;
    }
    this.updateReceiver();
    
    return {
      latitude,
      longitude,
      mode: currentMode,
      accuracy: receiverState.accuracy,
      satellites: receiverState.satellites,
      hdop: receiverState.hdop,
      fixType: receiverState.fixType,
      status: receiverState.status,
      correctionStatus: receiverState.correctionStatus,
      connected: receiverState.connected,
      timestamp: new Date().toISOString(),
    };
  }

  setMode(mode) {
    currentMode = mode;
  }

  updateReceiver() {
    receiverState.uptime++;

    switch(currentMode){
      case "standard":
        receiverState.accuracy=12;
        receiverState.hdop=1.2;
        receiverState.satellites=18;
        receiverState.fixType="3D";
        receiverState.status="Standard GNSS";
        receiverState.correctionStatus="None";
        break;

      case "sbas":
        receiverState.accuracy=4;
        receiverState.hdop=0.8;
        receiverState.satellites=20;
        receiverState.status="SBAS";
        receiverState.correctionStatus="SBAS";
        break;

      case "dgnss":
        receiverState.accuracy=1.5;
        receiverState.hdop=0.6;
        receiverState.satellites=22;
        receiverState.status="DGNSS";
        receiverState.correctionStatus="Differential";
        break;

      case "rtkFloat":
        receiverState.accuracy=0.4;
        receiverState.hdop=0.3;
        receiverState.satellites=24;
        receiverState.status="RTK Float";
        receiverState.correctionStatus="Corrections";
        break;

      case "rtkFixed":
        receiverState.accuracy=0.02;
        receiverState.hdop=0.1;
        receiverState.satellites=28;
        receiverState.status="RTK Fixed";
        receiverState.correctionStatus="RTCM";
        break;

      case "ppp":
        receiverState.accuracy=0.15;
        receiverState.hdop=0.2;
        receiverState.satellites=26;
        receiverState.status="PPP";
        receiverState.correctionStatus="PPP";
        break;
    }
  }
}

export default SimulatorDriver;