import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { console.error("No API Key"); return; }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTest = ["gemini-1.5-flash", "gemini-pro"];

    for (const modelName of modelsToTest) {
        console.log(`Testing: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent("Hi");
            console.log(`SUCCESS: ${modelName}`);
            return;
        } catch (error) {
            console.log(`FAILED: ${modelName} - ${error.message.substring(0, 100)}`);
        }
    }
}

listModels();
