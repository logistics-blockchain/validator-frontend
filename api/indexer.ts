import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel provides original path in x-vercel-forwarded-for or we can use x-matched-path
  // The rewrite passes the original path as a query param, or we use headers
  // Actually, Vercel preserves original URL in the 'x-forwarded-host' + original path
  // The safest way: use the 'path' query parameter from the rewrite
  const pathFromQuery = req.query.path;
  const pathAfterIndexer = Array.isArray(pathFromQuery)
    ? pathFromQuery.join('/')
    : (pathFromQuery || '');

  const indexerTarget = process.env.INDEXER_PROXY_TARGET || 'http://130.61.22.253:8545';

  // Build query string excluding the 'path' param we use for routing
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v));
      } else if (value) {
        queryParams.append(key, value);
      }
    }
  }
  const queryString = queryParams.toString();
  const targetUrl = `${indexerTarget}/api/${pathAfterIndexer}${queryString ? '?' + queryString : ''}`;

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Indexer proxy error:', error);
    return res.status(500).json({ success: false, error: 'Indexer request failed' });
  }
}
