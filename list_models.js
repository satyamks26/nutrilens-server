require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Actually, the SDK might not expose listModels directly. Let's use fetch.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Supported Models:");
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

run();
