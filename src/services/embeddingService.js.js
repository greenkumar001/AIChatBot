const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent";

/**
 * Create embedding for given text using Gemini API
 */
async function embedText(text) {
  try {
    const response = await axios.post(
      `${GEMINI_EMBED_URL}?key=${GEMINI_API_KEY}`,
      {
        model: "models/embedding-001",
        content: { parts: [{ text }] }
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return response.data.embedding.values;
  } catch (err) {
    console.error("❌ Error generating embedding:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { embedText };
