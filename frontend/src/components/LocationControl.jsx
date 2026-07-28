import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { createRoot } from "react-dom/client";
import { MdMyLocation } from "react-icons/md";

function LocationControl({ location }) {
  const map = useMap();

  const latestLocation = useRef(location);
  
  const followingLocation = useRef(false);

  useEffect(() => {
      latestLocation.current = location;
  }, [location]);

  useEffect(() => {
    const LocationButton = L.Control.extend({
      options: {
        position: "bottomleft",
      },

      onAdd: function () {
        const container = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-control"
        );

        container.style.marginBottom = "2px";

        const button = L.DomUtil.create(
            "a",
            "leaflet-location-btn",
            container
        );

        button.href = "#";
        button.title = "Current Location";

        const root = createRoot(button);

        root.render(<MdMyLocation />);

        L.DomEvent.disableClickPropagation(container);

        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.preventDefault(e);
          followingLocation.current = true;
          map.setView(
            [
              latestLocation.current.lat,
              latestLocation.current.lng
            ],
            19,
            {
              animate: true,
            }
        );
        map.once("moveend", () => {
            button.classList.add("active");
        });
      });

      map.on("dragstart", () => {
        map.stop();
        followingLocation.current = false;
        button.classList.remove("active");
      });
        return container;
      },
    });

    const control = new LocationButton();

    map.addControl(control);

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
}

export default LocationControl;