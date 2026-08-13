// ============================================================================
// RUNDOWNREC AUTOMATED SETUP & CONTROLLER MENU
// Run this file using: node setup.js or npm start
// ============================================================================

const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const CONFIG_PATH = './config.json';
const DB_PATH = './rundown_database.db';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// Visual Anchor ASCII Banner for RunDownRec
function printBanner() {
    console.clear();
    console.log(`\x1b[36m`);
    console.log(`▒█▀▀█ ▒█░░▒█ ▒█▄░▒█ ▒█▀▀▄ ▒█▀▀▀█ ▒█░░▒█ ▒█▄░▒█ ▒█▀▀█ ▒█▀▀▀ ▒█▀▀█`);
    console.log(`▒█▄▄▀ ▒█░░▒█ ▒█▒█▒█ ▒█░▒█ ▒█░░▒█ ▒█░░▒█ ▒█▒█▒█ ▒█▄▄▀ ▒█▀▀▀ ▒█░░░`);
    console.log(`▒█░▒█ ░▀▄▄▄▀ ▒█░░▀█ ▒█▄▄▀ ▒█▄▄▄█ ░▀▄▄▄▀ ▒█░░▀█ ▒█░▒█ ▒█▄▄▄ ▒█▄▄█`);
    console.log(`\n            === AUTOMATED SETUP & ENVIRONMENT WIZARD ===\x1b[0m`);
    console.log(`==================================================================`);
}

async function verifyDependencies() {
    console.log(`\n[1/4] Checking environment configurations...`);
    if (!fs.existsSync('./node_modules')) {
        console.log(`\x1b[33m[!] Node modules missing. Running clean project installation...\x1b[0m`);
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log(`\x1b[32m[+] Dependencies compiled successfully.\x1b[0m`);
        } catch (err) {
            console.error(`\x1b[31m[-] Automatic installation failed. Run 'npm install' manually.\x1b[0m`);
            process.exit(1);
        }
    } else {
        console.log(`\x1b[32m[+] Dependencies verified.\x1b[0m`);
    }
}

async function handleConfiguration() {
    console.log(`\n[2/4] Resolving configuration files...`);
    let currentConfig = { port: 2059, startingTokens: 50000, developerName: "RunDownDev" };

    if (fs.existsSync(CONFIG_PATH)) {
        currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        console.log(`[+] Found existing config.json profile.`);
    } else {
        console.log(`[*] Generating a fresh configuration schema...`);
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 4));
    }
    return currentConfig;
}

async function initializeDatabase(config) {
    console.log(`\n[3/4] Initializing persistent local SQLite database tables...`);
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, username TEXT, displayName TEXT, xp INTEGER, level INTEGER, tokens INTEGER);
        CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, name TEXT, description TEXT, creatorId INTEGER, maxPlayers INTEGER, sceneName TEXT);
    `);

    const checkPlayer = await db.get('SELECT * FROM players WHERE id = 1');
    if (!checkPlayer) {
        await db.run(
            'INSERT INTO players (id, username, displayName, xp, level, tokens) VALUES (1, ?, ?, 99999, 50, ?)',
            [config.developerName, `${config.developerName} Creator`, config.startingTokens]
        );
        await db.run('INSERT INTO rooms (id, name, description, creatorId, maxPlayers, sceneName) VALUES ("dorm", "DormRoom", "Your private home.", 1, 1, "DormRoom")');
        console.log(`\x1b[32m[+] Created base schema profiles with customized token values.\x1b[0m`);
    } else {
        console.log(`[+] Database file clean and running.`);
    }
    await db.close();
}

async function interactiveMenu() {
    printBanner();
    const config = await handleConfiguration();

    console.log(`\nChoose an action profile item from the dashboard:`);
    console.log(` 🚀 1. Boot up RunDownRec Live Environment`);
    console.log(` ⚙️  2. Customize Server Configuration (Port, Tokens, Username)`);
    console.log(` 🧹 3. Wipe Database Reset (Fresh Install)`);
    console.log(` ❌ 4. Close Setup Wizard`);

    const selection = await askQuestion(`\nSelect an option number [1-4]: `);

    if (selection === '1') {
        await verifyDependencies();
        await initializeDatabase(config);
        console.log(`\n[4/4] Passing controls to server.js kernel...\n`);
        rl.close();
        require('child_process').fork('./server.js');

    } else if (selection === '2') {
        printBanner();
        console.log(`\n--- CUSTOM CONFIGURATION EDITOR ---`);
        const newPort = await askQuestion(`Change API Port [Current: ${config.port}]: `) || config.port;
        const newName = await askQuestion(`Developer Profile Username [Current: ${config.developerName}]: `) || config.developerName;
        const newTokens = await askQuestion(`Starting Token Balance [Current: ${config.startingTokens}]: `) || config.startingTokens;

        const updatedConfig = {
            port: parseInt(newPort),
            startingTokens: parseInt(newTokens),
            developerName: newName
        };

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 4));
        console.log(`\x1b[32m\n[+] Settings saved to config.json. Realignment complete!\x1b[0m`);
        
        if (fs.existsSync(DB_PATH)) {
            const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
            await db.run('UPDATE players SET username = ?, displayName = ?, tokens = ? WHERE id = 1', [newName, `${newName} Creator`, parseInt(newTokens)]);
            await db.close();
            console.log(`\x1b[32m[+] Database tables realigned with new profile data.\x1b[0m`);
        }

        await askQuestion(`\nPress Enter to return to the core dashboard menu...`);
        interactiveMenu();

    } else if (selection === '3') {
        const confirm = await askQuestion(`\n\x1b[31m[WARNING] Are you sure you want to delete all custom rooms and data? (y/N): \x1b[0m`);
        if (confirm.toLowerCase() === 'y') {
            if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
            if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
            console.log(`\x1b[32m[+] Local sandbox storage successfully wiped clean.\x1b[0m`);
        }
        await askQuestion(`\nPress Enter to return to the core dashboard menu...`);
        interactiveMenu();

    } else {
        console.log(`Exiting control console workspace.`);
        rl.close();
        process.exit(0);
    }
}

interactiveMenu().catch(err => {
    console.error("Setup Wizard tracking exception:", err);
    rl.close();
});
