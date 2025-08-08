import { Router, Request, Response } from 'express';
import type { Server } from 'socket.io';
import AnalyticsIntelligenceService from '../services/analytics-intelligence-service';
import db from '../database';

export function createAnalyticsIntelligenceRouter(io: Server) {
  const router = Router();
  // Cast db as any to satisfy sqlite3.Database typing differences between wrappers
  const service = new AnalyticsIntelligenceService(db as any);

  // Failure patterns
  router.get('/failures/patterns', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const patterns = await service.getFailurePatterns(limit);
      res.json({ patterns });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve failure patterns', details: err.message });
    }
  });

  router.get('/failures/analyze', async (req: Request, res: Response) => {
    const testName = String(req.query.testName || '');
    if (!testName) { res.status(400).json({ error: 'Missing testName parameter' }); return; }
    try {
      const analysis = await service.analyzeSpecificTest(testName);
      if (!analysis) { res.status(404).json({ error: 'Test not found' }); return; }
      res.json({ analysis });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to analyze test', details: err.message });
    }
  });

  // Predict reliability
  router.get('/predict/reliability', async (req: Request, res: Response) => {
    const testName = String(req.query.testName || '');
    if (!testName) { res.status(400).json({ error: 'Missing testName parameter' }); return; }
    try {
      const prediction = await service.predictReliability(testName);
      res.json({ prediction });
    } catch (err: any) {
      res.status(500).json({ error: 'Prediction failed', details: err.message });
    }
  });

  // Prioritization queue
  router.get('/prioritization/queue', async (_req: Request, res: Response) => {
    try {
      const queue = await service.getPrioritizedTests();
      res.json({ queue });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to build prioritization queue', details: err.message });
    }
  });

  // Platform benchmarks
  router.get('/performance/benchmark', async (_req: Request, res: Response) => {
    try {
      const benchmarks = await service.getPlatformBenchmarks();
      res.json({ benchmarks });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to gather benchmarks', details: err.message });
    }
  });

  // Historical reliability (Phase 4)
  router.get('/reliability/history', async (req: Request, res: Response) => {
    const testName = String(req.query.testName || '');
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    if (!testName) { res.status(400).json({ error: 'Missing testName parameter' }); return; }
    try {
      const history = await service.getHistoricalReliability(testName, days);
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load historical reliability', details: err.message });
    }
  });

  // Performance trends (Phase 4)
  router.get('/trends/performance', async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    try {
      const trends = await service.getPerformanceTrends(days);
      res.json({ trends });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load performance trends', details: err.message });
    }
  });

  // Azure DevOps specific analytics endpoints
  router.get('/ado/pipelines/health', async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    try {
      const health = await service.getAdoPipelineHealth(days);
      res.json({ health });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load ADO pipeline health', details: err.message });
    }
  });

  router.get('/ado/pipelines/durations', async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    const buildDefinitionId = req.query.buildDefinitionId ? parseInt(String(req.query.buildDefinitionId), 10) : undefined;
    try {
      const durations = await service.getAdoDurations(days, buildDefinitionId);
      res.json({ durations });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load ADO durations', details: err.message });
    }
  });

  router.get('/ado/tasks/breakdown', async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    const buildDefinitionId = req.query.buildDefinitionId ? parseInt(String(req.query.buildDefinitionId), 10) : undefined;
    try {
      const tasks = await service.getAdoTaskBreakdown(days, buildDefinitionId);
      res.json({ tasks });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load ADO task breakdown', details: err.message });
    }
  });

  router.get('/ado/failures/summary', async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    try {
      const summary = await service.getAdoFailuresSummary(days);
      res.json({ summary });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load ADO failures summary', details: err.message });
    }
  });

  router.get('/ado/throughput', async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 14;
    try {
      const throughput = await service.getAdoThroughput(days);
      res.json({ throughput });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load ADO throughput', details: err.message });
    }
  });

  // Single failure categorization (Phase 4)
  router.get('/categorize', async (req: Request, res: Response) => {
    const testName = String(req.query.testName || '');
    if (!testName) { res.status(400).json({ error: 'Missing testName parameter' }); return; }
    try {
      const categorization = await service.categorizeFailure(testName);
      res.json({ categorization });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to categorize test', details: err.message });
    }
  });

  // Batch categorization (Phase 4)
  router.get('/categorize/batch', async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    try {
      const categories = await service.batchCategorize(limit);
      res.json({ categories });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to batch categorize tests', details: err.message });
    }
  });

  // Cost estimates
  router.get('/cost/estimates', async (_req: Request, res: Response) => {
    try {
      const benchmarks = await service.getPlatformBenchmarks();
      const costs = benchmarks.map(b => ({ platform: b.platform, costEstimate: b.costEstimate }));
      res.json({ costs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to estimate costs', details: err.message });
    }
  });

  // Notification routing preview
  router.get('/notifications/route', async (req: Request, res: Response) => {
    const testName = String(req.query.testName || '');
    if (!testName) { res.status(400).json({ error: 'Missing testName parameter' }); return; }
    try {
      const pattern = await service.analyzeSpecificTest(testName);
      if (!pattern) { res.status(404).json({ error: 'Test not found for routing analysis' }); return; }
      const routing = service.routeNotification(pattern);
      res.json({ routing });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compute routing', details: err.message });
    }
  });

  // Remediation suggestions
  router.get('/remediation/suggest', async (req: Request, res: Response) => {
    const testName = String(req.query.testName || '');
    if (!testName) { res.status(400).json({ error: 'Missing testName parameter' }); return; }
    try {
      const pattern = await service.analyzeSpecificTest(testName);
      if (!pattern) { res.status(404).json({ error: 'Test not found for remediation suggestions' }); return; }
      const remediation = service.suggestRemediation(pattern);
      res.json({ remediation });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate remediation suggestions', details: err.message });
    }
  });

  // Health endpoint
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      await service.getFailurePatterns(1); // light ping
      res.json({ status: 'ok' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', details: err.message });
    }
  });

  return router;
}

export default createAnalyticsIntelligenceRouter;
