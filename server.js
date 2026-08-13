```javascript
// ============================================================================
// RUNDOWNREC (LUNARREC FORK) - ULTIMATE TRANSACTIONAL ECONOMY ENGINE
// Features: Full Auth, Profiles, Friends, Dynamic Room Saves, and Store Checkout
// ============================================================================

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const DB_PATH = './rundown_database.db';

// 1. Dynamic Configuration Sourcing
let config = { port: 2059, startingTokens: 50000, developerName: "RunDownDev" };
if (fs.existsSync('./config.json')) {
    try { config = JSON.parse(fs.readFileSync('./config.json', 'utf8')); }
    catch (e) { console.warn("[!] Error parsing config.json, using defaults."); }
}

const PORT = config.port;
let db;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static store items mapping matching classic 2019 game clothing item asset indexes
const RUNDOWN_STORE_CATALOG = [
    { "StorefrontItemId": 1, "AvatarItemKey": "15", "Cost": 500, "Type": 1, "Name": "Classic Hoodie" },
    { "StorefrontItemId": 2, "AvatarItemKey": "42", "Cost": 1200, "Type": 1, "Name": "Royal Crown" },
    { "StorefrontItemId": 3, "AvatarItemKey": "88", "Cost": 250, "Type": 1, "Name": "Retro Glasses" },
    { "StorefrontItemId": 4, "AvatarItemKey": "105", "Cost": 3000, "Type": 1, "Name": "Astronaut Helmet" }
];

// Database Initialization & Stable Table Layouts
async function initDb() {
    db = await open({ filename: DB_PATH, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, username TEXT, displayName TEXT, xp INTEGER, level INTEGER, tokens INTEGER);
        CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, name TEXT, description TEXT, creatorId INTEGER, maxPlayers INTEGER, sceneName TEXT, data TEXT);
        CREATE TABLE IF NOT EXISTS relationships (id INTEGER PRIMARY KEY AUTOINCREMENT, playerId INTEGER, targetId INTEGER, type INTEGER);
        CREATE TABLE IF NOT EXISTS outfits (playerId INTEGER PRIMARY KEY, skinColor INTEGER, hair INTEGER, face INTEGER, costume TEXT);
        CREATE TABLE IF NOT EXISTS inventory (playerId INTEGER, itemKey TEXT, PRIMARY KEY(playerId, itemKey));
    `);

    // Ensure Master Host Profile Exists
    const checkPlayer = await db.get('SELECT * FROM players WHERE id = 1');
    if (!checkPlayer) {
        await db.run('INSERT INTO players (id, username, displayName, xp, level, tokens) VALUES (1, "RunDownDev", "RunDown Creator", 99999, 50, 50000)');
        await db.run('INSERT INTO rooms (id, name, description, creatorId, maxPlayers, sceneName, data) VALUES ("dorm", "DormRoom", "Your private home.", 1, 1, "DormRoom", "{}")');
        await db.run('INSERT INTO outfits (playerId, skinColor, hair, face, costume) VALUES (1, 1, 1, 1, "[]")');
        console.log("[+] RunDownRec Deep Database Tables Formatted Flawlessly.");
    }
}

// --------------------------------------------
// 2. CONFIG GATEWAYS & HANDSHAKES
// --------------------------------------------
app.get('/api/config/v2', (req, res) => {
    res.json({
        "RegistrationEnabled": true, "DailyChallengeEnabled": false, "PhotonEngine": true,
        "ApiBaseUrl": `http://localhost:${PORT}/`, "NotificationHubEnabled": false, "VoiceChatEnabled": true
    });
});
app.get('/api/versioncheck/v3', (req, res) => res.json({ "Outcome": 1, "Message": "RunDownRec Ultimate Stack Online." }));

// --------------------------------------------
// 3. AUTHENTICATION & MASTER TOKENS
// --------------------------------------------
app.post('/api/v1/login', async (req, res) => {
    const p = await db.get('SELECT * FROM players WHERE id = 1');
    res.json({ "Token": "master_rundown_jwt_proof_identity", "PlayerId": p ? p.id : 1, "Username": p ? p.username : config.developerName });
});

