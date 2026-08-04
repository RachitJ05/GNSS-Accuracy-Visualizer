import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import { useMemo, useState, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ZoomControl } from "react-leaflet";
import LocationControl from "./LocationControl";
import MapStyleControl from "./MapStyleControl";

// Fix Leaflet marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = L.divIcon({
  className: "",
  html: `<div class="user-location"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

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

function MapView({ gnssData}) {
  const location = useMemo(() => ({
    lat: gnssData.latitude,
    lng: gnssData.longitude,
  }), [gnssData.latitude, gnssData.longitude]);

  const [mapType, setMapType] = useState("street");

    return (
    <MapContainer
        center={[gnssData.latitude, gnssData.longitude]}
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
      <TileLayer
        maxNativeZoom={19}
        maxZoom={22}
        attribution = { mapType === "street" ? "&copy; OpenStreetMap contributors" : "&copy; Esri" }
        url = { mapType === "street" ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" }
      />
      <ZoomControl position="bottomleft" />
      <LocationControl location={location} />
      <MapStyleControl
        mapType={mapType}
        setMapType={setMapType}
      />
      <Marker
          position={[gnssData.latitude, gnssData.longitude]}
          icon={userIcon}
      />
      <Circle
          center={[gnssData.latitude, gnssData.longitude]}
          radius={gnssData.accuracy}
          pathOptions={{
            color: "#2b7fff",
            fillColor: "#2b7fff",
            fillOpacity: 0.2,
          }}
      />
    </MapContainer>
  );
}

export default MapView;