const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');

console.log("---------------------------------------------------");
console.log("🕵️  Deep Diagnosis of .env.local");
console.log("---------------------------------------------------");

if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local file does NOT exist!");
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

let geminiFound = false;

lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('GEMINI_API_KEY')) {
        geminiFound = true;
        const parts = trimmedLine.split('=');
        if (parts.length < 2) {
            console.error(`❌ Line ${index + 1}: GEMINI_API_KEY found but has no value (missing '=')`);
            return;
        }

        const key = parts.slice(1).join('=').trim();

        if (key.length === 0) {
            console.error(`❌ Line ${index + 1}: GEMINI_API_KEY is empty.`);
        } else {
            console.log(`✅ Line ${index + 1}: GEMINI_API_KEY found.`);
            console.log(`   - Length: ${key.length} characters`);
            console.log(`   - Starts with: ${key.substring(0, 4)}...`);
            console.log(`   - Ends with: ...${key.substring(key.length - 4)}`);

            if (key.startsWith('"') || key.startsWith("'")) {
                console.warn("⚠️  Warning: Key is wrapped in quotes. This is usually fine but sometimes causes issues if not closed.");
            }
            if (key.includes(' ')) {
                console.error("❌ Error: Key contains spaces! API keys should not have spaces.");
            }

            // Check for invisible characters
            const rawKey = parts.slice(1).join('=');
            if (rawKey.length !== rawKey.trim().length) {
                console.warn("⚠️  Warning: There is whitespace around your key. We will try to trim it.");
            }
        }
    }
});

if (!geminiFound) {
    console.error("❌ GEMINI_API_KEY variable NOT found in the file.");
} else {
    console.log("---------------------------------------------------");
    console.log("If the checks above look good (Length > 30, no spaces), then the file is likely correct.");
    console.log("Next step: We will try to use this key to make a dummy request.");
}
