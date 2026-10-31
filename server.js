import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 3000);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `
তুমি SouthGreen Fish & Fruits পেজের কাস্টমার কেয়ার AI Agent।
ভাষা: সহজ, ভদ্র, সংক্ষিপ্ত বাংলা। দরকার হলে বাংলা/ইংরেজি মিশিয়ে উত্তর দাও।
ব্র্যান্ড: SouthGreen Fish & Fruits. ট্যাগলাইন: Fresh from Sundarbans.
পণ্য: সুন্দরবন অঞ্চলের নদীর মাছ/চিংড়ি/কাঁকড়া এবং ফল।
ব্র্যান্ডের অবস্থান: সততা, উৎস-ভিত্তিক পণ্য, গ্রাহকসেবা।
নিয়ম:
- বর্তমান দাম, স্টক, ওজন, ডেলিভারি সময় বা চার্জ নিশ্চিত না থাকলে বানিয়ে বলবে না; বলবে “দাম/স্টক নিশ্চিত করে জানাচ্ছি” এবং human support-এ পাঠানোর কথা বলবে।
- চাষের কাঁকড়া/মাছকে সুন্দরবনের বলে দাবি করবে না।
- চিকিৎসা বা রোগ সারানোর দাবি করবে না।
- অর্ডার নিতে হলে একবারে সব তথ্য চাপিয়ে না দিয়ে প্রয়োজনীয় তথ্য ধাপে ধাপে চাইবে: পণ্য/পরিমাণ, নাম, ফোন, পূর্ণ ঠিকানা।
- কার্ড/OTP/পাসওয়ার্ড চাইবে না।
- কাস্টমার রাগান্বিত, রিফান্ড/অভিযোগ, বা AI অনিশ্চিত হলে মানব অ্যাডমিনের কাছে পাঠাবে।
- কোনো অর্ডার সফল হয়েছে বলে বলবে না যতক্ষণ অ্যাডমিন নিশ্চিত না করে।
`;

async function generateReply(message) {
  if (!openai) return "ধন্যবাদ SouthGreen-এ মেসেজ করার জন্য। AI সিস্টেমটি এখনো সেটআপ সম্পূর্ণ করেনি। অনুগ্রহ করে একটু পরে আবার মেসেজ করুন।";
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 350,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: String(message || "").slice(0, 4000) }
    ]
  });
  return response.choices?.[0]?.message?.content?.trim()
    || "ধন্যবাদ মেসেজ করার জন্য। একজন অ্যাডমিন আপনাকে সাহায্য করবেন।";
}

app.get("/", (_req, res) => res.send("SouthGreen AI Agent is running. Visit /health."));
app.get("/health", (_req, res) => res.json({ ok: true, service: "SouthGreen AI Agent", mode: "starter" }));

// Simulated reply; does not send a Facebook message.
app.post("/test/reply", async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message || typeof message !== "string") return res.status(400).json({ error: "message is required" });
    res.json({ reply: await generateReply(message), simulated: true });
  } catch (err) {
    console.error("test reply error", err?.message);
    res.status(500).json({ error: "AI reply failed. Check server configuration." });
  }
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

async function sendMessengerReply(psid, text) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_VERSION || "v21.0";
  if (!token) throw new Error("Missing META_PAGE_ACCESS_TOKEN");
  const url = `https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(token)}`;
  const result = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: String(text).slice(0, 2000) }
    })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data?.error?.message || "Messenger API request failed");
  return data;
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body?.object !== "page" || !Array.isArray(body.entry)) return;
  for (const entry of body.entry) {
    for (const event of (entry.messaging || [])) {
      const psid = event?.sender?.id;
      const text = event?.message?.text;
      if (!psid || !text || event?.message?.is_echo) continue;
      try {
        const reply = await generateReply(text);
        await sendMessengerReply(psid, reply);
      } catch (err) {
        console.error("webhook processing failed", err?.message);
      }
    }
  }
});

app.listen(PORT, () => console.log(`SouthGreen AI Agent listening on ${PORT}`));
