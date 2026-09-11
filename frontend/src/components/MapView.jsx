import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  ZoomControl,
  Polyline,
  Tooltip,
} from "react-leaflet";

import { useMemo, useState, useEffect } from "react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import LocationControl from "./LocationControl";
import MapStyleControl from "./MapStyleControl";

// ======================================================
// Fix Leaflet marker icon issue with Vite
// ======================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ======================================================
// Marker icons
// ======================================================

const qlmIcon = L.divIcon({
  className: "",
  html: `
    <div
      class="user-location"
      style="
        background:#2563eb;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "
    ></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const androidIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width:18px;
        height:18px;
        border-radius:50%;
        background:#ef4444;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        box-sizing:border-box;
      "
    ></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// ======================================================
// Fix map resize
// ======================================================

function FixMapResize() {
  const map = useMap();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => cancelAnimationFrame(id);
  }, [map]);

  return null;
}

// ======================================================
// Keep map centered on the primary position when it
// changes. The existing LocationControl can still be used
// independently.
// ======================================================

function FollowPrimaryPosition({ location }) {
  const map = useMap();

  useEffect(() => {
    if (
      !location ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lng)
    ) {
      return;
    }

    // Only move the map automatically if the user has not
    // deliberately zoomed/panned away from the current area.
    // This preserves the existing "live position" behavior
    // without constantly fighting manual map movement.
    map.panTo([location.lat, location.lng], {
      animate: false,
    });
  }, [map, location?.lat, location?.lng]);

  return null;
}

// ======================================================
// Haversine distance
// ======================================================

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

// ======================================================
// Format distance
// ======================================================

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "--";
  }

  if (meters < 1) {
    return `${meters.toFixed(2)} m`;
  }

  if (meters < 100) {
    return `${meters.toFixed(2)} m`;
  }

  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }

  return `${(meters / 1000).toFixed(3)} km`;
}

// ======================================================
// MapView
// ======================================================

function MapView({
  gnssData,
  qlmData,
  androidData,
  recordedPath,
  recordedAndroidPath,
}) {
  const [mapType, setMapType] =
    useState("street");

  // ====================================================
  // Valid positions
  // ====================================================

  const qlmPosition = useMemo(() => {
    if (
      qlmData?.latitude == null ||
      qlmData?.longitude == null ||
      !Number.isFinite(Number(qlmData.latitude)) ||
      !Number.isFinite(Number(qlmData.longitude))
    ) {
      return null;
    }

    return {
      lat: Number(qlmData.latitude),
      lng: Number(qlmData.longitude),
    };
  }, [
    qlmData?.latitude,
    qlmData?.longitude,
  ]);

  const androidPosition = useMemo(() => {
    if (
      androidData?.latitude == null ||
      androidData?.longitude == null ||
      !Number.isFinite(Number(androidData.latitude)) ||
      !Number.isFinite(Number(androidData.longitude))
    ) {
      return null;
    }

    return {
      lat: Number(androidData.latitude),
      lng: Number(androidData.longitude),
    };
  }, [
    androidData?.latitude,
    androidData?.longitude,
  ]);

  const primaryPosition =
    qlmPosition ?? androidPosition;

  // ====================================================
  // Live comparison
  // ====================================================

  const comparisonDistance = useMemo(() => {
    if (!qlmPosition || !androidPosition) {
      return null;
    }

    return distanceMeters(
      qlmPosition.lat,
      qlmPosition.lng,
      androidPosition.lat,
      androidPosition.lng
    );
  }, [
    qlmPosition,
    androidPosition,
  ]);

  const comparisonActive =
    qlmPosition != null &&
    androidPosition != null;

  // ====================================================
  // Initial map center
  // ====================================================

  const initialCenter = [
    primaryPosition?.lat ?? 0,
    primaryPosition?.lng ?? 0,
  ];

  return (
    <MapContainer
      center={initialCenter}
      zoom={18}
      zoomControl={false}
      maxZoom={19}
      minZoom={3}
      style={{
        height: "100%",
        width: "100%",
      }}
    >

      <FixMapResize />

      <FollowPrimaryPosition
        location={primaryPosition}
      />

      {/* ==================================================
          Map Tiles
      ================================================== */}

      <TileLayer
        maxNativeZoom={19}
        maxZoom={22}
        attribution={
          mapType === "street"
            ? "&copy; OpenStreetMap contributors"
            : "&copy; Esri"
        }
        url={
          mapType === "street"
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        }
      />

      {/* ==================================================
          Map Controls
      ================================================== */}

      <ZoomControl position="bottomleft" />

      <LocationControl
        location={primaryPosition}
      />

      <MapStyleControl
        mapType={mapType}
        setMapType={setMapType}
      />

      {/* ==================================================
          QLM29H + Phone PDR marker
      ================================================== */}

      {qlmPosition && (
        <Marker
          position={[
            qlmPosition.lat,
            qlmPosition.lng,
          ]}
          icon={qlmIcon}
        >
          <Tooltip
            direction="top"
            offset={[0, -10]}
          >
            QLM29H GNSS + Phone PDR
          </Tooltip>
        </Marker>
      )}

      {/* ==================================================
          QLM accuracy circle
      ================================================== */}

      {qlmPosition &&
        qlmData?.accuracy != null &&
        Number.isFinite(Number(qlmData.accuracy)) && (
          <Circle
            center={[
              qlmPosition.lat,
              qlmPosition.lng,
            ]}
            radius={Number(qlmData.accuracy)}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.2,
            }}
          />
        )}

      {/* ==================================================
          Android Location marker
      ================================================== */}

      {androidPosition && (
        <Marker
          position={[
            androidPosition.lat,
            androidPosition.lng,
          ]}
          icon={androidIcon}
        >
          <Tooltip
            direction="top"
            offset={[0, -10]}
          >
            Android Location
          </Tooltip>
        </Marker>
      )}

      {/* ==================================================
          Live comparison line
      ================================================== */}

      {comparisonActive && (
        <Polyline
          positions={[
            [
              qlmPosition.lat,
              qlmPosition.lng,
            ],
            [
              androidPosition.lat,
              androidPosition.lng,
            ],
          ]}
          pathOptions={{
            color: "#111827",
            weight: 3,
            opacity: 0.75,
            dashArray: "8, 8",
          }}
        />
      )}

      {/* ==================================================
          Live comparison information
      ================================================== */}

      {comparisonActive && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(255,255,255,0.96)",
            borderRadius: "12px",
            padding: "10px 16px",
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.20)",
            fontFamily:
              "Arial, sans-serif",
            textAlign: "center",
            pointerEvents: "none",
            minWidth: "170px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#555",
              marginBottom: "3px",
            }}
          >
            LIVE POSITION DIFFERENCE
          </div>

          <div
            style={{
              fontSize: "21px",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            {formatDistance(
              comparisonDistance
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "5px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#2563eb",
                  marginRight: "4px",
                }}
              />
              QLM/PDR
            </span>

            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  marginRight: "4px",
                }}
              />
              Android
            </span>
          </div>
        </div>
      )}

      {/* ==================================================
          QLM/PDR recorded trajectory
      ================================================== */}

      {recordedPath.length > 1 && (
        <Polyline
          positions={recordedPath}
          pathOptions={{
            color: "#2563eb",
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}

      {/* ==================================================
          Android recorded trajectory
      ================================================== */}

      {recordedAndroidPath.length > 1 && (
        <Polyline
          positions={recordedAndroidPath}
          pathOptions={{
            color: "#ef4444",
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}

    </MapContainer>
  );
}

export default MapView;