app.get('/api/players/v1/me', async (req, res) => {
    const p = await db.get('SELECT * FROM players WHERE id = 1');
    res.json({ "PlayerId": p.id, "Username": p.username, "DisplayName": p.displayName, "RegistrationStatus": 2, "XP": p.xp, "Level": p.level });
});

app.get('/api/players/v1/:id', async (req, res) => {
    const target = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
    res.json(target ? { "PlayerId": target.id, "Username": target.username, "DisplayName": target.displayName, "RegistrationStatus": 2, "Level": target.level }
                    : { "PlayerId": parseInt(req.params.id), "Username": "Guest", "DisplayName": "Roommate", "RegistrationStatus": 2, "Level": 1 });
});

// --------------------------------------------
// 4. CLOTHING AVATAR OUTFIT PROFILE SAVES
// --------------------------------------------
app.get('/api/avatar/v2/saved', async (req, res) => {
    const outfit = await db.get('SELECT * FROM outfits WHERE playerId = 1');
    res.json([{
        "OutfitId": 1, "PlayerId": 1,
        "SkinColor": outfit ? outfit.skinColor : 1, "Hair": outfit ? outfit.hair : 1, "Face": outfit ? outfit.face : 1,
        "Costume": outfit ? JSON.parse(outfit.costume) : []
    }]);
});

app.post('/api/avatar/v2/set', async (req, res) => {
    const { SkinColor, Hair, Face, Costume } = req.body;
    await db.run('INSERT OR REPLACE INTO outfits (playerId, skinColor, hair, face, costume) VALUES (1, ?, ?, ?, ?)',
        [SkinColor || 1, Hair || 1, Face || 1, JSON.stringify(Costume || [])]);
    res.json({ "Success": true });
});

// Deliver the list of items you have actually bought so clothing drawer loops stay locked
app.get('/api/avatar/v2/unlocked', async (req, res) => {
    const ownedItems = await db.all('SELECT itemKey FROM inventory WHERE playerId = 1');

    // Default starter gear items so your character isn't naked on fresh launch
    let payloads = [
        { "AvatarItemKey": "1", "Type": 1 },
        { "AvatarItemKey": "2", "Type": 1 }
    ];

    ownedItems.forEach(row => {
        payloads.push({ "AvatarItemKey": row.itemKey, "Type": 1 });
    });

    res.json(payloads);
});

// --------------------------------------------
// 5. TRANSACTIONAL MERCHANDISE FRONTEND
// --------------------------------------------
app.get('/api/players/v1/wallet', async (req, res) => {
    const p = await db.get('SELECT tokens FROM players WHERE id = 1');
    res.json({ "Currency": p ? p.tokens : config.startingTokens });
});

app.get('/api/storefront/v2/all', (req, res) => {
    const mappedCatalog = RUNDOWN_STORE_CATALOG.map(item => ({
        "StorefrontItemId": item.StorefrontItemId,
        "AvatarItemKey": item.AvatarItemKey,
        "Type": item.Type,
        "Cost": item.Cost,
        "IsFeatured": true,
        "IsGroupGift": false
    }));
    res.json(mappedCatalog);
});

// Intercepts watch click when checking out inside the storefront tab
app.post('/api/storefront/v3/buy', async (req, res) => {
    const { StorefrontItemId } = req.body;
    console.log(`[Store] Purchase instruction received for Item ID: ${StorefrontItemId}`);

    const targetItem = RUNDOWN_STORE_CATALOG.find(i => i.StorefrontItemId === StorefrontItemId);
    if (!targetItem) {
        return res.json({ "Success": false, "Error": "ItemNotFound" });
    }

    const player = await db.get('SELECT tokens FROM players WHERE id = 1');
    if (!player || player.tokens < targetItem.Cost) {
        console.warn(`[-] Checkout failed: Insufficient token parameters.`);
        return res.json({ "Success": false, "Error": "InsufficientTokens" });
    }

    try {
        const newBalance = player.tokens - targetItem.Cost;
        await db.run('UPDATE players SET tokens = ? WHERE id = 1', [newBalance]);
        await db.run('INSERT OR IGNORE INTO inventory (playerId, itemKey) VALUES (1, ?)', [targetItem.AvatarItemKey]);

        console.log(`\x1b[32m[SUCCESS] Purchased ${targetItem.Name}! Deducted ${targetItem.Cost} tokens. Wallet updated.\x1b[0m`);

        res.json({
            "Success": true,
            "NewWalletBalance": newBalance,
            "UnlockedItem": { "AvatarItemKey": targetItem.AvatarItemKey, "Type": targetItem.Type }
        });
    } catch (err) {
        console.error("[-] Store transaction crash:", err.message);
        res.json({ "Success": false, "Error": "DatabaseError" });
    }
});

