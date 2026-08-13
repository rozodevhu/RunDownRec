const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const DB_PATH = './rundown_database.db';

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

async function initDb() {
    db = await open({ filename: DB_PATH, driver: sqlite3.Database });
}

// System Config Gateway
app.get('/api/config/v2', (req, res) => {
    res.json({
        "RegistrationEnabled": true, "DailyChallengeEnabled": false, "PhotonEngine": true,
        "ApiBaseUrl": `http://localhost:${PORT}/`, "NotificationHubEnabled": false, "VoiceChatEnabled": true
    });
});
app.get('/api/versioncheck/v3', (req, res) => res.json({ "Outcome": 1, "Message": "RunDownRec Ultimate Stack Online." }));

// Auth & Profiles
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

// Clothing Cosmetics
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

app.get('/api/avatar/v2/unlocked', (req, res) => {
    let unlockedAll = [];
    for (let i = 1; i <= 2500; i++) { unlockedAll.push({ "AvatarItemKey": i.toString(), "Type": 1 }); }
    res.json(unlockedAll);
});

// Economy & Packages
app.get('/api/players/v1/wallet', async (req, res) => {
    const p = await db.get('SELECT * FROM players WHERE id = 1');
    res.json({ "Currency": p ? p.tokens : config.startingTokens });
});
app.get('/api/storefront/v2/all', (req, res) => res.json([]));
app.get('/api/storefront/v1/giftPackages', (req, res) => res.json([]));
app.post('/api/objectpackages/v1/consume', (req, res) => res.json({ "Success": true, "Gift": { "Type": 1, "Value": 500, "AvatarItemKey": "10" } }));

// Consumables & Social
app.get('/api/consumables/v1/get', (req, res) => {
    const consumables = ["pizza", "film", "bubbly", "potion", "donut"];
    res.json(consumables.map((item, idx) => ({ "ConsumableId": idx + 1, "Type": item, "Count": 99 })));
});
app.get('/api/equipment/v1/getEquipment', (req, res) => res.json([]));

app.get('/api/relationships/v1/get', async (req, res) => {
    const rels = await db.all('SELECT * FROM relationships WHERE playerId = 1');
    res.json(rels.map(r => ({ "PlayerId": r.targetId, "Type": r.type, "Favorited": false })));
});

app.post('/api/relationships/v1/update', async (req, res) => {
    const { TargetPlayerId, RelationshipType } = req.body;
    if (RelationshipType === 0) {
        await db.run('DELETE FROM relationships WHERE playerId = 1 AND targetId = ?', [TargetPlayerId]);
    } else {
        await db.run('INSERT OR REPLACE INTO relationships (playerId, targetId, type) VALUES (1, ?, ?)', [TargetPlayerId, RelationshipType]);
    }
    res.json({ "Success": true });
});

// World Building Mapping
app.get('/api/rooms/v2/myrooms', async (req, res) => {
    const list = await db.all('SELECT * FROM rooms');
    res.json(list.map(r => ({ "RoomId": r.id, "Name": r.name, "Description": r.description, "MaxPlayers": r.maxPlayers, "CreatorId": r.creatorId })));
});

app.post('/api/rooms/v1/search', async (req, res) => {
    const list = await db.all('SELECT * FROM rooms');
    res.json(list.map(r => ({ "RoomId": r.id, "Name": r.name, "Description": r.description })));
});

app.post('/api/rooms/v4/save', async (req, res) => {
    const { RoomId, Name, Description, SceneName } = req.body;
    const rId = RoomId || `room_${Date.now()}`;
    await db.run('INSERT OR REPLACE INTO rooms (id, name, description, creatorId, maxPlayers, sceneName) VALUES (?, ?, ?, ?, ?, ?)',
        [rId, Name, Description || "Saved Custom Workspace", 1, 10, SceneName || "BaseScene"]);
    res.json({ "Success": true });
});

app.get('/api/rooms/v2/favoriterooms', (req, res) => res.json([]));
app.get('/api/leaderboard/v1/:gameMode', (req, res) => res.json({ "PlayerStats": [], "TopStats": [] }));
app.get('/api/challenges/v1/getCurrent', (req, res) => res.json([]));

// Sinkholes
app.post('/api/images/v1/log', (req, res) => res.sendStatus(200));
app.post('/api/metrics/v1/log', (req, res) => res.sendStatus(200));
app.post('/api/metrics/v2/log', (req, res) => res.sendStatus(200));
app.get('/api/images/v4/named', (req, res) => res.json([]));

app.use((req, res) => {
    res.status(200).json({});
});

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`\n=============================================================`);
        console.log(`  RUNDOWNREC ULTIMATE CORE - EMULATION HUB ONLINE`);
        console.log(`  Localhost Processing Connected: http://localhost:${PORT}`);
        console.log(`=============================================================\n`);
    });
});
