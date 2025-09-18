require("dotenv").config();
const express = require("express");
const cors = require("cors");
const chatRoutes = require("./routes/chat");
const { ensureCollectionAndData } = require("./services/qdrantClient");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/chat", chatRoutes);

const PORT = process.env.PORT || 4000;

// Ensure Qdrant collection + sample data before starting
ensureCollectionAndData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  });
