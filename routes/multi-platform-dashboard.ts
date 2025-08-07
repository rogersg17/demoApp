/**
 * Multi-Platform Dashboard Routes (Week 18)
 * Base Path: /api/dashboard/multi-platform
 */
import express from 'express';
import { db } from '../server';
import MultiPlatformDashboardService from '../services/multi-platform-dashboard-service';

// Singleton service instance (attached to process)
let service: MultiPlatformDashboardService | null = null;
function getService(): MultiPlatformDashboardService {
  if (!service) {
    service = new MultiPlatformDashboardService(db.db);
    service.initialize().catch((e) => console.warn('Dashboard service init error', e));
    // Wire events to websocket lazily (avoid circular import at top-level) - require inline
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { io } = require('../server');
      service.on('update', (summary) => {
        io.to('dashboard').emit('dashboard:multi-platform:update', summary);
      });
    } catch (e) {
      console.warn('WebSocket integration unavailable for multi-platform dashboard');
    }
  }
  return service;
}

const router = express.Router();

// Unified summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await getService().getUnifiedSummary(Boolean(req.query.force));
    res.json({ success: true, data: summary, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to build summary', message: (e as Error).message });
  }
});

// Correlate single test across platforms
router.get('/correlate', async (req, res) => {
  try {
    const testName = (req.query.testName as string) || (req.query.q as string);
    if (!testName) {
      res.status(400).json({ success: false, error: 'Missing testName query parameter' });
      return;
    }
    const result = await getService().correlateTest(testName);
    if (!result) {
      res.status(404).json({ success: false, error: 'Not found', message: 'No occurrences found' });
      return;
    }
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to correlate test', message: (e as Error).message });
  }
});

// Basic health endpoint
router.get('/health', async (_req, res) => {
  res.json({ success: true, data: { service: 'MultiPlatformDashboardService', status: 'ok' }, timestamp: new Date().toISOString() });
});

export default router;
