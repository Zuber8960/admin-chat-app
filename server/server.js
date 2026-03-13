const express = require("express");
const http = require("http");
const cors = require("cors");
const crypto = require("crypto");
const { Server } = require("socket.io");
const { initDb } = require("./db");

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes("*")) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"), false);
    },
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes("*")) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"), false);
    },
  },
});

const sessions = new Map(); // socket.id -> { name, role, userId }
const userSockets = new Map(); // userId -> socket.id
let db;

function getAdmins() {
  return Array.from(sessions.entries())
    .filter(([, u]) => u.role === "admin")
    .map(([id, u]) => ({ id, name: u.name, userId: u.userId }));
}

function getUserList() {
  return Array.from(sessions.entries())
    .filter(([, u]) => u.role === "user")
    .map(([id, u]) => ({ id, name: u.name, userId: u.userId }));
}

function broadcastUserList() {
  const list = getUserList();
  getAdmins().forEach((admin) => {
    io.to(admin.id).emit("user-list", list);
  });
}

function notifyAdminStatus() {
  const admins = getAdmins();
  const online = admins.length > 0;
  const adminId = online ? admins[0].id : null;
  Array.from(sessions.entries())
    .filter(([, u]) => u.role === "user")
    .forEach(([id]) => {
      io.to(id).emit("admin-status", { online, adminId });
    });
}

function findSocketByUserId(userId) {
  return userSockets.get(userId) || null;
}

io.on("connection", (socket) => {
  socket.on("register", async ({ name, role }) => {
    const safeRole = role === "admin" ? "admin" : "user";
    const safeName =
      typeof name === "string" && name.trim() ? name.trim() : "Guest";
    const userId = crypto.randomUUID();
    const createdAt = Date.now();

    sessions.set(socket.id, { name: safeName, role: safeRole, userId });
    userSockets.set(userId, socket.id);

    await db.insertUser({ id: userId, name: safeName, role: safeRole, createdAt });

    socket.emit("registered", { id: socket.id, role: safeRole, userId });
    if (safeRole === "admin") {
      socket.emit("user-list", getUserList());
      notifyAdminStatus();
    } else {
      notifyAdminStatus();
    }
    broadcastUserList();
  });

  socket.on("dm", async ({ to, message }) => {
    const sender = sessions.get(socket.id);
    const receiver = sessions.get(to);
    if (!sender || !receiver || !to || typeof message !== "string") return;
    const ts = Date.now();
    const payload = {
      from: socket.id,
      to,
      fromUserId: sender.userId,
      toUserId: receiver.userId,
      message,
      ts,
    };
    await db.insertMessage({
      id: crypto.randomUUID(),
      fromUserId: sender.userId,
      toUserId: receiver.userId,
      message,
      ts,
    });
    io.to(to).emit("dm", payload);
    socket.emit("dm", payload);
  });

  socket.on("get-history", async ({ with: otherSocketId }) => {
    const sender = sessions.get(socket.id);
    const other = sessions.get(otherSocketId);
    if (!sender || !other) return;
    const rows = await db.getHistory({
      userA: sender.userId,
      userB: other.userId,
      limit: 200,
    });
    const messages = rows.map((row) => ({
      from: findSocketByUserId(row.from_user_id),
      to: findSocketByUserId(row.to_user_id),
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      message: row.message,
      ts: row.ts,
    }));
    socket.emit("history", { with: otherSocketId, messages });
  });

  socket.on("request-camera", ({ to }) => {
    const sender = sessions.get(socket.id);
    if (!sender || sender.role !== "admin" || !to) return;
    io.to(to).emit("camera-request", { from: socket.id });
  });

  socket.on("camera-response", ({ to, accepted }) => {
    const sender = sessions.get(socket.id);
    if (!sender || sender.role !== "user" || !to) return;
    io.to(to).emit("camera-response", { from: socket.id, accepted: !!accepted });
  });

  socket.on("webrtc-offer", ({ to, sdp }) => {
    if (!to || !sdp) return;
    io.to(to).emit("webrtc-offer", { from: socket.id, sdp });
  });

  socket.on("webrtc-answer", ({ to, sdp }) => {
    if (!to || !sdp) return;
    io.to(to).emit("webrtc-answer", { from: socket.id, sdp });
  });

  socket.on("webrtc-ice", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("webrtc-ice", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    const session = sessions.get(socket.id);
    if (session) {
      userSockets.delete(session.userId);
    }
    sessions.delete(socket.id);
    broadcastUserList();
    notifyAdminStatus();
  });
});

async function start() {
  db = await initDb();
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
