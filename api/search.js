export default async function handler(req, res) {
  const KEY = process.env.YOUTUBE_API_KEY; // server-side only
  if (!KEY) return res.status(503).json({ error: 'Search not configured: set YOUTUBE_API_KEY.' });
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) return res.status(400).json({ error: 'Query too short.' });
  try {
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.search = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', videoCategoryId: '10', maxResults: '12', q, key: KEY });
    const r = await fetch(u), j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'YouTube error: ' + (j.error?.message || r.status) });
    res.setHeader('Cache-Control', 's-maxage=600');
    res.json((j.items || []).map(i => ({ id: i.id.videoId, t: i.snippet.title, a: i.snippet.channelTitle })));
  } catch { res.status(502).json({ error: 'Could not reach YouTube.' }); }
}
