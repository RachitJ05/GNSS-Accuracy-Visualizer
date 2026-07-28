import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

import { FaSatellite, FaMap } from "react-icons/fa";
import { createRoot } from "react-dom/client";

function MapStyleControl({ mapType, setMapType }) {

  const map = useMap();

  const controlRef = useRef(null);

  const rootRef = useRef(null);

  useEffect(() => {

    const control = L.control({
      position: "bottomleft",
    });

    control.onAdd = function () {

      const div = L.DomUtil.create(
        "div",
        "leaflet-bar leaflet-control"
      );

      div.style.background = "white";
      div.style.width = "44px";
      div.style.height = "44px";
      div.style.borderRadius = "12px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.cursor = "pointer";
      div.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
      div.style.marginBottom = "20px";

      L.DomEvent.disableClickPropagation(div);

      div.onclick = () => {

        setMapType(previous =>
          previous === "street"
            ? "satellite"
            : "street"
        );

      };

      rootRef.current = createRoot(div);

      controlRef.current = div;

      return div;

    };

    control.addTo(map);

    return () => {

      control.remove();

    };

  }, [map, setMapType]);

  useEffect(() => {
    if (!rootRef.current)
        return;
    rootRef.current.render(
        mapType === "street"
        ?
        <FaSatellite
            size={30}
            color="#222"
        />
        :
        <FaMap
            size={30}
            color="#222"
        />
    );
    }, [mapType]);

    return null;
}

export default MapStyleControl;