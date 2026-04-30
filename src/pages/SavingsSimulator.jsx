import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, TrendingUp } from 'lucide-react';

export default function SavingsSimulator() {
  const navigate = useNavigate();
  const transactions = useStore(state => state.transactions);
  const accounts = useStore(state => state.accounts);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Calculate current monthly surplus (avg of last 3 months)
  const now = new Date();
  let totalSurplus = 0;
  for (let i = 1; i <= 3; i++) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const mTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= m && d <= mEnd;
    });
    const inc = mTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = mTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    totalSurplus += inc - exp;
  }
  const avgMonthlySurplus = Math.max(0, Math.round(totalSurplus / 3));

  const [monthlySavings, setMonthlySavings] = useState(avgMonthlySurplus || 100);

  // Build projection data (36 months)
  const buildProjection = (monthly) => {
    const data = [];
    let balanceCurrent = 0; // Start at 0 to show pure savings growth
    let balanceAutomatic = 0;

    for (let month = 1; month <= 36; month++) {
      balanceCurrent += monthly;
      balanceAutomatic += avgMonthlySurplus;
      data.push({
        month: month % 12 === 0 ? `${month / 12}yr` : `${month}m`,
        'Your Plan': Math.round(balanceCurrent),
        'Current Habits': Math.round(balanceAutomatic),
      });
    }
    return data;
  };

  const chartData = buildProjection(monthlySavings);
  const in1Year = chartData[11];
  const in2Years = chartData[23];
  const in3Years = chartData[35];

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="title" style={{ fontSize: '20px', marginBottom: 0 }}>Savings Simulator</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>How much will you accumulate?</p>
        </div>
      </div>

      {/* Current State */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center' }}>Avg Monthly Surplus (Last 3 Months)</p>
        <p style={{ fontSize: '24px', fontWeight: '900', color: avgMonthlySurplus > 0 ? 'var(--accent-success)' : 'var(--accent-danger)', textAlign: 'center' }}>
          {avgMonthlySurplus > 0 ? '+' : ''}${avgMonthlySurplus.toLocaleString()}
        </p>
      </div>

      {/* Slider */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontWeight: '700', fontSize: '14px' }}>Monthly Savings Goal</p>
          <p style={{ fontWeight: '900', fontSize: '18px', color: 'var(--accent-success)' }}>${monthlySavings.toLocaleString()}</p>
        </div>
        <input
          type="range"
          min="0"
          max={Math.max(2000, avgMonthlySurplus * 3)}
          step="10"
          value={monthlySavings}
          onChange={e => setMonthlySavings(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--accent-success)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          <span>$0</span>
          <span>${Math.max(2000, avgMonthlySurplus * 3).toLocaleString()}</span>
        </div>
      </div>

      {/* Milestone Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {[{ label: 'In 1 Year', data: in1Year }, { label: 'In 2 Years', data: in2Years }, { label: 'In 3 Years', data: in3Years }].map(({ label, data }) => (
          <div key={label} className="glass-panel" style={{ padding: '12px', textAlign: 'center', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--accent-success)' }}>+${data?.['Your Plan']?.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <p style={{ fontWeight: '700', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} color="var(--accent-success)" /> Growth Projection
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData.filter((_, i) => i % 3 === 2)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              formatter={v => `$${v.toLocaleString()}`}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="Your Plan" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Current Habits" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '12px', textAlign: 'center' }}>
          Dashed line = what you'd accumulate by just sticking to current habits
        </p>
      </div>
    </div>
  );
}
