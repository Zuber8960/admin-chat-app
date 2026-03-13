import { useEffect, useMemo, useState } from "react";
import { socket } from "./socket";
import AdminPanel from "./components/AdminPanel.jsx";
import UserPanel from "./components/UserPanel.jsx";

export default function App() {
  const [step, setStep] = useState("login");
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [selfId, setSelfId] = useState(null);
  const [selfUserId, setSelfUserId] = useState(null);
  const [adminStatus, setAdminStatus] = useState({ online: false, adminId: null });

  const isAdmin = role === "admin";

  useEffect(() => {
    socket.on("registered", ({ id, userId }) => {
      setSelfId(id);
      setSelfUserId(userId);
    });
    socket.on("admin-status", (status) => setAdminStatus(status));
    return () => {
      socket.off("registered");
      socket.off("admin-status");
    };
  }, []);

  const adminLogin = import.meta.env.VITE_ADMIN_LOGIN || "admin_89890";

  const handleJoin = () => {
    const clean = name.trim();
    if (!clean) return;
    const isAdminLogin = clean === adminLogin;
    setRole(isAdminLogin ? "admin" : "user");
    socket.connect();
    socket.emit("register", { name: clean, role: isAdminLogin ? "admin" : "user" });
    setStep("chat");
  };

  const commonProps = useMemo(
    () => ({
      socket,
      selfId,
      selfUserId,
      adminStatus,
      name,
    }),
    [selfId, selfUserId, adminStatus, name]
  );

  if (step === "login") {
    return (
      <div className="page">
        <div className="card">
          <h1>Swift Talk 🚀</h1>
          <p className="muted">Fast, focused conversations that keep teams aligned.</p>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
          <p className="hint">Simple, fast, and focused: no group noise, just the right people.</p>
          <button className="primary" onClick={handleJoin}>
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {isAdmin ? <AdminPanel {...commonProps} /> : <UserPanel {...commonProps} />}
    </div>
  );
}
