import { useState } from "react";
import socket from "../services/socket";

import {
  FaSatelliteDish,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
} from "react-icons/fa";

import {
  MdGpsFixed
} from "react-icons/md";

const modeIcons = {
  standard: "#2563eb",
  sbas: "#16a34a",
  dgnss: "#9333ea",
  rtkFloat: "#f59e0b",
  rtkFixed: "#dc2626",
  ppp: "#06b6d4",
};

export default function ControlPanel({
  modes,
  currentMode
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="cp-wrapper">

      <div
        className="cp-header"
        onClick={() => setOpen(!open)}
      >

        <div className="cp-title">

          <FaSatelliteDish className="cp-header-icon"/>

          <span>GNSS Corrections</span>

        </div>

        {
          open
          ?
          <FaChevronUp className="cp-arrow"/>
          :
          <FaChevronDown className="cp-arrow"/>
        }

      </div>

      {
        open && (

          <div className="cp-menu">

            {

              Object.entries(modes).map(([key,mode])=>(

                <button
                  key={key}

                  className={`cp-item ${
                    currentMode===key
                    ? "selected"
                    : ""
                  }`}

                  onClick={()=>{
                    socket.emit("change-mode",key);
                  }}
                >

                  <div className="cp-left">

                    <MdGpsFixed
                      color={modeIcons[key]}
                      size={24}
                    />

                    {mode.name}

                  </div>

                  {

                    currentMode===key &&

                    <FaCheck color="#2563eb"/>

                  }

                </button>

              ))

            }

          </div>

        )
      }

    </div>
  );
}