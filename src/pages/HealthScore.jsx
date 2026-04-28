import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Target, Info, ArrowRight } from 'lucide-react';

export default function HealthScore() {
  const navigate = useNavigate();
  const transactions = useStore(state => state.transactions);
  const categories = useStore(state => state.categories);

  // 1. Calculate Period Stats
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const getMonthTotal = (m, y) => transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y)
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthTotal = getMonthTotal(thisMonth, thisYear);
  const previousMonthTotal = getMonthTotal(lastMonth, lastMonthYear);

  // 2. Trend Score (Comparison)
  const trend = previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
  
  // 3. Category Stress Test (Which category is eating too much?)
  const catTotals = categories.filter(c => c.type === 'expense').map(cat => {
    const total = transactions
      .filter(t => t.categoryId === cat.id && new Date(t.date).getMonth() === thisMonth)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, total };
  }).sort((a, b) => b.total - a.total);

  const topCategory = catTotals[0];
  const topCatUsage = currentMonthTotal > 0 ? (topCategory.total / currentMonthTotal) * 100 : 0;

  // 4. Calculate Final Score (0 - 100)
  // Base 100. Subtract for: high trend (+%), high single-cat usage (>40%)
  let score = 100;
  if (trend > 10) score -= 15;
  if (trend > 30) score -= 20;
  if (topCatUsage > 40) score -= 15;
  if (topCatUsage > 60) score -= 20;
  score = Math.max(0, score);

  // 5. Forecast
  const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyAvg = dayOfMonth > 0 ? currentMonthTotal / dayOfMonth : 0;
  const forecastedTotal = dailyAvg * daysInMonth;

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/')} className="btn" style={{ padding: '8px' }}><ChevronLeft size={24} /></button>
        <h1 className="title" style={{ fontSize: '20px', marginBottom: 0 }}>Financial Health</h1>
        <div style={{ width: '40px' }} />
      </div>

      {/* Main Score Circle */}
      <div className="glass-panel" style={{ 
        padding: '40px 20px', textAlign: 'center', marginBottom: '24px',
        background: `radial-gradient(circle at center, ${score > 70 ? 'rgba(16,185,129,0.1)' : score > 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'} 0%, rgba(0,0,0,0) 70%)`
      }}>
        <div style={{ 
          fontSize: '64px', fontWeight: '900', 
          color: score > 70 ? 'var(--accent-success)' : score > 40 ? 'var(--accent-warning)' : 'var(--accent-danger)'
        }}>
          {score}
        </div>
        <p style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>
          {score > 70 ? 'Excellent' : score > 40 ? 'Fair' : 'Poor'} Health
        </p>
      </div>

      {/* Insight Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Trend Insight */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: trend <= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: trend <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {trend <= 0 ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: '700', fontSize: '15px' }}>Spending Trend</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {trend <= 0 
                ? `Great! You are spending ${Math.abs(trend).toFixed(1)}% less than last month.` 
                : `Caution: Spending is up by ${trend.toFixed(1)}% compared to last month.`
              }
            </p>
          </div>
        </div>

        {/* Category Alert */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: topCatUsage > 40 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: topCatUsage > 40 ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
            {topCatUsage > 40 ? <AlertTriangle size={24} /> : <Target size={24} />}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: '700', fontSize: '15px' }}>Category Focus</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {topCategory?.name} is your biggest expense, taking up {topCatUsage.toFixed(1)}% of your budget.
            </p>
          </div>
        </div>

        {/* Forecast Card */}
        <div className="glass-panel" style={{ 
          padding: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(0,0,0,0) 100%)',
          borderLeft: '4px solid var(--accent-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Info size={16} color="var(--accent-primary)" />
            <h4 style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase' }}>Monthly Forecast</h4>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Based on your daily average of <strong>${dailyAvg.toFixed(2)}</strong>, you will likely spend 
            <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--accent-primary)', display: 'block', marginTop: '4px' }}>
              ${forecastedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            by the end of this month.
          </p>
        </div>

      </div>
    </div>
  );
}
