import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Watchlist from './pages/Watchlist';
import Journal from './pages/Journal';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Screener from './pages/Screener';
import Discover from './pages/Discover';
import Portfolio from './pages/Portfolio';
import Backtest from './pages/Backtest';
import News from './pages/News';
import Economy from './pages/Economy';
import AITradeJournal from './pages/AITradeJournal';
import EarningsAnalyzer from './pages/EarningsAnalyzer';
import GreeksMonitor from './pages/GreeksMonitor';
import OptionsIdeas from './pages/OptionsIdeas';
import OptionsFlow from './pages/OptionsFlow';
import TradeIdeas from './pages/TradeIdeas';
import Layout from './components/common/Layout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with Layout */}
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/stock/:symbol" element={<StockDetail />} />
                    <Route path="/stocks/:symbol" element={<StockDetail />} />
                    <Route path="/screener" element={<Screener />} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/economy" element={<Economy />} />
                    <Route path="/options-ideas" element={<OptionsIdeas />} />
                    <Route path="/options-flow" element={<OptionsFlow />} />
                    <Route path="/trade-ideas" element={<TradeIdeas />} />

                    {/* Auth-required routes */}
                    <Route
                      path="/watchlist"
                      element={
                        <ProtectedRoute>
                          <Watchlist />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/journal"
                      element={
                        <ProtectedRoute>
                          <Journal />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/portfolio"
                      element={
                        <ProtectedRoute>
                          <Portfolio />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/alerts"
                      element={
                        <ProtectedRoute>
                          <Alerts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/backtest"
                      element={
                        <ProtectedRoute>
                          <Backtest />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ai/trade-journal"
                      element={
                        <ProtectedRoute>
                          <AITradeJournal />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ai/earnings"
                      element={
                        <ProtectedRoute>
                          <EarningsAnalyzer />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ai/greeks"
                      element={
                        <ProtectedRoute>
                          <GreeksMonitor />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1f2937',
                color: '#f9fafb',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f9fafb',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f9fafb',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
