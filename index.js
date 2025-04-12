const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter: 100 requests per IP per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 100
});

app.use(limiter);

// In-memory cache to avoid hitting Truth Social on every request
let cache = {
  timestamp: 0,
  data: []
};

app.get("/api/trump-posts", async (req, res) => {
  const now = Date.now();

  // Serve from cache if it's still fresh
  if (now - cache.timestamp < 10 * 60 * 1000) {
    return res.json(cache.data);
  }

  try {
    const response = await axios.get("https://truthsocial.com/@realDonaldTrump", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const posts = [];

    $("div[data-testid='postContent']").each((i, el) => {
      const text = $(el).text().trim();
      if (text) posts.push(text);
    });

    // Update the cache
    cache = {
      timestamp: now,
      data: posts.slice(0, 5)
    };

    res.json(cache.data);
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    res.status(500).json({ error: "Failed to fetch content." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
