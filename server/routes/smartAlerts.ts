import express from 'express';
import {
  generateAlertSuggestions,
  getAlertTemplates,
  createAlertsFromTemplate,
  evaluateMultiConditionAlert,
  AlertCondition
} from '../services/smartAlerts';

const router = express.Router();

/**
 * GET /api/smart-alerts/suggestions/:symbol
 * Get AI-powered alert suggestions for a stock
 */
router.get('/suggestions/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    console.log(`Generating alert suggestions for ${symbol.toUpperCase()}...`);

    const suggestions = await generateAlertSuggestions(symbol.toUpperCase());

    res.json({
      symbol: symbol.toUpperCase(),
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating alert suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/smart-alerts/templates
 * Get all pre-configured alert templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = getAlertTemplates();

    res.json({
      templates,
      count: templates.length
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/smart-alerts/from-template
 * Create alerts for multiple symbols from a template
 */
router.post('/from-template', async (req, res) => {
  try {
    const { symbols, templateId, customThresholds } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'symbols array is required' });
    }

    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }

    if (symbols.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 symbols allowed' });
    }

    console.log(`Creating alerts from template ${templateId} for ${symbols.length} symbols...`);

    const results = await createAlertsFromTemplate(
      symbols.map(s => s.toUpperCase()),
      templateId,
      customThresholds
    );

    res.json({
      created: results.length,
      alerts: results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating alerts from template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/smart-alerts/evaluate
 * Evaluate multi-condition alert
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { symbol, conditions } = req.body as { symbol: string; conditions: AlertCondition[] };

    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({ error: 'conditions array is required' });
    }

    console.log(`Evaluating multi-condition alert for ${symbol.toUpperCase()}...`);

    const result = await evaluateMultiConditionAlert(symbol.toUpperCase(), conditions);

    res.json({
      symbol: symbol.toUpperCase(),
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error evaluating alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/smart-alerts/batch-suggestions
 * Get alert suggestions for multiple stocks at once
 */
router.post('/batch-suggestions', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'symbols array is required' });
    }

    if (symbols.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 symbols allowed for batch suggestions' });
    }

    console.log(`Generating batch alert suggestions for ${symbols.length} symbols...`);

    // Process in parallel with limit
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const suggestions = await generateAlertSuggestions(symbol.toUpperCase());
          return {
            symbol: symbol.toUpperCase(),
            suggestions,
            success: true
          };
        } catch (error: any) {
          return {
            symbol: symbol.toUpperCase(),
            error: error.message,
            success: false
          };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      total: symbols.length,
      successful: successful.length,
      failed: failed.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating batch suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
