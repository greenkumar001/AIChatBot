const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { embedText } = require("./embeddingService.js"); 

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = "news_collection";
const VECTOR_SIZE = 384; 

async function ensureCollectionAndData() {
  try {
   
    await axios.get(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      headers: { "api-key": QDRANT_API_KEY },
    });
    console.log(`✅ Collection '${COLLECTION_NAME}' already exists`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`⚠️ Collection '${COLLECTION_NAME}' not found. Creating...`);

      
      await axios.put(
        `${QDRANT_URL}/collections/${COLLECTION_NAME}`,
        {
          vectors: {
            size: VECTOR_SIZE,
            distance: "Cosine",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": QDRANT_API_KEY,
          },
        }
      );

      console.log(`✅ Collection '${COLLECTION_NAME}' created successfully`);

    
      const newsPath = path.join(__dirname, "../data/news.json");
      const newsData = JSON.parse(fs.readFileSync(newsPath, "utf-8"));

      const points = [];
      for (const article of newsData) {
        const text = `${article.title}. ${article.content}`;
        const embedding = await embedText(text);

        points.push({
          id: article.id,
          vector: embedding,
          payload: {
            title: article.title,
            content: article.content,
          },
        });
      }

     
      await axios.put(
        `${QDRANT_URL}/collections/${COLLECTION_NAME}/points?wait=true`,
        { points },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": QDRANT_API_KEY,
          },
        }
      );

      console.log(`✅ Inserted ${points.length} news articles into '${COLLECTION_NAME}'`);
    } else {
      console.error("❌ Error checking/creating collection:", error.message);
      throw error;
    }
  }
}

async function searchEmbedding(vector) {
  try {
    const response = await axios.post(
      `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`,
      { vector, top: 5 },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": QDRANT_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Error in searchEmbedding:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { ensureCollectionAndData, searchEmbedding };
