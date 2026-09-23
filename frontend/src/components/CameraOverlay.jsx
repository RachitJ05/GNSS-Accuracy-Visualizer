import { useEffect, useRef, useState } from "react";
import { FaVideo, FaVideoSlash } from "react-icons/fa6";

function CameraOverlay() {
  const videoRef = useRef(null);

  const streamRef = useRef(null);

  const containerRef = useRef(null);

  const pointersRef = useRef(new Map());

  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  const pinchRef = useRef({
    active: false,
    startDistance: 0,
    startScale: 1,
  });

  const [cameraOn, setCameraOn] =
    useState(false);

  const [scale, setScale] =
    useState(1);

  const [position, setPosition] =
    useState({
      left: null,
      top: null,
    });

  // ======================================================
  // CAMERA
  // ======================================================

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert(
          "Camera is not supported by this browser."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (err) {
      console.error(
        "Camera error:",
        err
      );

      if (
        err?.name ===
        "NotAllowedError"
      ) {
        alert(
          "Camera permission was denied. Please allow camera access."
        );
      } else {
        alert(
          "Unable to start the camera."
        );
      }
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setCameraOn(false);
  }

  function toggleCamera() {
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  }

  // ======================================================
  // CLEANUP
  // ======================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }
    };
  }, []);

  // ======================================================
  // INITIAL VIDEO POSITION
  // ======================================================

  useEffect(() => {
    if (!cameraOn) {
      return;
    }

    const videoWidth = 150;

    const rightMargin = 12;

    const initialLeft =
      window.innerWidth -
      videoWidth -
      rightMargin;

    const initialTop =
      65 +
      150;

    setPosition({
      left: Math.max(
        8,
        initialLeft
      ),
      top: initialTop,
    });
  }, [cameraOn]);

  // ======================================================
  // DISTANCE BETWEEN TWO POINTERS
  // ======================================================

  function getPointerDistance() {
    const points = Array.from(
      pointersRef.current.values()
    );

    if (points.length < 2) {
      return 0;
    }

    const [a, b] = points;

    const dx =
      a.x - b.x;

    const dy =
      a.y - b.y;

    return Math.sqrt(
      dx * dx + dy * dy
    );
  }

  // ======================================================
  // POINTER DOWN
  // ======================================================

  function handlePointerDown(e) {
    if (!containerRef.current) {
      return;
    }

    e.currentTarget.setPointerCapture(
      e.pointerId
    );

    pointersRef.current.set(
      e.pointerId,
      {
        x: e.clientX,
        y: e.clientY,
      }
    );

    const pointerCount =
      pointersRef.current.size;

    // --------------------------------------------------
    // TWO FINGER PINCH
    // --------------------------------------------------

    if (pointerCount === 2) {
      dragRef.current.active =
        false;

      pinchRef.current = {
        active: true,

        startDistance:
          getPointerDistance(),

        startScale: scale,
      };

      return;
    }

    // --------------------------------------------------
    // ONE FINGER DRAG
    // --------------------------------------------------

    if (pointerCount === 1) {
      dragRef.current = {
        active: true,

        pointerId:
          e.pointerId,

        startX:
          e.clientX,

        startY:
          e.clientY,

        startLeft:
          position.left ?? 0,

        startTop:
          position.top ?? 0,
      };
    }
  }

  // ======================================================
  // POINTER MOVE
  // ======================================================

  function handlePointerMove(e) {
    if (
      !pointersRef.current.has(
        e.pointerId
      )
    ) {
      return;
    }

    pointersRef.current.set(
      e.pointerId,
      {
        x: e.clientX,
        y: e.clientY,
      }
    );

    // --------------------------------------------------
    // PINCH RESIZE
    // --------------------------------------------------

    if (
      pinchRef.current.active &&
      pointersRef.current.size >= 2
    ) {
      const distance =
        getPointerDistance();

      if (
        pinchRef.current
          .startDistance <= 0
      ) {
        return;
      }

      const ratio =
        distance /
        pinchRef.current
          .startDistance;

      let newScale =
        pinchRef.current
          .startScale *
        ratio;

      // Minimum / maximum video size
      newScale = Math.max(
        0.6,
        Math.min(2.5, newScale)
      );

      setScale(newScale);

      return;
    }

    // --------------------------------------------------
    // ONE FINGER DRAG
    // --------------------------------------------------

    if (
      dragRef.current.active &&
      pointersRef.current.size === 1 &&
      dragRef.current.pointerId ===
        e.pointerId
    ) {
      const dx =
        e.clientX -
        dragRef.current.startX;

      const dy =
        e.clientY -
        dragRef.current.startY;

      const element =
        containerRef.current;

      if (!element) {
        return;
      }

      const width =
        element.offsetWidth;

      const height =
        element.offsetHeight;

      let newLeft =
        dragRef.current.startLeft +
        dx;

      let newTop =
        dragRef.current.startTop +
        dy;

      const margin = 6;

      newLeft = Math.max(
        margin,
        Math.min(
          window.innerWidth -
            width -
            margin,
          newLeft
        )
      );

      newTop = Math.max(
        margin,
        Math.min(
          window.innerHeight -
            height -
            margin,
          newTop
        )
      );

      setPosition({
        left: newLeft,
        top: newTop,
      });
    }
  }

  // ======================================================
  // POINTER UP
  // ======================================================

  function handlePointerUp(e) {
    pointersRef.current.delete(
      e.pointerId
    );

    if (
      pointersRef.current.size < 2
    ) {
      pinchRef.current.active =
        false;
    }

    if (
      pointersRef.current.size === 0
    ) {
      dragRef.current.active =
        false;
    }
  }

  // ======================================================
  // MOBILE ONLY
  // ======================================================

  return (
    <>
      {/* ==================================================
          CAMERA BUTTON
      ================================================== */}

      <button
        type="button"
        onClick={toggleCamera}
        aria-label={
          cameraOn
            ? "Stop camera"
            : "Start camera"
        }
        style={{
          position: "fixed",

          top:
            "calc(env(safe-area-inset-top, 0px) + 4px)",

          right: "12px",

          width: "52px",
          height: "52px",

          border: "none",

          borderRadius: "50%",

          background:
            "rgba(255,255,255,0.92)",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          color:
            cameraOn
              ? "#dc2626"
              : "#6b46a5",

          boxShadow:
            "0 2px 8px rgba(0,0,0,0.18)",

          cursor: "pointer",

          zIndex: 1700,
        }}
      >
        {cameraOn ? (
          <FaVideoSlash
            size={22}
          />
        ) : (
          <FaVideo
            size={22}
          />
        )}
      </button>


      {/* ==================================================
          VIDEO WINDOW
      ================================================== */}

      {cameraOn && (
        <div
          ref={containerRef}
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            handlePointerUp
          }
          onPointerCancel={
            handlePointerUp
          }
          onPointerLeave={
            handlePointerUp
          }
          style={{
            position: "fixed",

            left:
              position.left ??
              0,

            top:
              position.top ??
              145,

            width: `${
              150 * scale
            }px`,

            height: `${
              200 * scale
            }px`,

            borderRadius: "4px",

            overflow: "hidden",

            background: "#000",

            boxShadow:
              "0 3px 12px rgba(0,0,0,0.30)",

            border:
              "2px solid rgba(255,255,255,0.85)",

            zIndex: 1650,

            touchAction: "none",

            userSelect: "none",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",

              display: "block",

              objectFit: "cover",

              pointerEvents: "none",

              userSelect: "none",
            }}
          />
        </div>
      )}
    </>
  );
}

export default CameraOverlay;