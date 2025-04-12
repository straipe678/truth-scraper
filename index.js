const express = require("express");
const puppeteer = require("puppeteer-core");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const chrome = require("chrome-aws-lambda");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Rate limiter: 100 requests per IP per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});
app.use(limiter);

// 🧠 Simple in-memory cache
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
    // Launch Puppeteer with Chrome AWS Lambda settings
    const browser = await puppeteer.launch({
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
      args: chrome.args,
      defaultViewport: chrome.defaultViewport
    });
    
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    // Go to Truth Social page
    await page.goto("https://truthsocial.com/@realDonaldTrump", { waitUntil: "domcontentloaded" });

    // Wait for posts to load
    await page.waitForSelector("div[data-testid='postContent']");

    // Extract post content
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll("div[data-testid='postContent']");
      return Array.from(postElements).map(post => post.innerText.trim());
    });

    await browser.close();

    // Update cache
    cache = {
      timestamp: now,
      data: posts.slice(0, 5)  // Return the first 5 posts
    };

    res.json(cache.data);
  } catch (err) {
    console.error("SCRAPE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch content." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
