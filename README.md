# SouthGreen AI Auto Reply Agent

বাংলাদেশি Facebook Page inbox-এর জন্য Meta Messenger webhook + OpenAI ভিত্তিক starter app.

## Included
- Bengali-first AI replies
- Product/brand context for SouthGreen Fish & Fruits
- Webhook verification and Messenger send API
- Basic admin health endpoint
- Local test endpoint (no real Facebook message required)

## Requirements
- Node.js 20+
- Meta Developer app with Messenger product and Page access token
- OpenAI API key
- Public HTTPS deployment (Render/Railway/Fly.io/VPS)

## Local setup
1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm start`
4. Test: `curl http://localhost:3000/health`
5. Simulated reply:
   `curl -X POST http://localhost:3000/test/reply -H 'Content-Type: application/json' -d '{"message":"আপনাদের কাঁকড়া আছে? ডেলিভারি কত?"}'`

## Meta webhook
Set callback URL to `https://YOUR_HOST/webhook` and verify token to `META_VERIFY_TOKEN`.
Subscribe the Page to `messages` and `messaging_postbacks`.
Use Meta's webhook test tool to send a test message.

## Important
This is a starter implementation, not yet connected to your Facebook Page. Never put access tokens in frontend code or public GitHub repositories. Before going live, confirm product prices, delivery rules, and order workflow. The agent does not invent prices; it asks an admin if catalog data is missing.
