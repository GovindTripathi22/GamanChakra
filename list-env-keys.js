const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    console.log("Keys in .env.local:");
    lines.forEach(line => {
        const match = line.match(/^([^=]+)=/);
        if (match) console.log(match[1]);
    });
} catch (e) {
    console.log("Error reading .env.local");
}
