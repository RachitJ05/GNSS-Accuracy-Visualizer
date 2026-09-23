import { useEffect, useRef, useState } from "react";
import { FaVideo, FaVideoSlash } from "react-icons/fa";

function CameraOverlay() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);

  const dragRef = useRef({
    active: false,
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

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [position, setPosition] = useState({
    left: null,
    top: null,
  });

  const [scale, setScale] = useState(1);

  // ---------------------------------------------------------
  // Initial position
  // ---------------------------------------------------------

  useEffect(() => {
    const width = 220;

    setPosition({
      left: Math.max(
        8,
        window.innerWidth - width - 12
      ),
      top: Math.max(
        70,
        window.innerHeight * 0.18
      ),
    });
  }, []);

  // ---------------------------------------------------------
  // Stop camera
  // ---------------------------------------------------------

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (error) {
          console.warn(
            "Error stopping camera track:",
            error
          );
        }
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (error) {
        console.warn(
          "Error clearing video:",
          error
        );
      }
    }

    setCameraOpen(false);
    setCameraStarting(false);
  }

  // ---------------------------------------------------------
  // Start camera
  // ---------------------------------------------------------

  async function startCamera() {
    if (cameraStarting || cameraOpen) return;

    setCameraError("");
    setCameraStarting(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });

        streamRef.current = null;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      /*
       * Start with the simplest camera request.
       * Rear-camera preference is applied only after the
       * stream has successfully started.
       */
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      streamRef.current = stream;

      /*
       * The video element is always mounted below,
       * even while cameraOpen is false.
       */
      const video = videoRef.current;

      if (!video) {
        throw new Error(
          "Camera preview element is unavailable."
        );
      }

      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      video.srcObject = stream;

      /*
       * Wait for the video element to receive metadata.
       */
      await new Promise((resolve, reject) => {
        let finished = false;

        const cleanup = () => {
          video.removeEventListener(
            "loadedmetadata",
            handleReady
          );

          video.removeEventListener(
            "loadeddata",
            handleReady
          );

          video.removeEventListener(
            "canplay",
            handleReady
          );
        };

        const finish = () => {
          if (finished) return;

          finished = true;
          clearTimeout(timeout);
          cleanup();
          resolve();
        };

        const handleReady = () => {
          finish();
        };

        const timeout = setTimeout(() => {
          if (finished) return;

          finished = true;
          cleanup();

          reject(
            new Error(
              "Camera opened, but no video frames were received."
            )
          );
        }, 5000);

        video.addEventListener(
          "loadedmetadata",
          handleReady
        );

        video.addEventListener(
          "loadeddata",
          handleReady
        );

        video.addEventListener(
          "canplay",
          handleReady
        );

        if (video.readyState >= 2) {
          finish();
        }
      });

      /*
       * Explicitly start playback.
       */
      try {
        await video.play();
      } catch (playError) {
        console.warn(
          "First video.play() failed:",
          playError
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 200)
        );

        await video.play();
      }

      /*
       * Verify the camera track is actually live.
       */
      const videoTrack = stream
        .getVideoTracks()
        .find(
          (track) =>
            track.readyState === "live"
        );

      if (!videoTrack) {
        throw new Error(
          "Camera permission was granted, but the camera track is not live."
        );
      }

      console.log("Camera started:", {
        track: videoTrack.label,
        readyState: videoTrack.readyState,
        settings: videoTrack.getSettings
          ? videoTrack.getSettings()
          : {},
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });

      /*
       * Prefer the rear/environment camera after the
       * stream has already successfully started.
       */
      try {
        if (videoTrack.applyConstraints) {
          await videoTrack.applyConstraints({
            facingMode: {
              ideal: "environment",
            },
          });

          console.log(
            "Camera settings after rear-camera preference:",
            videoTrack.getSettings
              ? videoTrack.getSettings()
              : {}
          );
        }
      } catch (constraintError) {
        console.warn(
          "Could not prefer rear camera:",
          constraintError
        );
      }

      /*
       * Give the camera a short time to start delivering frames.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 250)
      );

      /*
       * Retry playback if dimensions are not ready yet.
       */
      if (
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        console.warn(
          "Video dimensions not ready yet:",
          {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
          }
        );

        try {
          await video.play();
        } catch (error) {
          console.warn(
            "Second video.play() failed:",
            error
          );
        }
      }

      /*
       * Only show the popup after the stream is attached
       * and playback has been attempted.
       */
      setCameraOpen(true);
      setCameraStarting(false);

      videoTrack.onended = () => {
        console.warn("Camera track ended.");
      };

      videoTrack.onmute = () => {
        console.warn("Camera track muted.");
      };

      videoTrack.onunmute = () => {
        console.log("Camera track resumed.");
      };
    } catch (error) {
      console.error(
        "Camera start error:",
        error
      );

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });

        streamRef.current = null;
      }

      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch (_) {}
      }

      setCameraOpen(false);
      setCameraStarting(false);

      let message = "Unable to open camera.";

      if (error?.name === "NotAllowedError") {
        message =
          "Camera permission was denied. Allow camera access in browser/app settings.";
      } else if (error?.name === "NotFoundError") {
        message =
          "No camera was found on this device.";
      } else if (error?.name === "NotReadableError") {
        message =
          "Camera is already being used by another application.";
      } else if (error?.name === "OverconstrainedError") {
        message =
          "The requested camera configuration is not supported.";
      } else if (error?.message) {
        message = error.message;
      }

      setCameraError(message);
    }
  }

  // ---------------------------------------------------------
  // Toggle camera
  // ---------------------------------------------------------

  function toggleCamera() {
    if (cameraOpen) {
      stopCamera();
    } else {
      startCamera();
    }
  }

  // ---------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch (_) {}
          });
      }

      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch (_) {}
      }
    };
  }, []);

  // ---------------------------------------------------------
  // Keep video inside screen after resize
  // ---------------------------------------------------------

  useEffect(() => {
    function handleResize() {
      const element = containerRef.current;

      if (!element) return;

      const rect =
        element.getBoundingClientRect();

      const maxLeft = Math.max(
        8,
        window.innerWidth -
          rect.width -
          8
      );

      const maxTop = Math.max(
        8,
        window.innerHeight -
          rect.height -
          8
      );

      setPosition((previous) => ({
        left: Math.min(
          Math.max(
            previous.left ?? 8,
            8
          ),
          maxLeft
        ),
        top: Math.min(
          Math.max(
            previous.top ?? 8,
            8
          ),
          maxTop
        ),
      }));
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  // ---------------------------------------------------------
  // Touch helpers
  // ---------------------------------------------------------

  function getDistance(
    touch1,
    touch2
  ) {
    const dx =
      touch2.clientX -
      touch1.clientX;

    const dy =
      touch2.clientY -
      touch1.clientY;

    return Math.sqrt(
      dx * dx + dy * dy
    );
  }

  function handleTouchStart(event) {
    if (event.touches.length === 2) {
      pinchRef.current = {
        active: true,
        startDistance: getDistance(
          event.touches[0],
          event.touches[1]
        ),
        startScale: scale,
      };

      dragRef.current.active = false;

      event.preventDefault();

      return;
    }

    if (event.touches.length === 1) {
      const touch =
        event.touches[0];

      dragRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startLeft:
          position.left ?? 0,
        startTop:
          position.top ?? 0,
      };

      event.preventDefault();
    }
  }

  function handleTouchMove(event) {
    // Pinch to resize
    if (
      event.touches.length === 2 &&
      pinchRef.current.active
    ) {
      const currentDistance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );

      if (
        pinchRef.current.startDistance >
        0
      ) {
        const ratio =
          currentDistance /
          pinchRef.current.startDistance;

        const newScale =
          Math.min(
            2.5,
            Math.max(
              0.6,
              pinchRef.current.startScale *
                ratio
            )
          );

        setScale(newScale);
      }

      event.preventDefault();

      return;
    }

    // Drag
    if (
      event.touches.length === 1 &&
      dragRef.current.active
    ) {
      const touch =
        event.touches[0];

      const dx =
        touch.clientX -
        dragRef.current.startX;

      const dy =
        touch.clientY -
        dragRef.current.startY;

      const element =
        containerRef.current;

      if (!element) return;

      const rect =
        element.getBoundingClientRect();

      const maxLeft =
        Math.max(
          8,
          window.innerWidth -
            rect.width -
            8
        );

      const maxTop =
        Math.max(
          8,
          window.innerHeight -
            rect.height -
            8
        );

      const newLeft =
        dragRef.current.startLeft +
        dx;

      const newTop =
        dragRef.current.startTop +
        dy;

      setPosition({
        left: Math.min(
          Math.max(
            8,
            newLeft
          ),
          maxLeft
        ),
        top: Math.min(
          Math.max(
            8,
            newTop
          ),
          maxTop
        ),
      });

      event.preventDefault();
    }
  }

  function handleTouchEnd(event) {
    if (event.touches.length < 2) {
      pinchRef.current.active = false;
    }

    if (event.touches.length === 0) {
      dragRef.current.active = false;
    }
  }

  // ---------------------------------------------------------
  // Mouse dragging
  // ---------------------------------------------------------

  function handleMouseDown(event) {
    if (
      event.target.closest(
        "[data-camera-button='true']"
      )
    ) {
      return;
    }

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startLeft:
        position.left ?? 0,
      startTop:
        position.top ?? 0,
    };

    event.preventDefault();
  }

  useEffect(() => {
    function handleMouseMove(event) {
      if (!dragRef.current.active)
        return;

      const element =
        containerRef.current;

      if (!element) return;

      const rect =
        element.getBoundingClientRect();

      const dx =
        event.clientX -
        dragRef.current.startX;

      const dy =
        event.clientY -
        dragRef.current.startY;

      const maxLeft =
        Math.max(
          8,
          window.innerWidth -
            rect.width -
            8
        );

      const maxTop =
        Math.max(
          8,
          window.innerHeight -
            rect.height -
            8
        );

      const newLeft =
        dragRef.current.startLeft +
        dx;

      const newTop =
        dragRef.current.startTop +
        dy;

      setPosition({
        left: Math.min(
          Math.max(
            8,
            newLeft
          ),
          maxLeft
        ),
        top: Math.min(
          Math.max(
            8,
            newTop
          ),
          maxTop
        ),
      });
    }

    function handleMouseUp() {
      dragRef.current.active = false;
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, []);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <>
      {/* ---------------------------------------------------
          CAMERA BUTTON
          White circle + purple FaVideo / FaVideoSlash
      --------------------------------------------------- */}
      <button
        type="button"
        data-camera-button="true"
        onClick={toggleCamera}
        disabled={cameraStarting}
        aria-label={
          cameraOpen
            ? "Stop camera"
            : "Start camera"
        }
        style={{
          position: "fixed",

          top: "4px",

          right: "10px",

          width: "58px",
          height: "58px",

          borderRadius: "50%",

          border: "none",

          background: "#fff",

          color: "#7651b8",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          fontSize: "25px",

          cursor: cameraStarting
            ? "wait"
            : "pointer",

          zIndex: 3000,

          boxShadow:
            "0 2px 8px rgba(0,0,0,0.18)",

          WebkitTapHighlightColor:
            "transparent",

          touchAction: "manipulation",
        }}
      >
        {cameraOpen ? (
          <FaVideoSlash />
        ) : (
          <FaVideo />
        )}
      </button>

      {/* ---------------------------------------------------
          ERROR
      --------------------------------------------------- */}
      {cameraError && (
        <div
          style={{
            position: "fixed",

            top:
              "calc(env(safe-area-inset-top, 0px) + 70px)",

            right: "10px",

            width:
              "min(280px, calc(100vw - 20px))",

            padding: "10px 12px",

            borderRadius: "10px",

            background:
              "rgba(180, 25, 25, 0.94)",

            color: "#fff",

            fontSize: "12px",
            lineHeight: 1.4,

            zIndex: 2999,

            boxShadow:
              "0 3px 12px rgba(0,0,0,0.35)",
          }}
        >
          {cameraError}
        </div>
      )}

      {/* ---------------------------------------------------
          VIDEO WINDOW

          Always mounted so videoRef.current exists when
          getUserMedia() returns.
      --------------------------------------------------- */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed",

          left: position.left ?? 12,
          top: position.top ?? 90,

          width: "220px",
          height: "165px",

          transform: `scale(${scale})`,
          transformOrigin:
            "center center",

          borderRadius: "12px",

          overflow: "hidden",

          background: "#000",

          border:
            "2px solid rgba(255,255,255,0.85)",

          boxShadow:
            "0 5px 20px rgba(0,0,0,0.45)",

          zIndex: 2500,

          cursor: "move",

          touchAction: "none",

          userSelect: "none",
          WebkitUserSelect: "none",

          display: cameraOpen
            ? "block"
            : "none",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          controls={false}
          style={{
            width: "100%",
            height: "100%",

            display: "block",

            background: "#000",

            objectFit: "cover",

            pointerEvents: "none",

            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onLoadedMetadata={() => {
            console.log(
              "Camera metadata loaded:",
              {
                width:
                  videoRef.current
                    ?.videoWidth,

                height:
                  videoRef.current
                    ?.videoHeight,
              }
            );

            videoRef.current
              ?.play()
              .catch((error) => {
                console.warn(
                  "Video play after metadata failed:",
                  error
                );
              });
          }}
          onCanPlay={() => {
            console.log(
              "Camera can play."
            );

            videoRef.current
              ?.play()
              .catch((error) => {
                console.warn(
                  "Video play after canplay failed:",
                  error
                );
              });
          }}
          onPlaying={() => {
            console.log(
              "Camera video is playing."
            );
          }}
          onError={(event) => {
            console.error(
              "Video element error:",
              event
            );
          }}
        />

        {/* LIVE indicator */}
        <div
          style={{
            position: "absolute",

            left: "8px",
            top: "8px",

            padding: "3px 7px",

            borderRadius: "10px",

            background:
              "rgba(0,0,0,0.65)",

            color: "#fff",

            fontSize: "10px",
            fontWeight: 600,

            pointerEvents: "none",
          }}
        >
          ● LIVE
        </div>
      </div>
    </>
  );
}

export default CameraOverlay;