const http = require('http');
const fs = require('fs');

const PORT = 2060;
let config = { developerName: "RunDownDev", discordWebhookUrl: "" };

if (fs.existsSync('./config.json')) {
    try { config = JSON.parse(fs.readFileSync('./config.json', 'utf8')); } 
    catch (e) { console.warn("[!] Failed to read config.json, using defaults."); }
}

const DISCORD_WEBHOOK_URL = config.discordWebhookUrl;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'POST' && req.url === '/api/images/v1/log') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        
        req.on('end', async () => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');

            if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("YOUR_DISCORD_WEBHOOK")) {
                return;
            }

            try {
                const payload = JSON.parse(body);
                if (payload && payload.ImageData) {
                    console.log(`\n[Camera Bot] 📸 Intercepted camera data stream...`);
                    
                    const base64Data = payload.ImageData.replace(/^data:image\/png;base64,/, "");
                    const imageBuffer = Buffer.from(base64Data, 'base64');

                    const formData = new FormData();
                    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
                    formData.append('files', imageBlob, 'recroom_2019_snap.png');

                    const embedPayload = {
                        username: "RunDownRec Camera",
                        content: `🎒 **New 2019 Photo Shared by ${config.developerName}!**`
                    };
                    formData.append('payload_json', JSON.stringify(embedPayload));

                    await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', body: formData });
                    console.log("\x1b[32m[SUCCESS] Photo safely pushed out to Discord channel!\x1b[0m");
                }
            } catch (err) {
                console.error("[-] Camera Bot network processing error:", err.message);
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 📸 RUNDOWNREC STANDALONE DISCORD CAMERA SERVICE WORKER`);
    console.log(` Monitoring standalone image requests on Port: ${PORT}`);
    console.log(`=============================================================\n`);
});
