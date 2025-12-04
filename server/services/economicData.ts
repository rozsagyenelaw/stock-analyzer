/**
 * Economic Data Service using Alpha Vantage API
 * Provides real economic indicators and calendar data
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from './database';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetch real-time economic indicators from Alpha Vantage
 */
export async function fetchRealGDP(): Promise<any> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured. Get a free key at https://www.alphavantage.co');
  }

  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'REAL_GDP',
        interval: 'quarterly',
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching GDP from Alpha Vantage:', error.message);
    throw new Error(`Failed to fetch GDP data: ${error.message}`);
  }
}

/**
 * Fetch unemployment rate
 */
export async function fetchUnemploymentRate(): Promise<any> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured. Get a free key at https://www.alphavantage.co');
  }

  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'UNEMPLOYMENT',
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching unemployment from Alpha Vantage:', error.message);
    throw new Error(`Failed to fetch unemployment data: ${error.message}`);
  }
}

/**
 * Fetch inflation (CPI) data
 */
export async function fetchInflationRate(): Promise<any> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured. Get a free key at https://www.alphavantage.co');
  }

  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'CPI',
        interval: 'monthly',
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching CPI from Alpha Vantage:', error.message);
    throw new Error(`Failed to fetch CPI data: ${error.message}`);
  }
}

/**
 * Fetch Federal Funds Rate
 */
export async function fetchFederalFundsRate(): Promise<any> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured. Get a free key at https://www.alphavantage.co');
  }

  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'FEDERAL_FUNDS_RATE',
        interval: 'monthly',
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching Federal Funds Rate from Alpha Vantage:', error.message);
    throw new Error(`Failed to fetch Federal Funds Rate: ${error.message}`);
  }
}

/**
 * Fetch Retail Sales data
 */
export async function fetchRetailSales(): Promise<any> {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured. Get a free key at https://www.alphavantage.co');
  }

  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'RETAIL_SALES',
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching Retail Sales from Alpha Vantage:', error.message);
    throw new Error(`Failed to fetch Retail Sales data: ${error.message}`);
  }
}

/**
 * Store macro indicator in database
 */
export function storeMacroIndicator(indicator: any): string {
  const id = uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO macro_indicators (
      id, indicator_name, indicator_type, value, unit,
      date, country, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    indicator.name,
    indicator.type,
    indicator.value,
    indicator.unit || null,
    indicator.date,
    indicator.country || 'US',
    'Alpha Vantage'
  );

  return id;
}

/**
 * Get macro indicators from database
 */
export function getMacroIndicators(
  type?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 100
): any[] {
  let query = 'SELECT * FROM macro_indicators WHERE 1=1';
  const params: any[] = [];

  if (type) {
    query += ' AND indicator_type = ?';
    params.push(type);
  }

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date DESC LIMIT ?';
  params.push(limit);

  return db.prepare(query).all(...params);
}

/**
 * Fetch and store all major economic indicators
 */
export async function updateEconomicIndicators(): Promise<number> {
  let stored = 0;

  try {
    // Fetch GDP
    const gdp = await fetchRealGDP();
    if (gdp && gdp.length > 0) {
      const latest = gdp[0];
      storeMacroIndicator({
        name: 'Real GDP',
        type: 'GDP',
        value: parseFloat(latest.value),
        unit: 'Billions of Dollars',
        date: latest.date,
      });
      stored++;
    }
  } catch (error) {
    console.error('Failed to fetch GDP:', error);
  }

  try {
    // Fetch Unemployment
    const unemployment = await fetchUnemploymentRate();
    if (unemployment && unemployment.length > 0) {
      const latest = unemployment[0];
      storeMacroIndicator({
        name: 'Unemployment Rate',
        type: 'UNEMPLOYMENT',
        value: parseFloat(latest.value),
        unit: 'Percent',
        date: latest.date,
      });
      stored++;
    }
  } catch (error) {
    console.error('Failed to fetch Unemployment:', error);
  }

  try {
    // Fetch CPI
    const cpi = await fetchInflationRate();
    if (cpi && cpi.length > 0) {
      const latest = cpi[0];
      storeMacroIndicator({
        name: 'Consumer Price Index',
        type: 'INFLATION',
        value: parseFloat(latest.value),
        unit: 'Index',
        date: latest.date,
      });
      stored++;
    }
  } catch (error) {
    console.error('Failed to fetch CPI:', error);
  }

  try {
    // Fetch Federal Funds Rate
    const ffr = await fetchFederalFundsRate();
    if (ffr && ffr.length > 0) {
      const latest = ffr[0];
      storeMacroIndicator({
        name: 'Federal Funds Rate',
        type: 'INTEREST_RATE',
        value: parseFloat(latest.value),
        unit: 'Percent',
        date: latest.date,
      });
      stored++;
    }
  } catch (error) {
    console.error('Failed to fetch Federal Funds Rate:', error);
  }

  try {
    // Fetch Retail Sales
    const retail = await fetchRetailSales();
    if (retail && retail.length > 0) {
      const latest = retail[0];
      storeMacroIndicator({
        name: 'Retail Sales',
        type: 'RETAIL_SALES',
        value: parseFloat(latest.value),
        unit: 'Millions of Dollars',
        date: latest.date,
      });
      stored++;
    }
  } catch (error) {
    console.error('Failed to fetch Retail Sales:', error);
  }

  return stored;
}
