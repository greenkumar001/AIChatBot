const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512
    }
  };

  const res = await axios.post(url, body, { timeout: 20000 });

  const text =
    res?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    JSON.stringify(res.data);

  return text;
}

module.exports = { callGemini };
