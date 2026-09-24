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

import {
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-rotate";

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
  className: "qlm-direction-marker",

  html: `
    <div
      class="qlm-direction-cone"
      style="
        position:absolute;
        left:50%;
        top:50%;
        width:100px;
        height:145px;
        transform:translate(-50%, -100%) rotate(0deg);
        transform-origin:50% 100%;
        pointer-events:none;
        z-index:0;

        background:linear-gradient(
          to top,
          rgba(37,99,235,0.08) 0%,
          rgba(37,99,235,0.16) 38%,
          rgba(37,99,235,0.24) 100%
        );

        clip-path:polygon(
          50% 100%,
          100% 0%,
          0% 0%
        );

        opacity:0;
      "
    ></div>

    <div
      class="user-location"
      style="
        position:absolute;
        left:50%;
        top:50%;
        width:18px;
        height:18px;
        transform:translate(-50%, -50%);
        box-sizing:border-box;
        background:#2563eb;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        z-index:2;
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
// Keep map centered on primary position
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

    map.panTo([location.lat, location.lng], {
      animate: false,
    });
  }, [
    map,
    location?.lat,
    location?.lng,
  ]);

  return null;
}

// ======================================================
// Direction cone / phone compass
//
// The cone is:
// - narrow at the blue marker
// - wide at the far end
// - pointed in the direction the phone is facing
// - corrected for the current leaflet-rotate map bearing
// ======================================================

function DirectionConeController({ markerRef }) {
  const map = useMap();

  const headingRef = useRef(null);

  useEffect(() => {
    const updateCone = () => {
      const marker = markerRef.current;

      if (!marker) {
        return;
      }

      const markerElement =
        marker.getElement();

      if (!markerElement) {
        return;
      }

      const cone =
        markerElement.querySelector(
          ".qlm-direction-cone"
        );

      if (!cone) {
        return;
      }

      const phoneHeading =
        headingRef.current;

      if (!Number.isFinite(phoneHeading)) {
        return;
      }

      let mapBearing = 0;

      if (
        typeof map.getBearing ===
        "function"
      ) {
        mapBearing =
          Number(map.getBearing()) || 0;
      }

      /*
       * Phone heading:
       *
       * 0   = North
       * 90  = East
       * 180 = South
       * 270 = West
       *
       * The cone itself points straight UP
       * at 0 degrees, so we rotate it by:
       *
       * phone heading - map bearing
       *
       * This keeps the cone aligned with the
       * phone's real-world facing direction
       * even when the Leaflet map is rotated.
       */

      const relativeHeading =
        phoneHeading - mapBearing;

      cone.style.transform =
        `translate(-50%, -100%) rotate(${relativeHeading}deg)`;

      cone.style.opacity = "1";
    };

    const normalizeHeading = (
      heading
    ) => {
      let value =
        Number(heading);

      if (!Number.isFinite(value)) {
        return null;
      }

      value =
        value % 360;

      if (value < 0) {
        value += 360;
      }

      return value;
    };

    const handleOrientation = (
      event
    ) => {
      let heading = null;

      /*
       * iOS Safari provides webkitCompassHeading.
       * It is already a compass heading where:
       * 0 = North, 90 = East.
       */

      if (
        Number.isFinite(
          Number(
            event.webkitCompassHeading
          )
        )
      ) {
        heading =
          Number(
            event.webkitCompassHeading
          );
      } else if (
        event.absolute === true
      ) {
        /*
         * Android absolute orientation:
         * alpha is used as the absolute heading.
         */
        heading =
          Number(event.alpha);
      } else if (
        Number.isFinite(
          Number(event.alpha)
        )
      ) {
        /*
         * Fallback for browsers which
         * expose only deviceorientation.
         */
        heading =
          Number(event.alpha);

        /*
         * For non-absolute browsers,
         * convert the alpha convention to
         * a compass-like clockwise heading.
         */
        heading =
          360 - heading;
      }

      /*
       * Android/device orientation can be
       * affected by the current screen
       * orientation. Apply the same correction
       * used by leaflet-rotate.
       */

      if (
        heading != null &&
        typeof window.orientation ===
          "number"
      ) {
        heading +=
          Number(window.orientation);
      }

      heading =
        normalizeHeading(heading);

      if (heading == null) {
        return;
      }

      headingRef.current =
        heading;

      updateCone();
    };

    const handleMapRotate = () => {
      updateCone();
    };

    const handleMapResize = () => {
      updateCone();
    };

    /*
     * Prefer the absolute orientation
     * event on Android when available.
     */
    let orientationEvent =
      "deviceorientation";

    if (
      "ondeviceorientationabsolute" in
      window
    ) {
      orientationEvent =
        "deviceorientationabsolute";
    }

    window.addEventListener(
      orientationEvent,
      handleOrientation,
      true
    );

    /*
     * Fallback listener. Some Android
     * WebViews expose deviceorientation
     * differently.
     */
    if (
      orientationEvent !==
      "deviceorientation"
    ) {
      window.addEventListener(
        "deviceorientation",
        handleOrientation,
        true
      );
    }

    map.on(
      "rotate",
      handleMapRotate
    );

    map.on(
      "resize",
      handleMapResize
    );

    /*
     * iOS requires permission from a
     * user gesture. The leaflet-rotate
     * compass button is that gesture.
     */
    const requestOrientationPermission =
      async () => {
        try {
          if (
            typeof DeviceOrientationEvent !==
              "undefined" &&
            typeof DeviceOrientationEvent
              .requestPermission ===
              "function"
          ) {
            const result =
              await DeviceOrientationEvent
                .requestPermission();

            if (
              result === "granted"
            ) {
              window.addEventListener(
                "deviceorientation",
                handleOrientation,
                true
              );
            }
          }
        } catch (error) {
          console.warn(
            "Device orientation permission request failed:",
            error
          );
        }
      };

    const compassButton =
      document.querySelector(
        ".leaflet-control-rotate-toggle"
      );

    if (compassButton) {
      compassButton.addEventListener(
        "click",
        requestOrientationPermission
      );
    }

    /*
     * Give the cone one final update after
     * the marker has been mounted.
     */
    const initialUpdate =
      requestAnimationFrame(() => {
        updateCone();
      });

    return () => {
      cancelAnimationFrame(
        initialUpdate
      );

      window.removeEventListener(
        orientationEvent,
        handleOrientation,
        true
      );

      if (
        orientationEvent !==
        "deviceorientation"
      ) {
        window.removeEventListener(
          "deviceorientation",
          handleOrientation,
          true
        );
      }

      map.off(
        "rotate",
        handleMapRotate
      );

      map.off(
        "resize",
        handleMapResize
      );

      if (compassButton) {
        compassButton.removeEventListener(
          "click",
          requestOrientationPermission
        );
      }
    };
  }, [map, markerRef]);

  return null;
}

// ======================================================
// Haversine distance
// ======================================================

function distanceMeters(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371000;

  const toRadians = (
    degrees
  ) =>
    (degrees * Math.PI) / 180;

  const dLat =
    toRadians(
      lat2 - lat1
    );

  const dLon =
    toRadians(
      lon2 - lon1
    );

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      toRadians(lat1)
    ) *
      Math.cos(
        toRadians(lat2)
      ) *
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

function formatDistance(
  meters
) {
  if (
    !Number.isFinite(meters)
  ) {
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

  return `${(
    meters / 1000
  ).toFixed(3)} km`;
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
  const [
    mapType,
    setMapType,
  ] = useState("street");

  const qlmMarkerRef =
    useRef(null);

  // ====================================================
  // Valid positions
  // ====================================================

  const qlmPosition =
    useMemo(() => {
      if (
        qlmData?.latitude == null ||
        qlmData?.longitude == null ||
        !Number.isFinite(
          Number(
            qlmData.latitude
          )
        ) ||
        !Number.isFinite(
          Number(
            qlmData.longitude
          )
        )
      ) {
        return null;
      }

      return {
        lat: Number(
          qlmData.latitude
        ),
        lng: Number(
          qlmData.longitude
        ),
      };
    }, [
      qlmData?.latitude,
      qlmData?.longitude,
    ]);

  const androidPosition =
    useMemo(() => {
      if (
        androidData?.latitude ==
          null ||
        androidData?.longitude ==
          null ||
        !Number.isFinite(
          Number(
            androidData.latitude
          )
        ) ||
        !Number.isFinite(
          Number(
            androidData.longitude
          )
        )
      ) {
        return null;
      }

      return {
        lat: Number(
          androidData.latitude
        ),
        lng: Number(
          androidData.longitude
        ),
      };
    }, [
      androidData?.latitude,
      androidData?.longitude,
    ]);

  const primaryPosition =
    qlmPosition ??
    androidPosition;

  // ====================================================
  // Live comparison
  // ====================================================

  const comparisonDistance =
    useMemo(() => {
      if (
        !qlmPosition ||
        !androidPosition
      ) {
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

  // Keep these calculated values available
  // exactly as before.
  void gnssData;
  void comparisonDistance;
  void formatDistance;

  // ====================================================
  // Initial map center
  // ====================================================

  const initialCenter = [
    primaryPosition?.lat ??
      0,
    primaryPosition?.lng ??
      0,
  ];

  return (
    <>
      <style>
        {`
          /*
           * The direction cone must be allowed
           * to extend outside the 18x18 marker.
           */
          .qlm-direction-marker {
            overflow: visible !important;
          }

          .qlm-direction-marker
          .qlm-direction-cone {
            pointer-events: none !important;
          }

          /*
           * Keep the leaflet-rotate compass
           * directly to the right of the existing
           * current-location button.
           */
          .leaflet-bottom.leaflet-left
          .leaflet-control-rotate {
            position: absolute !important;
            left: 42px !important;
            bottom: 34px !important;
            margin: 0 !important;
            float: none !important;
            clear: none !important;
            z-index: 1002 !important;
          }

          .leaflet-control-rotate {
            z-index: 1002 !important;
          }
        `}
      </style>

      <MapContainer
        center={initialCenter}
        zoom={18}

        /*
         * Keep the normal Leaflet zoom control
         * disabled because we're rendering our
         * own ZoomControl.
         */
        zoomControl={false}

        maxZoom={19}
        minZoom={3}

        /*
         * ==================================================
         * MAP ROTATION
         * ==================================================
         */

        rotate={true}
        touchRotate={true}
        touchZoom={true}

        /*
         * Put the leaflet-rotate compass into
         * the bottom-left control group.
         */
        rotateControl={{
          position: "bottomleft",
          closeOnZeroBearing: false,
        }}

        dragging={true}

        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <FixMapResize />

        <FollowPrimaryPosition
          location={
            primaryPosition
          }
        />

        <DirectionConeController
          markerRef={
            qlmMarkerRef
          }
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

        <ZoomControl
          position="bottomleft"
        />

        <LocationControl
          location={
            primaryPosition
          }
        />

        <MapStyleControl
          mapType={mapType}
          setMapType={
            setMapType
          }
        />

        {/* ==================================================
            QLM29H + Phone PDR marker
        ================================================== */}

        {qlmPosition && (
          <Marker
            ref={qlmMarkerRef}
            position={[
              qlmPosition.lat,
              qlmPosition.lng,
            ]}
            icon={qlmIcon}
          >
            <Tooltip
              direction="top"
              offset={[
                0,
                -10,
              ]}
            >
              QLM29H GNSS + Phone PDR
            </Tooltip>
          </Marker>
        )}

        {/* ==================================================
            QLM accuracy circle
        ================================================== */}

        {qlmPosition &&
          qlmData?.accuracy !=
            null &&
          Number.isFinite(
            Number(
              qlmData.accuracy
            )
          ) && (
            <Circle
              center={[
                qlmPosition.lat,
                qlmPosition.lng,
              ]}
              radius={Number(
                qlmData.accuracy
              )}
              pathOptions={{
                color: "#2563eb",
                fillColor:
                  "#2563eb",
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
              offset={[
                0,
                -10,
              ]}
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
            QLM/PDR recorded trajectory
        ================================================== */}

        {recordedPath.length >
          1 && (
          <Polyline
            positions={
              recordedPath
            }
            pathOptions={{
              color:
                "#2563eb",
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}

        {/* ==================================================
            Android recorded trajectory
        ================================================== */}

        {recordedAndroidPath.length >
          1 && (
          <Polyline
            positions={
              recordedAndroidPath
            }
            pathOptions={{
              color:
                "#ef4444",
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}
      </MapContainer>
    </>
  );
}

export default MapView;