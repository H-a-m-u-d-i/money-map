import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { 
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Label, AreaChart, Area 
} from 'recharts';
import { 
  Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home, Heart, 
  MoreHorizontal, Settings, ChevronRight, TrendingUp, TrendingDown, 
  Calendar, Sparkles, DollarSign, Award, ArrowUpRight, ArrowDownRight, Percent
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ICON_MAP = {
  pizza: Pizza,
  zap: Zap,
  car: Car,
  briefcase: Briefcase,
  shopping: ShoppingBag,
  coffee: Coffee,
  home: Home,
  heart: Heart,
  more: MoreHorizontal
};

const TIME_PERIODS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'this_year', label: 'This Year' },
  { id: 'all', label: 'All Time' }
];

export default function Insights() {
  const transactions = useStore(state => state.transactions);
  const categories = useStore(state => state.categories);
  const accounts = useStore(state => state.accounts);

  const [period, setPeriod] = useState('this_month');
  const [breakdownType, setBreakdownType] = useState('expense');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Filter transactions based on selected date period
  const filteredTxns = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;

      if (period === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === 'last_month') {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lastM.getMonth() && d.getFullYear() === lastM.getFullYear();
      }
      if (period === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return d >= threeMonthsAgo;
      }
      if (period === 'this_year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }, [transactions, period]);

  // Aggregate Total Income, Expenses & Net Savings for period
  const totalIncome = useMemo(() => {
    return filteredTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTxns]);

  const totalExpense = useMemo(() => {
    return filteredTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTxns]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Category Breakdown Data (Filtered)
  const categoryBreakdown = useMemo(() => {
    const list = filteredTxns.filter(t => t.type === breakdownType);
    const totalForType = list.reduce((sum, t) => sum + t.amount, 0);

    return categories
      .filter(c => c.type === breakdownType)
      .map(cat => {
        const catTxns = list.filter(t => t.categoryId === cat.id);
        const total = catTxns.reduce((sum, t) => sum + t.amount, 0);
        const percent = totalForType > 0 ? Math.round((total / totalForType) * 100) : 0;
        return {
          id: cat.id,
          name: cat.name,
          value: total,
          color: cat.color || '#3b82f6',
          icon: cat.icon || 'more',
          percent,
          count: catTxns.length
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredTxns, categories, breakdownType]);

  // 6-Month Historical Cash Flow Trend (Last 6 Months)
  const monthlyTrendData = useMemo(() => {
    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthObj = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mMonth = monthObj.getMonth();
      const mYear = monthObj.getFullYear();
      const monthLabel = monthObj.toLocaleString('default', { month: 'short' });

      const monthTxns = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === mMonth && d.getFullYear() === mYear;
      });

      const inc = monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const exp = monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      result.push({
        month: monthLabel,
        Income: inc,
        Expense: exp,
        Savings: inc - exp
      });
    }
    return result;
  }, [transactions]);

  // Daily Spend Average & Peak Spend Day calculations
  const dailySpendStats = useMemo(() => {
    const expenses = filteredTxns.filter(t => t.type === 'expense');
    if (expenses.length === 0) return { avg: 0, peakDay: 'N/A', peakAmount: 0, topCategory: 'None' };

    // Calculate total days in period
    let daysCount = 30;
    if (period === 'this_month') daysCount = new Date().getDate();
    else if (period === 'last_month') daysCount = 30;
    else if (period === 'last_3_months') daysCount = 90;
    else if (period === 'this_year') daysCount = 365;

    const avg = Math.round(totalExpense / Math.max(1, daysCount));

    // Group expenses by date (YYYY-MM-DD)
    const dayMap = {};
    expenses.forEach(t => {
      const dayKey = t.date ? t.date.split('T')[0] : 'Unknown';
      dayMap[dayKey] = (dayMap[dayKey] || 0) + t.amount;
    });

    let peakDay = 'N/A';
    let peakAmount = 0;
    Object.entries(dayMap).forEach(([day, amount]) => {
      if (amount > peakAmount) {
        peakAmount = amount;
        peakDay = new Date(day).toLocaleDateString('default', { month: 'short', day: 'numeric' });
      }
    });

    const topCat = categoryBreakdown.length > 0 ? `${categoryBreakdown[0].name} (${categoryBreakdown[0].percent}%)` : 'None';

    return { avg, peakDay, peakAmount, topCategory: topCat };
  }, [filteredTxns, totalExpense, period, categoryBreakdown]);

  return (
    <div className="page" style={{ paddingBottom: '110px' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={24} color="var(--accent-primary)" />
            Financial Insights
          </h1>
          <p className="subtitle">Performance & spending analytics</p>
        </div>
        <Link to="/settings/categories" style={{ color: 'var(--text-secondary)', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <Settings size={20} />
        </Link>
      </div>

      {/* Time Period Selector Bar */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px',
        scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        {TIME_PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: '8px 14px', borderRadius: '12px', border: '1px solid',
              borderColor: period === p.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
              background: period === p.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
              color: period === p.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '12px', fontWeight: period === p.id ? '800' : '500',
              whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Executive Net Cash Flow & Savings Rate Card */}
      <div className="glass-panel" style={{
        padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--bg-glass-subtle), var(--bg-surface))',
        border: '1px solid var(--border-subtle)', boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>NET CASH FLOW</p>
            <h2 style={{ fontSize: '28px', fontWeight: '900', color: netSavings >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', marginTop: '2px' }}>
              {netSavings >= 0 ? '+' : '-'}${Math.abs(netSavings).toLocaleString()}
            </h2>
          </div>
          <div style={{
            padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
            background: netSavings >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${netSavings >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: netSavings >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {netSavings >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {netSavings >= 0 ? 'SURPLUS' : 'DEFICIT'}
          </div>
        </div>

        {/* Income vs Expenses Mini Dual Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)', fontSize: '11px', fontWeight: '700' }}>
              <TrendingUp size={14} /> Income
            </div>
            <p style={{ fontSize: '15px', fontWeight: '800', marginTop: '2px' }}>+${totalIncome.toLocaleString()}</p>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-danger)', fontSize: '11px', fontWeight: '700' }}>
              <TrendingDown size={14} /> Expenses
            </div>
            <p style={{ fontSize: '15px', fontWeight: '800', marginTop: '2px' }}>-${totalExpense.toLocaleString()}</p>
          </div>
        </div>

        {/* Savings Rate Meter */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Savings Rate</span>
            <span style={{ fontWeight: '800', color: 'var(--accent-primary)' }}>{savingsRate}% Saved</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(100, savingsRate)}%`,
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))',
              borderRadius: '4px', transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>

      {/* 6-Month Cash Flow Trend Chart */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="var(--accent-primary)" />
            6-Month Cash Flow Trend
          </h3>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>Income vs Expense</span>
        </div>

        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'var(--bg-glass-subtle)' }}
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)' }}
                formatter={(val) => `$${val.toLocaleString()}`}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown (Donut Chart + Ranked List) */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Category Breakdown</h3>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-glass-subtle)', padding: '3px', borderRadius: '10px' }}>
            {['expense', 'income'].map(t => (
              <button
                key={t}
                onClick={() => setBreakdownType(t)}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '800',
                  background: breakdownType === t ? 'var(--accent-primary)' : 'transparent',
                  color: breakdownType === t ? 'white' : 'var(--text-secondary)',
                  textTransform: 'capitalize', cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
            No {breakdownType} records for this period.
          </p>
        ) : (
          <div>
            {/* Donut Chart */}
            <div style={{ width: '100%', height: '220px', position: 'relative', marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label 
                      value={`$${(breakdownType === 'expense' ? totalExpense : totalIncome).toLocaleString()}`} 
                      position="center" 
                      fill="var(--text-primary)" 
                      style={{ fontSize: '15px', fontWeight: '900' }} 
                    />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', color: 'var(--text-primary)' }}
                    formatter={(val) => `$${val.toLocaleString()}`}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Category List with Percentage Pills (Collapsible) */}
            <div style={{ marginTop: '12px' }}>
              <button 
                onClick={() => setShowAllCategories(!showAllCategories)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  background: 'var(--bg-glass-subtle)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  cursor: 'pointer', marginBottom: '12px'
                }}
              >
                <span>{showAllCategories ? 'Collapse Category List' : `View All ${categoryBreakdown.length} Categories`}</span>
                <ChevronRight size={16} style={{ transform: showAllCategories ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s ease' }} />
              </button>

              {showAllCategories && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.2s ease' }}>
                  {categoryBreakdown.map(cat => {
                    const IconComp = ICON_MAP[cat.icon] || MoreHorizontal;
                    return (
                      <div key={cat.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', background: 'var(--bg-glass-subtle)',
                        borderRadius: '12px', borderLeft: `4px solid ${cat.color}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'var(--bg-glass-subtle)', color: cat.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <IconComp size={18} />
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: '700' }}>{cat.name}</p>
                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{cat.count} transaction{cat.count > 1 ? 's' : ''}</p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                            background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}40`
                          }}>
                            {cat.percent}%
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '800' }}>${cat.value.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Smart Key Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <DollarSign size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>DAILY AVG SPEND</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)' }}>${dailySpendStats.avg}<span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>/day</span></p>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <Award size={14} color="var(--accent-danger)" />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>PEAK SPEND DAY</span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-danger)' }}>{dailySpendStats.peakDay}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>${dailySpendStats.peakAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Savings Simulator Quick Link */}
      <Link to="/savings-simulator" style={{ textDecoration: 'none' }}>
        <div className="glass-panel" style={{
          padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(0,0,0,0))',
          border: '1px solid rgba(16,185,129,0.2)'
        }}>
          <div>
            <p style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>💰 Savings Forecast Simulator</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Project your wealth growth over 1, 3, and 5 years</p>
          </div>
          <ChevronRight size={20} color="var(--accent-success)" />
        </div>
      </Link>
    </div>
  );
}
