import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/services/api';
import { Portfolio as PortfolioType, PortfolioHolding } from '@/types';
import { TrendingUp, TrendingDown, PieChart, BarChart3, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import PortfolioOverview from '@/components/portfolio/PortfolioOverview';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import RiskAnalysis from '@/components/portfolio/RiskAnalysis';
import DiversificationChart from '@/components/portfolio/DiversificationChart';
import PerformanceChart from '@/components/portfolio/PerformanceChart';
import TransactionModal from '@/components/portfolio/TransactionModal';
import CreatePortfolioModal from '@/components/portfolio/CreatePortfolioModal';

export default function Portfolio() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'holdings' | 'risk' | 'diversification' | 'performance'>('overview');

  const queryClient = useQueryClient();

  // Fetch all portfolios
  const { data: portfolios = [], isLoading: loadingPortfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: portfolioApi.getAll,
  });

  // Fetch selected portfolio details
  const { data: portfolio, isLoading: loadingPortfolio, refetch } = useQuery<PortfolioType>({
    queryKey: ['portfolio', selectedPortfolioId],
    queryFn: () => portfolioApi.get(selectedPortfolioId!),
    enabled: !!selectedPortfolioId,
  });

  // Create portfolio mutation
  const createMutation = useMutation({
    mutationFn: portfolioApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setSelectedPortfolioId(data.id);
      setShowCreateModal(false);
      toast.success('Portfolio created successfully');
    },
    onError: () => {
      toast.error('Failed to create portfolio');
    },
  });

  // Delete portfolio mutation
  const deleteMutation = useMutation({
    mutationFn: portfolioApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setSelectedPortfolioId(null);
      toast.success('Portfolio deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete portfolio');
    },
  });

  // Add transaction mutation
  const transactionMutation = useMutation({
    mutationFn: ({ id, transaction }: { id: string; transaction: any }) =>
      portfolioApi.addTransaction(id, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', selectedPortfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setShowTransactionModal(false);
      toast.success('Transaction added successfully');
    },
    onError: () => {
      toast.error('Failed to add transaction');
    },
  });

  // Auto-select first portfolio if none selected
  if (!selectedPortfolioId && portfolios.length > 0 && !loadingPortfolios) {
    setSelectedPortfolioId(portfolios[0].id);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loadingPortfolios) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading portfolios...</div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <PieChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Portfolios Yet</h2>
          <p className="text-gray-400 mb-6">Create your first portfolio to start tracking your investments</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Portfolio
          </button>
        </div>

        {showCreateModal && (
          <CreatePortfolioModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio Management</h1>
          <p className="text-gray-400">Track performance, analyze risk, and optimize diversification</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransactionModal(true)}
            disabled={!selectedPortfolioId}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Portfolio
          </button>
        </div>
      </div>

      {/* Portfolio Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label className="text-gray-400">Portfolio:</label>
          <select
            value={selectedPortfolioId || ''}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {portfolios.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedPortfolioId && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this portfolio?')) {
                  deleteMutation.mutate(selectedPortfolioId);
                }
              }}
              className="p-2 text-red-400 hover:text-red-300 transition-colors"
              title="Delete portfolio"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loadingPortfolio && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading portfolio data...</div>
        </div>
      )}

      {/* Portfolio Content */}
      {portfolio && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Total Value</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(portfolio.summary.totalValue)}</div>
              <div className={`text-sm mt-2 flex items-center gap-1 ${portfolio.summary.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolio.summary.totalPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatPercent(portfolio.summary.totalPLPercent)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Total P/L</div>
              <div className={`text-2xl font-bold ${portfolio.summary.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(portfolio.summary.totalPL)}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Cost: {formatCurrency(portfolio.summary.totalCost)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Day Change</div>
              <div className={`text-2xl font-bold ${portfolio.summary.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(portfolio.summary.dayChange)}
              </div>
              <div className={`text-sm mt-2 ${portfolio.summary.dayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(portfolio.summary.dayChangePercent)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Holdings</div>
              <div className="text-2xl font-bold text-white">{portfolio.summary.holdings}</div>
              <div className="text-sm text-gray-400 mt-2">
                Cash: {formatCurrency(portfolio.summary.cashBalance)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <div className="flex gap-6">
              {[
                { id: 'overview', label: 'Overview', icon: PieChart },
                { id: 'holdings', label: 'Holdings', icon: BarChart3 },
                { id: 'risk', label: 'Risk Analysis', icon: TrendingUp },
                { id: 'diversification', label: 'Diversification', icon: PieChart },
                { id: 'performance', label: 'Performance', icon: TrendingUp },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {selectedTab === 'overview' && <PortfolioOverview portfolio={portfolio} />}
            {selectedTab === 'holdings' && <HoldingsTable holdings={portfolio.holdings} />}
            {selectedTab === 'risk' && <RiskAnalysis riskMetrics={portfolio.riskMetrics} />}
            {selectedTab === 'diversification' && <DiversificationChart diversification={portfolio.diversification} />}
            {selectedTab === 'performance' && (
              <PerformanceChart
                performance={portfolio.performance}
                performanceAttribution={portfolio.performanceAttribution}
              />
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {showTransactionModal && selectedPortfolioId && (
        <TransactionModal
          portfolioId={selectedPortfolioId}
          onClose={() => setShowTransactionModal(false)}
          onSubmit={(transaction) =>
            transactionMutation.mutate({ id: selectedPortfolioId, transaction })
          }
          isLoading={transactionMutation.isPending}
        />
      )}
    </div>
  );
}
