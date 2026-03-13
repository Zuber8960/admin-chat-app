const fs = require("fs");
const path = require("path");

async function initDb() {
  if (process.env.LIBSQL_URL) {
    const { createClient } = require("@libsql/client");
    const client = createClient({
      url: process.env.LIBSQL_URL,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    });

    await client.execute(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);

    await client.execute(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      ts INTEGER NOT NULL
    )`);

    return {
      insertUser: async ({ id, name, role, createdAt }) => {
        await client.execute({
          sql: "INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)",
          args: [id, name, role, createdAt],
        });
      },
      insertMessage: async ({ id, fromUserId, toUserId, message, ts }) => {
        await client.execute({
          sql: "INSERT INTO messages (id, from_user_id, to_user_id, message, ts) VALUES (?, ?, ?, ?, ?)",
          args: [id, fromUserId, toUserId, message, ts],
        });
      },
      getHistory: async ({ userA, userB, limit }) => {
        const result = await client.execute({
          sql: `SELECT from_user_id, to_user_id, message, ts
                FROM messages
                WHERE (from_user_id = ? AND to_user_id = ?)
                   OR (from_user_id = ? AND to_user_id = ?)
                ORDER BY ts ASC
                LIMIT ?`,
          args: [userA, userB, userB, userA, limit],
        });
        return result.rows;
      },
    };
  }

  const Database = require("better-sqlite3");
  const dbPath =
    process.env.DB_PATH || path.join(__dirname, "data", "chat.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    ts INTEGER NOT NULL
  )`);

  const insertUserStmt = db.prepare(
    "INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertMessageStmt = db.prepare(
    "INSERT INTO messages (id, from_user_id, to_user_id, message, ts) VALUES (?, ?, ?, ?, ?)"
  );
  const historyStmt = db.prepare(
    `SELECT from_user_id, to_user_id, message, ts
     FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?)
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY ts ASC
     LIMIT ?`
  );

  return {
    insertUser: async ({ id, name, role, createdAt }) => {
      insertUserStmt.run(id, name, role, createdAt);
    },
    insertMessage: async ({ id, fromUserId, toUserId, message, ts }) => {
      insertMessageStmt.run(id, fromUserId, toUserId, message, ts);
    },
    getHistory: async ({ userA, userB, limit }) =>
      historyStmt.all(userA, userB, userB, userA, limit),
  };
}

module.exports = { initDb };
