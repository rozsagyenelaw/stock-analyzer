import { db } from './database';

// Stock universe for Daily Picks scanning ($5-$250 range)
export const STOCK_UNIVERSE = [
  // Tech ($5-$250)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM',
  'ORCL', 'CSCO', 'ADBE', 'AVGO', 'TXN', 'QCOM', 'AMAT', 'MU', 'LRCX', 'KLAC',
  'SNPS', 'CDNS', 'MRVL', 'MCHP', 'ADI', 'FTNT', 'PANW', 'CRWD', 'ZS', 'DDOG',

  // Finance ($5-$250)
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'SCHW',
  'BLK', 'SPGI', 'CME', 'ICE', 'MCO', 'MSCI', 'ALLY', 'SOFI', 'NU', 'AFRM',

  // Healthcare ($5-$250)
  'UNH', 'LLY', 'JNJ', 'PFE', 'ABT', 'MRK', 'TMO', 'DHR', 'AMGN', 'CVS',
  'WBA', 'CI', 'HUM', 'BIIB', 'GILD', 'REGN', 'VRTX', 'MRNA', 'ILMN', 'ALGN',

  // Energy ($5-$250)
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'PSX', 'VLO', 'HAL',
  'OXY', 'DVN', 'FANG', 'MRO', 'APA', 'CTRA', 'BP', 'SHEL', 'TTE', 'E',

  // Consumer ($5-$250)
  'AMZN', 'HD', 'NKE', 'SBUX', 'MCD', 'TGT', 'LOW', 'TJX', 'DG', 'ROST',
  'ULTA', 'DRI', 'YUM', 'CMG', 'DECK', 'LULU', 'ETSY', 'CHWY', 'W', 'SHOP',

  // Industrial ($5-$250)
  'CAT', 'BA', 'HON', 'UPS', 'RTX', 'LMT', 'DE', 'GE', 'MMM', 'EMR',
  'ETN', 'ITW', 'PH', 'AME', 'ROK', 'DOV', 'XYL', 'IEX', 'FTV', 'HUBB',

  // Communication ($5-$250)
  'GOOGL', 'META', 'DIS', 'NFLX', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'PARA',
  'SPOT', 'RBLX', 'U', 'PINS', 'SNAP', 'MTCH', 'BMBL', 'ROKU', 'FUBO', 'DJT',

  // ETFs & Indexes
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'EFA', 'EEM', 'GLD', 'SLV',

  // Crypto-related
  'COIN', 'MSTR', 'RIOT', 'MARA', 'CLSK', 'HUT', 'BITF', 'HIVE', 'SOS', 'CAN',

  // Emerging Tech
  'PLTR', 'SNOW', 'NET', 'DKNG', 'DASH', 'ABNB', 'UBER', 'LYFT', 'RIVN', 'LCID',
  'F', 'GM', 'PLUG', 'FCEL', 'BE', 'BLNK', 'CHPT', 'EVGO', 'QS', 'LAZR',

  // Recent IPOs & Growth
  'ARM', 'RDDT', 'HOOD', 'RBLX', 'BROS', 'CAVA', 'HIMS', 'IONQ', 'RGTI', 'QUBT',

  // Biotech
  'SGEN', 'BMRN', 'ALNY', 'INCY', 'NBIX', 'EXAS', 'TECH', 'JAZZ', 'SRPT', 'VRTX',

  // Semiconductors
  'TSM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'ENTG', 'TER', 'MPWR', 'MCHP', 'SWKS',

  // Cloud/SaaS
  'CRM', 'NOW', 'WDAY', 'TEAM', 'ZM', 'DOCU', 'MNDY', 'SNOW', 'DDOG', 'NET',

  // E-commerce
  'AMZN', 'SHOP', 'MELI', 'BABA', 'PDD', 'JD', 'SE', 'CPNG', 'COUR', 'EBAY',

  // Fintech
  'SQ', 'PYPL', 'V', 'MA', 'AXP', 'FIS', 'FISV', 'GPN', 'BILL', 'INTU',

  // REITs
  'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'DLR', 'O', 'VICI', 'SPG', 'AVB',

  // Materials
  'LIN', 'APD', 'ECL', 'SHW', 'NEM', 'FCX', 'NUE', 'STLD', 'VMC', 'MLM',

  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'WEC', 'ES',

  // Transportation
  'UPS', 'FDX', 'DAL', 'UAL', 'AAL', 'LUV', 'JBLU', 'ALK', 'UBER', 'LYFT',

  // Media
  'DIS', 'NFLX', 'WBD', 'PARA', 'FOXA', 'LYV', 'SPOT', 'RBLX', 'EA', 'TTWO',

  // Retail
  'WMT', 'COST', 'TGT', 'HD', 'LOW', 'TJX', 'ROST', 'DG', 'DLTR', 'FIVE',

  // Food & Beverage
  'KO', 'PEP', 'MDLZ', 'KHC', 'GIS', 'K', 'HSY', 'CAG', 'MKC', 'SJM',

  // Automotive
  'TSLA', 'F', 'GM', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'ARVL', 'GOEV',

  // Defense
  'LMT', 'RTX', 'BA', 'NOC', 'GD', 'LHX', 'TDG', 'HII', 'PLTR', 'RKLB',

  // Cannabis
  'TLRY', 'CGC', 'SNDL', 'ACB', 'CRON', 'HEXO', 'OGI', 'CURLF', 'GTBIF', 'TCNNF',

  // Gaming
  'RBLX', 'U', 'EA', 'TTWO', 'ATVI', 'DKNG', 'PENN', 'CZR', 'MGM', 'WYNN',

  // Cybersecurity
  'PANW', 'CRWD', 'ZS', 'FTNT', 'OKTA', 'NET', 'S', 'TENB', 'RPD', 'CYBR',

  // AI/ML
  'NVDA', 'AMD', 'PLTR', 'AI', 'BBAI', 'SOUN', 'PATH', 'SNOW', 'DDOG', 'ESTC',

  // Space
  'RKLB', 'ASTS', 'PL', 'SPIR', 'ASTR', 'VORB', 'LUNR', 'IRDM', 'GSAT', 'GILT',

  // EVs & Batteries
  'TSLA', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'PLUG', 'BE', 'QS', 'ALB',
];

