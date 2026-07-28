export const gnssModes = {

    standard: {
        name: "Standard GNSS",
        accuracy: 12,
        satellites: 18,
        hdop: 1.2
    },

    sbas: {
        name: "SBAS",
        accuracy: 4,
        satellites: 20,
        hdop: 0.9
    },

    dgnss: {
        name: "DGNSS",
        accuracy: 1.5,
        satellites: 22,
        hdop: 0.6
    },

    rtkFloat: {
        name: "RTK Float",
        accuracy: 0.5,
        satellites: 24,
        hdop: 0.3
    },

    rtkFixed: {
        name: "RTK Fixed",
        accuracy: 0.02,
        satellites: 28,
        hdop: 0.1
    },

    ppp: {
        name: "PPP",
        accuracy: 0.15,
        satellites: 26,
        hdop: 0.2
    }

}

export const initialLocation = {

    lat: 28.6139,

    lng: 77.2090

}