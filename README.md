# RunDownRec 🎒

An open-source, file-based localhost server emulator and client patching framework optimized for mid-2019 builds of classic game clients. RunDownRec bypasses abandoned network authenticators, processes watch menus, saves custom room metadata locally, and reroutes traffic away from dead telemetry endpoints.

---

## 🚀 Features

* **Persistent SQLite Backend**: Retains custom profiles, currency tokens, and saved world data locally.
* **Unified Binary Patcher**: Automatically modifies network endpoints and real-time multiplayer routing signatures.
* **Telemetry Sinkholes**: Safely drops game analytics to maximize local client frames-per-second performance.
* **Zero Dependencies for Clients**: Run your private sandbox completely isolated on your machine.

---

## 🛠️ Installation & Deployment

### 1. Host the Server Backend
Ensure you have [Node.js](https://nodejs.org) installed. Clone this repository, navigate to the directory, and spin up the loopback server:

```bash
# Install dependencies
npm install

# Start the server core
node server.js
```

The server binds to `http://localhost:2059` and creates a persistent local file database (`rundown_database.db`).

### 2. Patch Your 2019 Client
Move the deployment utility file into your game's main root directory containing your game executable:

```bash
python tools/patch_engine.py
```

Launch your unpacked game client. It will bypass the dead servers and boot straight into your private localhost room.

---

## 📝 Disclaimer
RunDownRec is a preservation project intended for educational use, local testing, and archive documentation. It does not distribute protected client assets or official proprietary game binaries.
