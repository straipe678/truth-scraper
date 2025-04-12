const express = require("express");
const untruthr = require("untruthr");  // Import untruthr
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Rate limiter: 100 requests per IP per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100  // limit each IP to 100 requests per minute
});

app.use(limiter);

let cache = {
  timestamp: 0,
  data: []
};

app.get("/api/trump-posts", async (req, res) => {
  const now = Date.now();

  // If cache is fresh (10 mins)
  if (now - cache.timestamp < 10 * 60 * 1000) {
    return res.json(cache.data);
  }

  try {
    // Use untruthr to scrape content from Truth Social
    const posts = await untruthr.scrape("https://truthsocial.com/@realDonaldTrump");

    // Update cache with the scraped data
    cache = {
      timestamp: now,
      data: posts.slice(0, 5)  // Take the first 5 posts
    };

    res.json(cache.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch content." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
