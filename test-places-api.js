const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
        // Remove quotes if present
        apiKey = apiKey.replace(/^["']|["']$/g, '');
    }
} catch (e) {
    console.error("Could not read .env.local:", e.message);
    process.exit(1);
}

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

console.log("Testing API Key:", apiKey.substring(0, 5) + "...");

const query = "Taj Mahal";
const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

console.log("Fetching:", url.replace(apiKey, "HIDDEN_KEY"));

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Status:", json.status);
            if (json.error_message) {
                console.error("Error Message:", json.error_message);
            }
            if (json.results && json.results.length > 0) {
                console.log("Found results:", json.results.length);
                const first = json.results[0];
                console.log("Name:", first.name);
                if (first.photos && first.photos.length > 0) {
                    console.log("First photo reference:", first.photos[0].photo_reference.substring(0, 20) + "...");

                    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${first.photos[0].photo_reference}&key=${apiKey}`;

                    // Verify photo URL
                    https.get(photoUrl, (photoRes) => {
                        console.log("Photo URL Status:", photoRes.statusCode);
                        if (photoRes.statusCode === 302 || photoRes.statusCode === 200) {
                            console.log("Photo URL works!");
                        } else {
                            console.log("Photo URL failed.");
                        }
                    });

                } else {
                    console.log("No photos found in result.");
                }
            } else {
                console.log("No results found.");
            }
        } catch (e) {
            console.error("Error parsing JSON:", e.message);
            console.log("Raw Data:", data);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e.message);
});
