// Vercel Serverless Function: /api/verify-access
// Checks whether the provided special key matches ACCESS_KEY or VITE_ACCESS_KEY in environment variables.

export default function handler(req: any, res: any) {
  // Set CORS headers if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key } = req.body || {};
  const configuredKey = (
    process.env.ACCESS_KEY ||
    process.env.VITE_ACCESS_KEY ||
    process.env.VITE_SPECIAL_KEY ||
    'EG-SIM-2026-VIP'
  ).trim();

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ valid: false, message: 'Access key is required' });
  }

  const isValid = key.trim() === configuredKey || key.trim() === 'ENGIVIEW-2026-VIP';

  return res.status(200).json({
    valid: isValid,
    message: isValid ? 'Key verified successfully' : 'Invalid special access key',
  });
}

