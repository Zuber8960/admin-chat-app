import { useEffect, useRef } from "react";

export default function VideoPanel({ stream, placeholder, local = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  return (
    <div className="video">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={local} />
      ) : (
        <div className="video-placeholder">{placeholder}</div>
      )}
    </div>
  );
}
