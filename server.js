// ============================================
// ADSTORE CMS PROXY - RAILWAY
// HTTP-only proxy hacia la edge function tablet-cms-feed.
// Existe porque algunos proveedores de CMS solo aceptan URLs HTTP planas.
// ============================================

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FATAL: faltan variables SUPABASE_URL y/o SUPABASE_ANON_KEY');
  process.exit(1);
}

app.use(cors());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ service: 'AdStore CMS Proxy', version: '1.0.0' });
});

// Main proxy route — siempre 200 OK con JSON plano
app.get('/cms/:id', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json');

  try {
    const target = `${SUPABASE_URL}/functions/v1/tablet-cms-feed?id=${encodeURIComponent(req.params.id)}`;
    const r = await fetch(target, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { play: false, reason: 'invalid_upstream_response' };
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(200).json({ play: false, reason: 'proxy_error' });
  }
});

// 404 -> también responde play:false para mantener compatibilidad CMS
app.use((_req, res) => {
  res.status(200).json({ play: false, reason: 'not_found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AdStore CMS Proxy escuchando en puerto ${PORT}`);
});
