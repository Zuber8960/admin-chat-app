import { useEffect, useRef, useState } from "react";
import ChatWindow from "./ChatWindow.jsx";

export default function UserPanel({ socket, selfUserId, adminStatus, name }) {
  const [messages, setMessages] = useState([]);
  const [localStream, setLocalStream] = useState(null);

  const peerRef = useRef(null);
  const adminIdRef = useRef(null);

  useEffect(() => {
    if (adminStatus.adminId) adminIdRef.current = adminStatus.adminId;
  }, [adminStatus.adminId]);

  useEffect(() => {
    socket.on("dm", (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    socket.on("history", ({ messages: history }) => {
      setMessages(history);
    });

    socket.on("camera-request", async ({ from }) => {
      if (!from) return;
      adminIdRef.current = from;
      socket.emit("camera-response", { to: from, accepted: true });
      await startCamera();
    });

    socket.on("webrtc-answer", async ({ from, sdp }) => {
      if (!peerRef.current || adminIdRef.current !== from) return;
      await peerRef.current.setRemoteDescription(sdp);
    });

    socket.on("webrtc-ice", async ({ from, candidate }) => {
      if (!peerRef.current || adminIdRef.current !== from) return;
      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch {
        // ignore invalid candidates
      }
    });

    return () => {
      socket.off("dm");
      socket.off("history");
      socket.off("camera-request");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice");
    };
  }, [socket]);

  useEffect(() => {
    if (adminStatus.adminId) {
      socket.emit("get-history", { with: adminStatus.adminId });
    }
  }, [adminStatus.adminId, socket]);

  const ensurePeer = async () => {
    if (peerRef.current) return;
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peer.onicecandidate = (event) => {
      if (event.candidate && adminIdRef.current) {
        socket.emit("webrtc-ice", { to: adminIdRef.current, candidate: event.candidate });
      }
    };
    peerRef.current = peer;
  };

  const startCamera = async () => {
    if (!adminIdRef.current) return;
    if (localStream) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    setLocalStream(stream);
    await ensurePeer();
    stream.getTracks().forEach((track) => peerRef.current.addTrack(track, stream));
    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    socket.emit("webrtc-offer", { to: adminIdRef.current, sdp: offer });
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setLocalStream(null);
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  };

  useEffect(() => {
    if (!adminStatus.online && localStream) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [adminStatus.online]);

  const handleSend = (text) => {
    if (!adminIdRef.current || !text.trim()) return;
    socket.emit("dm", { to: adminIdRef.current, message: text });
  };

  return (
    <>
      <div className="layout">
        <aside className="sidebar">
        <div className="panel">
          <h2>User</h2>
          <p className="muted">Logged in as {name}</p>
          <p className="muted">
            Admin is {adminStatus.online ? "online" : "offline"}
          </p>
        </div>
        </aside>
        <section className="main">
        <ChatWindow
          title="Chat With Admin"
          messages={messages}
          selfUserId={selfUserId}
          onSend={handleSend}
          disabled={!adminStatus.online}
        />
        </section>
      </div>
    </>
  );
}