app.get('/api/storefront/v1/giftPackages', (req, res) => res.json([]));
app.post('/api/objectpackages/v1/consume', (req, res) => {
    res.json({ "Success": true, "Gift": { "Type": 1, "Value": 100, "AvatarItemKey": "1" } });
});

// --------------------------------------------
// 6. CONSUMABLES & IN-ROOM ITEMS
// --------------------------------------------
app.get('/api/consumables/v1/get', (req, res) => {
    const payloads = [
        { "ConsumableId": 1, "ItemKey": "pizza", "Count": 99 },
        { "ConsumableId": 2, "ItemKey": "film", "Count": 24 },
        { "ConsumableId": 3, "ItemKey": "bubbly", "Count": 10 },
        { "ConsumableId": 4, "ItemKey": "potion", "Count": 5 },
        { "ConsumableId": 5, "ItemKey": "donut", "Count": 12 }
    ];
    res.json(payloads);
});

// --------------------------------------------
// 7. SOCIAL RELATIONSHIPS & FRIENDS
// --------------------------------------------
app.get('/api/relationships/v1/get', async (req, res) => {
    // Return empty list or basic data structured for older server formats (Type 1 = Friend)
    const friends = await db.all('SELECT targetId FROM relationships WHERE playerId = 1 AND type = 1');
    const payloads = friends.map(f => ({ "PlayerId": f.targetId, "RelationshipType": 1 }));
    res.json(payloads);
});

// --------------------------------------------
// 8. DYNAMIC ROOM SAVES
// --------------------------------------------
app.get('/api/rooms/v4/details/:roomName', async (req, res) => {
    const room = await db.get('SELECT * FROM rooms WHERE name = ?', [req.params.roomName]);
    if (room) {
        res.json({
            "RoomId": room.id,
            "Name": room.name,
            "Description": room.description,
            "CreatorPlayerId": room.creatorId,
            "MaxPlayers": room.maxPlayers,
            "SceneName": room.sceneName
        });
    } else {
        res.status(404).json({ "Error": "RoomNotFound" });
    }
});

app.post('/api/rooms/v2/save', async (req, res) => {
    const { RoomId, Name, Description, SceneName, Data } = req.body;
    await db.run(
        'INSERT OR REPLACE INTO rooms (id, name, description, creatorId, maxPlayers, sceneName, data) VALUES (?, ?, ?, 1, 10, ?, ?)',
        [RoomId || "custom_room", Name || "New Room", Description || "", SceneName || "DormRoom", JSON.stringify(Data || {})]
    );
    console.log(`[Rooms] Dynamic Layout Data Captured and Saved for room: ${Name}`);
    res.json({ "Success": true });
});

// --------------------------------------------
// ENGINE BOOTSTRAPPER LOOP
// --------------------------------------------
(async () => {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log('\x1b[36m===================================================\x1b[0m');
            console.log(`\x1b[36m  RUNDOWNREC ENGINE IS ONLINE - PORT ${PORT}       \x1b[0m`);
            console.log('\x1b[36m===================================================\x1b[0m');
        });
    } catch (err) {
        console.error("[!] Core system boot crash: ", err);
    }
})();
```

I placed the room-details/save routes and the bootstrapper loop right after the "8. DYNAMIC ROOM SAVES" header, since that's where they belong logically. Same fixes as before (backticks around the color-coded log lines and the template literal).
