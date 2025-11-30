const fs = require('fs');
const path = require('path');

// 1. Read API Key
const envPath = path.resolve('.env.local');
let apiKey = '';

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/GEMINI_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("❌ Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

console.log(`🔑 Testing Key: ${apiKey.substring(0, 5)}...`);

// 2. Fetch Models directly from API
async function getModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);
            console.error(JSON.stringify(data, null, 2));
            return;
        }

        console.log("\n✅ API Connection Successful! Available Models:");
        console.log("------------------------------------------------");

        if (data.models) {
            data.models.forEach(model => {
                // Filter for generateContent supported models
                if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${model.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("No models found in response.");
        }
        console.log("------------------------------------------------");

    } catch (error) {
        console.error("❌ Network Error:", error.message);
    }
}

getModels();
