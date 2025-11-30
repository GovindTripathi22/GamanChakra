import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Manually parse .env.local because dotenv might not be available/configured in this script context
function loadEnv() {
    try {
        const envPath = path.resolve('.env.local');
        if (!fs.existsSync(envPath)) {
            console.error("❌ .env.local file not found!");
            return {};
        }
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error("❌ Error loading .env.local:", e);
        return {};
    }
}

const env = loadEnv();
const apiKey = env.GEMINI_API_KEY;

console.log("---------------------------------------------------");
console.log("🔍 Testing Gemini API Key...");
console.log("---------------------------------------------------");

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing in .env.local");
    console.log("👉 Please add it: GEMINI_API_KEY=your_key_here");
    process.exit(1);
}

console.log(`🔑 Key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);

async function testKey() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        console.log("📡 Sending test request to Gemini...");
        const result = await model.generateContent("Say 'Hello, World!' if you can hear me.");
        const response = await result.response;
        const text = response.text();

        console.log("✅ Success! Gemini responded:");
        console.log(`   "${text.trim()}"`);
        console.log("---------------------------------------------------");
        console.log("🎉 Your API key is WORKING correctly.");
        console.log("---------------------------------------------------");

    } catch (error) {
        console.error("❌ API Request Failed!");
        console.error("---------------------------------------------------");
        console.error("Error details:", error.message);
        if (error.message.includes("API_KEY_INVALID")) {
            console.error("👉 The API key is INVALID. Please check for typos or generate a new one.");
        } else if (error.message.includes("quota")) {
            console.error("👉 You have exceeded your API quota.");
        } else {
            console.error("👉 Check your internet connection or firewall.");
        }
        console.log("---------------------------------------------------");
    }
}

testKey();
