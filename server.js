import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
const KEY = process.env.YOUTUBE_API_KEY; // server-side only, never sent to the browser
const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')));

const hits = new Map(), cache = new Map();
function limited(ip) { // 30 searches/minute/IP
  const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000);
  a.push(now); hits.set(ip, a); return a.length > 30;
}
app.get('/api/health', (_, res) => res.json({ search: !!KEY }));
app.get('/api/search', async (req, res) => {
  if (!KEY) return res.status(503).json({ error: 'Search not configured: set YOUTUBE_API_KEY on the server.' });
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) return res.status(400).json({ error: 'Query too short.' });
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many searches. Try again in a minute.' });
  const hit = cache.get(q.toLowerCase());
  if (hit && Date.now() - hit.t < 600000) return res.json(hit.d);
  try {
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.search = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', videoCategoryId: '10', maxResults: '12', q, key: KEY });
    const r = await fetch(u), j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'YouTube error: ' + (j.error?.message || r.status) });
    const d = (j.items || []).map(i => ({ id: i.id.videoId, t: i.snippet.title, a: i.snippet.channelTitle }));
    cache.set(q.toLowerCase(), { t: Date.now(), d });
    res.json(d);
  } catch { res.status(502).json({ error: 'Could not reach YouTube.' }); }
});
app.listen(process.env.PORT || 3000, () => console.log('Cast running. Search ' + (KEY ? 'enabled' : 'DISABLED (no YOUTUBE_API_KEY)')));
