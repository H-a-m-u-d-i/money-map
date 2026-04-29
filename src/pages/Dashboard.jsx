import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Wallet, PlusCircle, Home, PieChart, Activity, Repeat, ShieldCheck, ArrowRight, Lock, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Edit2, Trash2, Calendar, ChevronLeft, ChevronRight, ChevronDown, Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home as HomeIcon, Heart, MoreHorizontal, Settings } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const accounts = useStore(state => state.accounts);
  const transactions = useStore(state => state.transactions);
  const deleteTransaction = useStore(state => state.deleteTransaction);

  const categories = useStore(state => state.categories);
  const displayMode = useStore(state => state.displayMode);
  const currentDateView = new Date(useStore(state => state.currentDateView));
  const setViewSettings = useStore(state => state.setViewSettings);
  const customDateRange = useStore(state => state.customDateRange);
  const biometricEnabled = useStore(state => state.biometricEnabled);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTimeframeSelector, setShowTimeframeSelector] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const accountsTotal = accounts
    .filter(acc => acc.type !== 'cash')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const cashBalance = accounts
    .filter(acc => acc.type === 'cash')
    .reduce((sum, acc) => sum + acc.balance, 0);

  // Time-based filtering
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    if (displayMode === 'month') {
      return tDate.getMonth() === currentDateView.getMonth() && tDate.getFullYear() === currentDateView.getFullYear();
    }
    if (displayMode === 'year') {
      return tDate.getFullYear() === currentDateView.getFullYear();
    }
    if (displayMode === 'day') {
      return tDate.toDateString() === currentDateView.toDateString();
    }
    if (displayMode === 'interval' && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      // Normalize to midnight for fair comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }
    return true; // 'all'
  });

  const navigateDate = (direction) => {
    const newDate = new Date(currentDateView);
    if (displayMode === 'month') newDate.setMonth(newDate.getMonth() + direction);
    if (displayMode === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
    if (displayMode === 'day') newDate.setDate(newDate.getDate() + direction);
    setViewSettings({ currentDateView: newDate.toISOString() });
  };

  const getHeaderLabel = () => {
    if (displayMode === 'month') return currentDateView.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (displayMode === 'year') return currentDateView.getFullYear();
    if (displayMode === 'day') return currentDateView.toLocaleDateString();
    if (displayMode === 'interval') {
      if (customDateRange.start && customDateRange.end) {
        return `${new Date(customDateRange.start).toLocaleDateString()} - ${new Date(customDateRange.end).toLocaleDateString()}`;
      }
      return "Select Range";
    }
    return "All Time";
  };

  // Calculate Velocity (Spending Speed)
  const calculateVelocity = () => {
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    
    const getAverageSpend = (days) => {
      const cutoff = new Date(now - days * msInDay);
      const total = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= cutoff)
        .reduce((sum, t) => sum + t.amount, 0);
      return total / days;
    };

    const current = getAverageSpend(7); // Last 7 days
    const baseline = getAverageSpend(30); // Last 30 days
    return { current: current || 0, baseline: baseline || 0 };
  };

  const velocity = calculateVelocity();
  const speedRatio = velocity.baseline > 0 ? velocity.current / velocity.baseline : 0;
  
  const recentTransactions = filteredTransactions
    .filter(t => t.note.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 15);
  
  // Period-based Balance Logic
  const getPeriodStats = () => {
    // 1. Find the start of the current period
    let periodStart = null;
    let periodEnd = null;

    if (displayMode === 'month') {
      periodStart = new Date(currentDateView.getFullYear(), currentDateView.getMonth(), 1);
      periodEnd = new Date(currentDateView.getFullYear(), currentDateView.getMonth() + 1, 0, 23, 59, 59);
    } else if (displayMode === 'day') {
      periodStart = new Date(currentDateView);
      periodStart.setHours(0,0,0,0);
      periodEnd = new Date(currentDateView);
      periodEnd.setHours(23,59,59,999);
    } else if (displayMode === 'year') {
      periodStart = new Date(currentDateView.getFullYear(), 0, 1);
      periodEnd = new Date(currentDateView.getFullYear(), 11, 31, 23, 59, 59);
    } else if (displayMode === 'interval' && customDateRange.start && customDateRange.end) {
      periodStart = new Date(customDateRange.start);
      periodStart.setHours(0,0,0,0);
      periodEnd = new Date(customDateRange.end);
      periodEnd.setHours(23,59,59,999);
    }

    if (!periodStart) return { opening: totalBalance, closing: totalBalance, change: 0 };

    // 2. Calculate Opening Balance (Current Balance - Sum of all net change from periodStart to NOW)
    // Actually simpler: Opening = Current Balance - (Sum of transactions from periodStart to infinity)
    const txnsFromStart = transactions.filter(t => new Date(t.date) >= periodStart);
    
    let netChangeSinceStart = 0;
    txnsFromStart.forEach(t => {
      if (t.type === 'income') netChangeSinceStart += t.amount;
      if (t.type === 'expense') netChangeSinceStart -= t.amount;
      // Transfers don't change TOTAL balance, so we ignore them for the overall opening balance
    });

    const openingBalance = totalBalance - netChangeSinceStart;

    // 3. Calculate Period Change (Transactions within the period)
    const periodTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= periodStart && d <= periodEnd;
    });

    let periodIncome = 0;
    let periodExpense = 0;
    periodTxns.forEach(t => {
      if (t.type === 'income') periodIncome += t.amount;
      if (t.type === 'expense') periodExpense += t.amount;
    });

    const closingBalance = openingBalance + (periodIncome - periodExpense);

    return { 
      opening: openingBalance, 
      closing: closingBalance, 
      change: periodIncome - periodExpense,
      income: periodIncome,
      expense: periodExpense
    };
  };

  const periodStats = getPeriodStats();

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || 'Unknown';

  // Logic for Running Balance (Monefy style history)
  const getRunningBalances = () => {
    // We need to calculate the state of each account at every point in time
    // 1. Sort all transactions by date (ascending)
    const sortedAll = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 2. Mock current state and work backwards? No, work forwards from initial 0 (relative)
    // and then shift based on final known balances.
    const balances = {};
    accounts.forEach(acc => balances[acc.id] = acc.balance); // Current actual

    // We work BACKWARDS from current known balances to find history
    const runningBalancesMap = {}; // txnId -> { fromBalance, toBalance, balanceAfter }
    
    [...sortedAll].reverse().forEach(t => {
      // Record the balance AFTER this transaction for relevant accounts
      if (t.type === 'transfer' || t.type === 'withdrawal') {
        runningBalancesMap[t.id] = {
          fromBalance: balances[t.fromAccountId],
          toBalance: balances[t.toAccountId]
        };
      } else {
        runningBalancesMap[t.id] = {
          balanceAfter: balances[t.fromAccountId || t.toAccountId]
        };
      }

      // Reverse the transaction effect on our mock balances to see what it was BEFORE
      if (t.type === 'income') {
        balances[t.toAccountId] -= t.amount;
      } else if (t.type === 'expense') {
        balances[t.fromAccountId] += t.amount;
      } else if (t.type === 'transfer' || t.type === 'withdrawal') {
        balances[t.fromAccountId] += t.amount;
        balances[t.toAccountId] -= t.amount;
      }
    });

    return runningBalancesMap;
  };

  const runningBalances = getRunningBalances();

  // Group by category for the "Monefy" style list
  const categoryGroups = categories.filter(c => c.type === 'expense').map(cat => {
    const catTxns = recentTransactions.filter(t => t.categoryId === cat.id);
    const total = catTxns.reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, transactions: catTxns, total };
  }).filter(group => group.transactions.length > 0);

  // Add a group for non-expense types
  const otherTxns = recentTransactions.filter(t => t.type !== 'expense');

  const ICON_MAP = {
    pizza: Pizza, zap: Zap, car: Car, briefcase: Briefcase, shopping: ShoppingBag, coffee: Coffee, home: HomeIcon, heart: Heart, more: MoreHorizontal
  };

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '8px' }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Dashboard</h1>
        <div 
          onClick={() => setShowTimeframeSelector(true)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '16px', 
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s'
          }}
        >
          <Calendar size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {displayMode === 'all' ? 'Total' : displayMode}
          </span>
          <ChevronDown size={14} color="var(--text-secondary)" />
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <button onClick={() => navigateDate(-1)} className="btn" style={{ padding: '4px', background: 'transparent' }}><ChevronLeft size={20} /></button>
        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>{getHeaderLabel()}</span>
        <button onClick={() => navigateDate(1)} className="btn" style={{ padding: '4px', background: 'transparent' }}><ChevronRight size={20} /></button>
      </div>

      {/* Main Cash on Hand Card */}
      <div className="glass-panel" style={{ 
        padding: '20px', 
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(42, 42, 53, 0.95) 100%)',
        borderLeft: '4px solid var(--accent-success)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Cash on Hand</p>
            <h2 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px', color: 'var(--accent-success)', margin: 0 }}>
              ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px', 
              background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-success)', marginLeft: 'auto', marginBottom: '8px'
            }}>
              <Wallet size={20} />
            </div>
          </div>
        </div>

        {/* Period Balance Comparison */}
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Opening</p>
            <p style={{ fontSize: '15px', fontWeight: '800' }}>${periodStats.opening.toLocaleString()}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Closing</p>
            <p style={{ fontSize: '15px', fontWeight: '800', color: periodStats.change >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              ${periodStats.closing.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Individual Accounts Breakdown - Collapsible */}
        <div style={{ marginTop: '16px' }}>
          <button 
            onClick={() => setShowAccounts(!showAccounts)}
            style={{ 
              width: '100%', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px',
              border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              My Accounts Total: <span style={{ color: 'var(--accent-primary)' }}>${accountsTotal.toLocaleString()}</span>
            </span>
            <ChevronDown size={16} style={{ transform: showAccounts ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
          
          {showAccounts && (
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', marginTop: '4px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'slideIn 0.3s ease' }}>
              {accounts.filter(acc => acc.type !== 'cash').map(acc => (
                <div key={acc.id} className="flex-between" style={{ fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: acc.color }} />
                    <span>{acc.name}</span>
                  </div>
                  <span style={{ fontWeight: '700' }}>${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              {accounts.filter(acc => acc.type !== 'cash').length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>No other accounts.</p>}
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        <button onClick={() => navigate('/recurring')} className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Repeat size={16} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Recurring</span>
        </button>

        <button onClick={() => navigate('/settings/categories')} className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <PieChart size={16} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Categories</span>
        </button>

        <button 
          onClick={() => useStore.setState({ biometricEnabled: !biometricEnabled })} 
          className="glass-panel" 
          style={{ 
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 'fit-content',
            background: biometricEnabled ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)'
          }}
        >
          <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
            <Lock size={16} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {biometricEnabled ? 'Lock: ON' : 'Lock: OFF'}
          </span>
        </button>
      </div>

      {/* Financial Health Widget */}
      <div 
        onClick={() => navigate('/health')}
        className="glass-panel" 
        style={{ 
          padding: '20px', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(255,255,255,0.05)',
          background: 'linear-gradient(to right, rgba(99,102,241,0.05), rgba(0,0,0,0))',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '14px', 
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Financial Health</p>
            <h4 style={{ fontSize: '16px', fontWeight: '800' }}>Check Your Score</h4>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Insights</span>
          <ArrowRight size={16} />
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>Activity</h3>
        <button 
          onClick={() => setShowSearch(!showSearch)} 
          className="btn" 
          style={{ fontSize: '12px', color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 14px', borderRadius: '20px' }}
        >
          {showSearch ? 'Close' : 'Filter'}
        </button>
      </div>

      {showSearch && (
        <div style={{ marginBottom: '16px', animation: 'slideIn 0.3s ease' }}>
          <input 
            type="text" 
            placeholder="Search notes..." 
            className="input-field" 
            style={{ width: '100%', padding: '12px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        {categoryGroups.length === 0 && otherTxns.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Silence... No movements yet.
          </div>
        ) : (
          <>
            {categoryGroups.map((group) => {
              const Icon = ICON_MAP[group.icon] || MoreHorizontal;
              const isExpanded = expandedCategory === group.id;

              return (
                <div key={group.id} className="glass-panel" style={{ overflow: 'hidden', transition: 'all 0.3s ease' }}>
                  <div 
                    onClick={() => setExpandedCategory(isExpanded ? null : group.id)}
                    style={{ 
                      padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: group.color
                      }}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: '700', fontSize: '16px' }}>{group.name}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{group.transactions.length} transactions</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <p style={{ fontWeight: '800', fontSize: '17px' }}>${group.total.toLocaleString()}</p>
                      <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }}>
                        <ChevronDown size={18} color="var(--text-secondary)" />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 20px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ position: 'absolute', left: '7px', top: '0', bottom: '10px', width: '2px', background: group.color, opacity: 0.3 }} />
                        {group.transactions.map(txn => (
                          <div key={txn.id} style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-21px', top: '8px', width: '10px', height: '10px', borderRadius: '50%', background: group.color }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontWeight: '600', fontSize: '14px' }}>{txn.note}</p>
                                <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                  {new Date(txn.date).toLocaleDateString()} • {getAccountName(txn.fromAccountId || txn.toAccountId)} • Bal: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>${runningBalances[txn.id]?.balanceAfter?.toLocaleString()}</span>
                                </p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontWeight: '700', fontSize: '14px' }}>${txn.amount.toLocaleString()}</p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px', opacity: 0.4 }}>
                                  <Edit2 size={12} style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); navigate(`/new?edit=${txn.id}`); }} />
                                  <Trash2 size={12} style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete?')) deleteTransaction(txn.id); }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {otherTxns.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Other Movements</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {otherTxns.map(txn => (
                    <div key={txn.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ color: txn.type === 'income' ? 'var(--accent-success)' : 'var(--accent-transfer)' }}>
                          {txn.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowRightLeft size={20} />}
                        </div>
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '14px' }}>{txn.note}</p>
                          <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {txn.type.toUpperCase()} • 
                            {txn.type === 'transfer' || txn.type === 'withdrawal' ? (
                              <>
                                <span style={{ color: 'var(--accent-danger)' }}>{getAccountName(txn.fromAccountId)} (${runningBalances[txn.id]?.fromBalance?.toLocaleString()})</span>
                                {' → '}
                                <span style={{ color: 'var(--accent-success)' }}>{getAccountName(txn.toAccountId)} (${runningBalances[txn.id]?.toBalance?.toLocaleString()})</span>
                              </>
                            ) : (
                              <>{getAccountName(txn.fromAccountId || txn.toAccountId)} • Bal: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>${runningBalances[txn.id]?.balanceAfter?.toLocaleString()}</span></>
                            )}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '800', color: txn.type === 'income' ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                          {txn.type === 'income' ? '+' : ''}${txn.amount.toLocaleString()}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px', opacity: 0.4 }}>
                          <Edit2 size={12} style={{cursor: 'pointer'}} onClick={() => navigate(`/new?edit=${txn.id}`)} />
                          <Trash2 size={12} style={{cursor: 'pointer'}} onClick={() => { if(window.confirm('Delete?')) deleteTransaction(txn.id); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {showTimeframeSelector && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '340px', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center', fontWeight: '800' }}>Select Timeframe</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {['day', 'month', 'year', 'all', 'interval'].map(mode => (
                <button
                  key={mode}
                  onClick={() => { 
                    if (mode !== 'interval') setViewSettings({ displayMode: mode });
                    else setViewSettings({ displayMode: 'interval' });
                    if (mode !== 'interval') setShowTimeframeSelector(false);
                  }}
                  style={{
                    padding: '16px', borderRadius: '16px', border: 'none',
                    background: displayMode === mode ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: displayMode === mode ? 'white' : 'var(--text-secondary)',
                    fontWeight: '700', textTransform: 'capitalize', transition: 'all 0.2s'
                  }}
                >
                  {mode === 'all' ? 'Total' : mode}
                </button>
              ))}
            </div>

            {displayMode === 'interval' && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.3s' }}>
                <div className="input-group">
                  <label className="input-label">Start Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={customDateRange.start || ''}
                    onChange={(e) => setViewSettings({ customDateRange: { ...customDateRange, start: e.target.value } })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">End Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={customDateRange.end || ''}
                    onChange={(e) => setViewSettings({ customDateRange: { ...customDateRange, end: e.target.value } })}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => setShowTimeframeSelector(false)}
                >
                  Apply Range
                </button>
              </div>
            )}
            <button 
              onClick={() => setShowTimeframeSelector(false)}
              className="btn" 
              style={{ width: '100%', marginTop: '20px', background: 'transparent', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
