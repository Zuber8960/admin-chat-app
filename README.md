# Admin/User Chat (Socket + React)

Basic chat app where only the admin can see all users. Users can only chat with the admin.
Camera sharing is consent-based: admin requests, user accepts, then the video streams to admin.

## Requirements
- Node.js 18+ recommended
- Two browser tabs or two devices to test admin and user

## Install
From repo root:

### Server
```
cd server
npm install
npm start
```

### Client
```
cd client
npm install
npm run dev
```

Open the client at `http://localhost:5173`.

## Storage (SQLite local or cloud)
By default, the server stores users and messages in a local SQLite file at:
`server/data/chat.db`

### Local SQLite (default)
Optional environment variable:
- `DB_PATH` to override the local sqlite file path

### Cloud SQLite (Turso/libSQL)
Set environment variables before starting the server:
- `LIBSQL_URL` (example: `libsql://your-db.turso.io`)
- `LIBSQL_AUTH_TOKEN`

The server will automatically use the cloud database if `LIBSQL_URL` is set.

## Environment Variables
Create `.env` files in `server` and `client` by copying the examples:
```
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Client
- `VITE_ADMIN_LOGIN` sets the admin username (default `admin_89890`)
- `VITE_SERVER_URL` sets the socket server URL

### Server
- `ADMIN_LOGIN` reserved for future server-side auth
- `DB_PATH` local sqlite path
- `LIBSQL_URL` and `LIBSQL_AUTH_TOKEN` for cloud sqlite

## How To Use
1. Open two browser tabs.
2. In tab A, choose role **Admin**, enter a name, click **Join Chat**.
3. In tab B, choose role **User**, enter a name, click **Join Chat**.
4. Admin can select the user from the list and chat.
5. Admin clicks **Request Camera**.
6. User sees a prompt and clicks **Accept** or **Decline**.

The user can also press **Share Camera Now** to start sharing without a request.

## Troubleshooting
### Camera not showing
- Camera needs user permission in the browser.
- Camera only works on `http://localhost` or HTTPS. If you are not on localhost, it will be blocked.
- Check the browser console for `getUserMedia` errors.
- Make sure admin is online and user accepted the request.

### Chat not working
- Both server and client must be running.
- Admin and user must both click **Join Chat**.
- Admin chats only with the selected user from the list.

### Vite error `spawn EPERM` (Windows)
Sometimes esbuild is blocked by antivirus. Try:
```
cd client
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```
If it persists, allow esbuild in your antivirus or run the shell as Administrator.
