import { Router } from 'express';
import { alertQueries, settingsQueries } from '../services/database';
import { randomBytes } from 'crypto';

const router = Router();

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const alerts = alertQueries.getAll.all();
    res.json(alerts);
  } catch (error: any) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts', message: error.message });
  }
});

// Get active alerts
router.get('/active', async (req, res) => {
  try {
    const alerts = alertQueries.getActive.all();
    res.json(alerts);
  } catch (error: any) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch active alerts', message: error.message });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const { symbol, condition, threshold, deliveryMethod, userEmail } = req.body;

    if (!symbol || !condition) {
      return res.status(400).json({ error: 'Symbol and condition are required' });
    }

    // If no delivery method specified, use default from settings
    let finalDeliveryMethod = deliveryMethod;
    let finalUserEmail = userEmail;

    if (!finalDeliveryMethod) {
      const settings = settingsQueries.get.get() as any;
      finalDeliveryMethod = settings.default_delivery_method;
      finalUserEmail = settings.email;
    }

    // Validate email if EMAIL delivery is selected
    if (
      (finalDeliveryMethod === 'EMAIL' || finalDeliveryMethod === 'BOTH') &&
      !finalUserEmail
    ) {
      return res.status(400).json({
        error: 'Email address is required for email delivery. Please set it in settings.',
      });
    }

    const id = randomBytes(16).toString('hex');

    alertQueries.insert.run(
      id,
      symbol.toUpperCase(),
      condition,
      threshold || null,
      finalDeliveryMethod,
      finalUserEmail || null
    );

    res.status(201).json({ message: 'Alert created', id });
  } catch (error: any) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert', message: error.message });
  }
});

// Toggle alert enabled/disabled
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled field must be a boolean' });
    }

    alertQueries.updateEnabled.run(enabled ? 1 : 0, id);
    res.json({ message: 'Alert updated', id, enabled });
  } catch (error: any) {
    console.error('Toggle alert error:', error);
    res.status(500).json({ error: 'Failed to toggle alert', message: error.message });
  }
});

// Reset triggered alert
router.patch('/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    alertQueries.reset.run(id);
    res.json({ message: 'Alert reset', id });
  } catch (error: any) {
    console.error('Reset alert error:', error);
    res.status(500).json({ error: 'Failed to reset alert', message: error.message });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    alertQueries.delete.run(id);
    res.json({ message: 'Alert deleted', id });
  } catch (error: any) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert', message: error.message });
  }
});

export default router;
