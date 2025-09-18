const express = require('express');
const router = express.Router();
const { client: redisClient, pushMessage, getHistory, clearHistory } = require('../services/redisClient');
const { searchEmbedding } = require('../services/qdrantClient');
const { callGemini } = require('../services/geminiClient');
const axios = require('axios');

const TOP_K = parseInt(process.env.TOP_K || "5", 10);

async function embedText(text) {
 
  const embedUrl = process.env.EMBEDDING_API_URL;
  if (!embedUrl) throw new Error("Set EMBEDDING_API_URL environment variable");
  const resp = await axios.post(embedUrl, { text });
  return resp.data.embedding; // expect an array of floats
}


router.post('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;
  try {
    console.log("User message:", message);

    await pushMessage(sessionId, { role: 'user', text: message });
    console.log("✅ Saved user message to Redis");

    const qEmbedding = await embedText(message);
    console.log("✅ Got embedding, length:", qEmbedding.length);

    const qdrantResp = await searchEmbedding(qEmbedding, TOP_K);
    console.log("✅ Qdrant response:", qdrantResp);

    const passages = (qdrantResp?.result ?? qdrantResp?.points ?? [])
      .map(p => p.payload?.text ?? p.payload?.content ?? p.payload)
      .filter(Boolean)
      .slice(0, TOP_K);

    console.log("✅ Passages:", passages);

    const prompt = [
      "You are a helpful assistant answering questions using the provided news passages.",
      "=== Context passages ===",
      passages.join("\n\n---\n\n"),
      "=== End Context ===",
      `User: ${message}`,
      "Answer concisely and mention the passage source if available."
    ].join("\n\n");

    const reply = await callGemini(prompt);
    console.log("✅ Gemini reply:", reply);

    await pushMessage(sessionId, { role: 'bot', text: reply });
    console.log("✅ Saved bot reply to Redis");

    return res.json({ reply });
  } catch (err) {
    console.error("❌ Error in chat route:", err.response?.data || err.message);
return res.status(500).json({
  error: err.message || "Server error",
  details: err.response?.data
});
  }
});


router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const history = await getHistory(sessionId);
  res.json({ sessionId, history });
});

router.delete('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  await clearHistory(sessionId);
  res.json({ ok: true });
});

module.exports = router;
