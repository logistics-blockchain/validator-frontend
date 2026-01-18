import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rpcTarget = process.env.RPC_PROXY_TARGET || 'http://130.61.22.253:8545';

  if (!rpcTarget) {
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'RPC_PROXY_TARGET not configured' },
      id: null
    });
  }

  try {
    const response = await fetch(rpcTarget, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error: RPC request failed' },
      id: null
    });
  }
}
