import { checkDatabase } from '../services/health.service.js';

export async function getHealth(_req, res) {
  const database = await checkDatabase();
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    database,
  });
}
