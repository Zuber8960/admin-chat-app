import { useEffect, useRef, useState } from "react";
import ChatWindow from "./ChatWindow.jsx";
import VideoPanel from "./VideoPanel.jsx";

export default function AdminPanel({ socket, selfId, selfUserId, name }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messagesByUser, setMessagesByUser] = useState({});
  const [remoteStream, setRemoteStream] = useState(null);

  const peerRef = useRef(null);
  const currentPeerUserRef = useRef(null);

  useEffect(() => {
    socket.on("user-list", (list) => {
      setUsers(list);
      if (list.length && !selectedUserId) {
        setSelectedUserId(list[0].id);
      }
      if (!list.find((u) => u.id === selectedUserId)) {
        setSelectedUserId(list[0]?.id || null);
      }
    });

    socket.on("dm", (payload) => {
      const other =
        payload.from === selfId ? payload.to : payload.from;
      setMessagesByUser((prev) => ({
        ...prev,
        [other]: [...(prev[other] || []), payload],
      }));
    });

    socket.on("history", ({ with: withUser, messages }) => {
      setMessagesByUser((prev) => ({
        ...prev,
        [withUser]: messages,
      }));
    });

    socket.on("camera-response", ({ from, accepted }) => {
      if (!accepted) return;
      currentPeerUserRef.current = from;
    });

    socket.on("webrtc-offer", async ({ from, sdp }) => {
      setSelectedUserId(from);
      await ensurePeer(from);
      await peerRef.current.setRemoteDescription(sdp);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("webrtc-answer", { to: from, sdp: answer });
    });

    socket.on("webrtc-ice", async ({ from, candidate }) => {
      if (currentPeerUserRef.current !== from || !peerRef.current) return;
      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch {
        // ignore invalid candidates
      }
    });

    return () => {
      socket.off("user-list");
      socket.off("dm");
      socket.off("history");
      socket.off("camera-response");
      socket.off("webrtc-offer");
      socket.off("webrtc-ice");
    };
  }, [socket, selectedUserId]);

  const ensurePeer = async (userId) => {
    if (peerRef.current && currentPeerUserRef.current === userId) return;
    cleanupPeer();
    currentPeerUserRef.current = userId;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice", { to: userId, candidate: event.candidate });
      }
    };
    peerRef.current = peer;
  };

  const cleanupPeer = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    currentPeerUserRef.current = null;
    setRemoteStream(null);
  };

  const handleSelectUser = (userId) => {
    if (userId === selectedUserId) return;
    setSelectedUserId(userId);
    cleanupPeer();
    socket.emit("get-history", { with: userId });
  };

  const handleSend = (text) => {
    if (!selectedUserId || !text.trim()) return;
    socket.emit("dm", { to: selectedUserId, message: text });
  };

  const handleRequestCamera = () => {
    if (!selectedUserId) return;
    socket.emit("request-camera", { to: selectedUserId });
  };

  const filteredMessages = messagesByUser[selectedUserId] || [];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="panel">
          <h2>Admin</h2>
          <p className="muted">Logged in as {name}</p>
        </div>
        <div className="panel">
          <h3>Users</h3>
          {users.length === 0 && <p className="muted">No users online</p>}
          <ul className="list">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  className={u.id === selectedUserId ? "list-item active" : "list-item"}
                  onClick={() => handleSelectUser(u.id)}
                >
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="main">
        <ChatWindow
          title="Direct Chat"
          messages={filteredMessages}
          selfUserId={selfUserId}
          onSend={handleSend}
          disabled={!selectedUserId}
        />
        <div className="panel">
          <div className="row">
            <h3>Camera</h3>
            <button className="secondary" onClick={handleRequestCamera} disabled={!selectedUserId}>
              Request Camera
            </button>
          </div>
          <VideoPanel stream={remoteStream} placeholder="User camera will show here." />
        </div>
      </section>
    </div>
  );
}
