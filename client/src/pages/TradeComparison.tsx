import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CompareArrows as CompareIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Trade {
  id: string;
  symbol: string;
  name?: string;
  type: 'stock' | 'option';
  strategy: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  potentialGain: number;
  potentialLoss: number;
  riskReward: number;
  probabilityOfSuccess?: number;
  capitalRequired: number;
  positionSize?: number;
  timeframe: string;
  urgency?: 'high' | 'medium' | 'low';
  technicalScore?: number;
  fundamentalScore?: number;
  aiScore?: number;
  keyFactors?: string[];
  risks?: string[];
  catalysts?: string[];
}

interface ComparisonResult {
  trades: Trade[];
  scoreMatrix: {
    tradeId: string;
    symbol: string;
    scores: {
      riskReward: number;
      capitalEfficiency: number;
      technicalSetup: number;
      timing: number;
      overall: number;
    };
  }[];
  ranking: {
    rank: number;
    tradeId: string;
    symbol: string;
    totalScore: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  aiAnalysis: {
    summary: string;
    recommendation: string;
    reasoning: string;
    considerations: string[];
  };
  timestamp: string;
}

const TradeComparison: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  // New trade form state
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    id: '',
    symbol: '',
    name: '',
    type: 'stock',
    strategy: '',
    entryPrice: 0,
    targetPrice: 0,
    stopLoss: 0,
    capitalRequired: 0,
    timeframe: '1-3 days',
    urgency: 'medium',
    technicalScore: 70,
  });

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.strategy || !newTrade.entryPrice) {
      setError('Please fill in symbol, strategy, and entry price');
      return;
    }

    const trade: Trade = {
      id: `trade_${Date.now()}`,
      symbol: newTrade.symbol!.toUpperCase(),
      name: newTrade.name,
      type: newTrade.type as 'stock' | 'option',
      strategy: newTrade.strategy!,
      entryPrice: newTrade.entryPrice!,
      targetPrice: newTrade.targetPrice || newTrade.entryPrice! * 1.1,
      stopLoss: newTrade.stopLoss || newTrade.entryPrice! * 0.95,
      potentialGain: newTrade.targetPrice && newTrade.entryPrice
        ? ((newTrade.targetPrice - newTrade.entryPrice) / newTrade.entryPrice) * 100
        : 10,
      potentialLoss: newTrade.stopLoss && newTrade.entryPrice
        ? ((newTrade.stopLoss - newTrade.entryPrice) / newTrade.entryPrice) * 100
        : -5,
      riskReward: 0, // Will be calculated
      capitalRequired: newTrade.capitalRequired || newTrade.entryPrice! * 100,
      timeframe: newTrade.timeframe!,
      urgency: newTrade.urgency as 'high' | 'medium' | 'low',
      technicalScore: newTrade.technicalScore,
      aiScore: newTrade.technicalScore,
    };

    // Calculate risk/reward
    trade.riskReward = Math.abs(trade.potentialGain) / Math.abs(trade.potentialLoss);

    setTrades([...trades, trade]);

    // Reset form
    setNewTrade({
      id: '',
      symbol: '',
      name: '',
      type: 'stock',
      strategy: '',
      entryPrice: 0,
      targetPrice: 0,
      stopLoss: 0,
      capitalRequired: 0,
      timeframe: '1-3 days',
      urgency: 'medium',
      technicalScore: 70,
    });
    setError(null);
  };

  const handleRemoveTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
    setResult(null);
  };

  const handleCompareTrades = async () => {
    if (trades.length < 2) {
      setError('Need at least 2 trades to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/trade-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trades }),
      });

      if (!response.ok) {
        throw new Error(`Failed to compare trades: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'primary';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'success';
    if (rank === 2) return 'primary';
    if (rank === 3) return 'warning';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CompareIcon /> Trade Comparison Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Compare multiple trade opportunities side-by-side to make better decisions
      </Typography>

      {/* Add Trade Form */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add Trade to Compare
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Symbol"
                value={newTrade.symbol}
                onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Strategy"
                value={newTrade.strategy}
                onChange={(e) => setNewTrade({ ...newTrade, strategy: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newTrade.type}
                  onChange={(e) => setNewTrade({ ...newTrade, type: e.target.value as 'stock' | 'option' })}
                >
                  <MenuItem value="stock">Stock</MenuItem>
                  <MenuItem value="option">Option</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Entry Price"
                type="number"
                value={newTrade.entryPrice || ''}
                onChange={(e) => setNewTrade({ ...newTrade, entryPrice: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Target Price"
                type="number"
                value={newTrade.targetPrice || ''}
                onChange={(e) => setNewTrade({ ...newTrade, targetPrice: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Stop Loss"
                type="number"
                value={newTrade.stopLoss || ''}
                onChange={(e) => setNewTrade({ ...newTrade, stopLoss: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Capital Required"
                type="number"
                value={newTrade.capitalRequired || ''}
                onChange={(e) => setNewTrade({ ...newTrade, capitalRequired: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Timeframe"
                value={newTrade.timeframe}
                onChange={(e) => setNewTrade({ ...newTrade, timeframe: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Urgency</InputLabel>
                <Select
                  value={newTrade.urgency}
                  onChange={(e) => setNewTrade({ ...newTrade, urgency: e.target.value as 'high' | 'medium' | 'low' })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddTrade}>
                Add Trade
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Current Trades */}
      {trades.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trades to Compare ({trades.length})
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Strategy</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Entry</TableCell>
                    <TableCell align="right">Target</TableCell>
                    <TableCell align="right">Stop</TableCell>
                    <TableCell align="right">R/R</TableCell>
                    <TableCell align="right">Capital</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell><strong>{trade.symbol}</strong></TableCell>
                      <TableCell>{trade.strategy}</TableCell>
                      <TableCell>
                        <Chip label={trade.type} size="small" />
                      </TableCell>
                      <TableCell align="right">${trade.entryPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">${trade.targetPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">${trade.stopLoss.toFixed(2)}</TableCell>
                      <TableCell align="right">{trade.riskReward.toFixed(2)}:1</TableCell>
                      <TableCell align="right">${trade.capitalRequired.toLocaleString()}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleRemoveTrade(trade.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CompareIcon />}
                onClick={handleCompareTrades}
                disabled={trades.length < 2 || loading}
              >
                Compare Trades
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Analyzing trades...
          </Typography>
        </Box>
      )}

      {/* Comparison Results */}
      {result && (
        <>
          {/* AI Analysis */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Analysis & Recommendation
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Summary:</strong> {result.aiAnalysis.summary}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Recommendation:</strong> {result.aiAnalysis.recommendation}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Reasoning:</strong> {result.aiAnalysis.reasoning}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Key Considerations:
              </Typography>
              <ul>
                {result.aiAnalysis.considerations.map((consideration, i) => (
                  <li key={i}>
                    <Typography variant="body2">{consideration}</Typography>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Ranking */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trade Rankings
              </Typography>
              <Grid container spacing={2}>
                {result.ranking.map((rank) => (
                  <Grid item xs={12} md={6} key={rank.tradeId}>
                    <Paper sx={{ p: 2, border: rank.rank === 1 ? '2px solid #4caf50' : '1px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">
                          {rank.rank === 1 && '🏆 '}
                          #{rank.rank} {rank.symbol}
                        </Typography>
                        <Chip
                          label={`${rank.totalScore}/100`}
                          color={getRankColor(rank.rank)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Strengths:
                      </Typography>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {rank.strengths.map((strength, i) => (
                          <li key={i}>
                            <Typography variant="body2">
                              <TrendingUpIcon fontSize="small" sx={{ color: 'success.main', mr: 0.5, verticalAlign: 'middle' }} />
                              {strength}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                        Weaknesses:
                      </Typography>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {rank.weaknesses.map((weakness, i) => (
                          <li key={i}>
                            <Typography variant="body2">
                              <TrendingDownIcon fontSize="small" sx={{ color: 'error.main', mr: 0.5, verticalAlign: 'middle' }} />
                              {weakness}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Score Matrix */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Score Matrix
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="center">Risk/Reward</TableCell>
                      <TableCell align="center">Capital Efficiency</TableCell>
                      <TableCell align="center">Technical Setup</TableCell>
                      <TableCell align="center">Timing</TableCell>
                      <TableCell align="center">Overall</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.scoreMatrix.map((item) => (
                      <TableRow key={item.tradeId}>
                        <TableCell><strong>{item.symbol}</strong></TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.scores.riskReward}
                            color={getScoreColor(item.scores.riskReward)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.scores.capitalEfficiency}
                            color={getScoreColor(item.scores.capitalEfficiency)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.scores.technicalSetup}
                            color={getScoreColor(item.scores.technicalSetup)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.scores.timing}
                            color={getScoreColor(item.scores.timing)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.scores.overall}
                            color={getScoreColor(item.scores.overall)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default TradeComparison;
