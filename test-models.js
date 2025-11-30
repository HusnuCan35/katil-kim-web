const { GoogleGenerativeAI } = require("@google/generative-ai");

require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // For some reason listModels is not directly on genAI, but on the model manager or similar?
        // Actually the SDK might not expose listModels directly in the main class in all versions.
        // Let's try to just use a known working model like 'gemini-1.0-pro' if this fails.
        // But let's try to find the model.

        // According to docs, we might not be able to list easily with just the helper.
        // Let's try to just run a simple generation with 'gemini-1.5-flash' to verify if it works in isolation.

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works:", result.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash failed:", error.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro works:", result.response.text());
    } catch (error) {
        console.error("gemini-pro failed:", error.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.0-pro works:", result.response.text());
    } catch (error) {
        console.error("gemini-1.0-pro failed:", error.message);
    }
}

listModels();
