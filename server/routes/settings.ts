import { Router } from 'express';
import { settingsQueries } from '../services/database';
import { sendTestEmail } from '../services/email';

const router = Router();

// Get settings
router.get('/', async (req, res) => {
  try {
    const settings = settingsQueries.get.get() as any;

    res.json({
      email: settings.email,
      defaultDeliveryMethod: settings.default_delivery_method,
      darkMode: settings.dark_mode === 1,
      defaultRiskPercent: settings.default_risk_percent,
      indicatorWeights: JSON.parse(settings.indicator_weights),
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings', message: error.message });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const { email, defaultDeliveryMethod, darkMode, defaultRiskPercent, indicatorWeights } =
      req.body;

    // Validate indicator weights if provided
    if (indicatorWeights) {
      const requiredKeys = [
        'rsi',
        'macd',
        'movingAverages',
        'bollingerBands',
        'volume',
        'stochastic',
        'obv',
      ];
      for (const key of requiredKeys) {
        if (!(key in indicatorWeights)) {
          return res.status(400).json({ error: `Missing indicator weight: ${key}` });
        }
      }
    }

    // Get current settings
    const currentSettings = settingsQueries.get.get() as any;

    settingsQueries.update.run(
      email !== undefined ? email : currentSettings.email,
      defaultDeliveryMethod !== undefined
        ? defaultDeliveryMethod
        : currentSettings.default_delivery_method,
      darkMode !== undefined ? (darkMode ? 1 : 0) : currentSettings.dark_mode,
      defaultRiskPercent !== undefined
        ? defaultRiskPercent
        : currentSettings.default_risk_percent,
      indicatorWeights !== undefined
        ? JSON.stringify(indicatorWeights)
        : currentSettings.indicator_weights
    );

    res.json({ message: 'Settings updated' });
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings', message: error.message });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    await sendTestEmail(email);
    res.json({ message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email', message: error.message });
  }
});

export default router;