export interface StockUniverseEntry {
  symbol: string;
  addedDate: string;
  lastScanned: string;
  scanCount: number;
  isActive: boolean;
}

export function initializeStockUniverse(): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_universe (
        symbol TEXT PRIMARY KEY,
        added_date TEXT NOT NULL,
        last_scanned TEXT,
        scan_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Check if table is empty
    const count = db.prepare('SELECT COUNT(*) as count FROM stock_universe').get() as { count: number };

    if (count.count === 0) {
      console.log('Initializing stock universe with', STOCK_UNIVERSE.length, 'symbols...');

      const insert = db.prepare(`
        INSERT OR IGNORE INTO stock_universe (symbol, added_date, is_active)
        VALUES (?, datetime('now'), 1)
      `);

      const insertMany = db.transaction((symbols: string[]) => {
        for (const symbol of symbols) {
          insert.run(symbol);
        }
      });

      insertMany(STOCK_UNIVERSE);
      console.log('✓ Stock universe initialized with', STOCK_UNIVERSE.length, 'symbols');
    }
  } catch (error) {
    console.error('Error initializing stock universe:', error);
  }
}

export function getActiveStockUniverse(): string[] {
  try {
    const rows = db.prepare('SELECT symbol FROM stock_universe WHERE is_active = 1').all() as { symbol: string }[];
    return rows.map(r => r.symbol);
  } catch (error) {
    console.error('Error getting stock universe:', error);
    return STOCK_UNIVERSE; // Fallback to hardcoded list
  }
}

export function updateLastScanned(symbol: string): void {
  try {
    db.prepare(`
      UPDATE stock_universe
      SET last_scanned = datetime('now'), scan_count = scan_count + 1
      WHERE symbol = ?
    `).run(symbol);
  } catch (error) {
    console.error('Error updating last scanned:', error);
  }
}

export function addToUniverse(symbol: string): void {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO stock_universe (symbol, added_date, is_active)
      VALUES (?, datetime('now'), 1)
    `).run(symbol);
  } catch (error) {
    console.error('Error adding to universe:', error);
  }
}

export function removeFromUniverse(symbol: string): void {
  try {
    db.prepare('UPDATE stock_universe SET is_active = 0 WHERE symbol = ?').run(symbol);
  } catch (error) {
    console.error('Error removing from universe:', error);
  }
}
