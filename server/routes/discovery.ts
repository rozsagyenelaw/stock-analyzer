import { Router } from 'express';
import {
  initializeScans,
  initializeStockUniverse,
  getActiveScans,
  runScan,
  getScanResults,
  cleanupExpiredResults,
} from '../services/stockDiscovery';

const router = Router();

// Initialize on first import
let initialized = false;
if (!initialized) {
  try {
    initializeStockUniverse();
    initializeScans();
    initialized = true;
  } catch (error) {
    console.error('Error initializing discovery:', error);
  }
}

/**
 * GET /api/discovery/scans - Get all available scans
 */
router.get('/scans', (req, res) => {
  try {
    const scans = getActiveScans();
    res.json(scans);
  } catch (error: any) {
    console.error('Error fetching scans:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/discovery/scan/:scanId/results - Get cached results for a scan
 */
router.get('/scan/:scanId/results', (req, res) => {
  try {
    const { scanId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const results = getScanResults(scanId, limit);

    res.json({
      scan_id: scanId,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error fetching scan results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/discovery/scan/:scanId/run - Run a scan
 */
router.post('/scan/:scanId/run', async (req, res) => {
  try {
    const { scanId } = req.params;
    const { useAI } = req.body;

    // Check if we have recent cached results
    const cachedResults = getScanResults(scanId, 1);
    if (cachedResults.length > 0) {
      const cacheAge = Date.now() - new Date(cachedResults[0].scanned_at).getTime();
      if (cacheAge < 60 * 60 * 1000) { // Less than 1 hour old
        return res.json({
          message: 'Using cached results',
          cached: true,
          age_minutes: Math.floor(cacheAge / 60000),
          results: getScanResults(scanId, 20),
        });
      }
    }

    // Run the scan
    console.log(`Running scan ${scanId} (AI: ${useAI || false})...`);
    const results = await runScan(scanId, useAI || false);

    res.json({
      message: 'Scan completed successfully',
      cached: false,
      count: results.length,
      results: results.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Error running scan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/discovery/run-all - Run all active scans
 */
router.post('/run-all', async (req, res) => {
  try {
    const { useAI } = req.body;
    const scans = getActiveScans();

    const results: any[] = [];

    for (const scan of scans) {
      try {
        // Check cache first
        const cached = getScanResults(scan.id, 1);
        if (cached.length > 0) {
          const cacheAge = Date.now() - new Date(cached[0].scanned_at).getTime();
          if (cacheAge < 60 * 60 * 1000) {
            results.push({
              scan_id: scan.id,
              scan_name: scan.scan_name,
              cached: true,
              count: cached.length,
            });
            continue;
          }
        }

        // Run scan
        const scanResults = await runScan(scan.id, useAI || false);
        results.push({
          scan_id: scan.id,
          scan_name: scan.scan_name,
          cached: false,
          count: scanResults.length,
        });

        // Rate limiting between scans
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`Error running scan ${scan.scan_name}:`, error);
        results.push({
          scan_id: scan.id,
          scan_name: scan.scan_name,
          error: error.message,
        });
      }
    }

    res.json({
      message: 'All scans completed',
      results,
    });
  } catch (error: any) {
    console.error('Error running all scans:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/discovery/cleanup - Clean up expired results
 */
router.delete('/cleanup', (req, res) => {
  try {
    const deleted = cleanupExpiredResults();
    res.json({ message: `Deleted ${deleted} expired results` });
  } catch (error: any) {
    console.error('Error cleaning up:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/discovery/summary - Get summary of all scans
 */
router.get('/summary', (req, res) => {
  try {
    const scans = getActiveScans();
    const summary = scans.map(scan => {
      const results = getScanResults(scan.id, 10);
      return {
        scan_id: scan.id,
        scan_name: scan.scan_name,
        description: scan.description,
        opportunities_count: results.length,
        top_opportunity: results[0] || null,
        last_scan: results[0]?.scanned_at || null,
      };
    });

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
