import React from 'react';
import useStore from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Sankey, Label } from 'recharts';
import { Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home, Heart, MoreHorizontal, Settings, ChevronRight } from 'lucide-react';
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

export default function Insights() {
  const transactions = useStore(state => state.transactions);
  const categories = useStore(state => state.categories);
  const accounts = useStore(state => state.accounts);
  
  // Prepare Sankey Data
  const getSankeyData = () => {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const addNode = (name, id) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, nodes.length);
        nodes.push({ name });
      }
      return nodeMap.get(id);
    };

    // Aggregate values to avoid duplicate links between same source/target
    const linkAggregator = {};

    // 1. Links from Accounts to Categories (Expenses)
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const fromAcc = accounts.find(a => a.id === t.fromAccountId);
      const category = categories.find(c => c.id === t.categoryId);
      if (fromAcc && category) {
        const s = fromAcc.id;
        const t_id = category.id;
        const key = `${s}->${t_id}`;
        linkAggregator[key] = (linkAggregator[key] || 0) + t.amount;
        addNode(fromAcc.name, s);
        addNode(category.name, t_id);
      }
    });

    // 2. Links between Accounts (Transfers)
    transactions.filter(t => t.type === 'transfer').forEach(t => {
      const fromAcc = accounts.find(a => a.id === t.fromAccountId);
      const toAcc = accounts.find(a => a.id === t.toAccountId);
      if (fromAcc && toAcc) {
        const s = fromAcc.id;
        const t_id = toAcc.id;
        const key = `${s}->${t_id}`;
        linkAggregator[key] = (linkAggregator[key] || 0) + t.amount;
        addNode(fromAcc.name, s);
        addNode(toAcc.name, t_id);
      }
    });

    // Convert aggregated links to Sankey format
    Object.keys(linkAggregator).forEach(key => {
      const [s_id, t_id] = key.split('->');
      links.push({
        source: nodeMap.get(s_id),
        target: nodeMap.get(t_id),
        value: linkAggregator[key]
      });
    });

    return { nodes, links };
  };

  const sankeyData = getSankeyData();

  const [breakdownType, setBreakdownType] = React.useState('expense');

  // Calculate expenses by category
  const expensesList = transactions.filter(t => t.type === 'expense');
  const categoryData = categories.filter(c => c.type === 'expense').map(cat => {
    const total = expensesList.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
    return { name: cat.name, value: total, color: cat.color };
  }).filter(d => d.value > 0);

  // Calculate income by category
  const incomeList = transactions.filter(t => t.type === 'income');
  const incomeCategoryData = categories.filter(c => c.type === 'income').map(cat => {
    const total = incomeList.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
    return { name: cat.name, value: total, color: cat.color };
  }).filter(d => d.value > 0);

  // Calculate monthly stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTxns = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const income = monthlyTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = monthlyTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const transfer = monthlyTxns.filter(t => t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0);

  const monthlyComparison = [
    { name: 'This Month', income, expense }
  ];

  return (
    <div className="page">
      <div className="flex-between">
        <div>
          <h1 className="title">Insights</h1>
          <p className="subtitle">Detailed reporting for {now.toLocaleString('default', { month: 'long' })}</p>
        </div>
        <Link to="/settings/categories" style={{ color: 'var(--text-secondary)', padding: '8px' }}>
          <Settings size={24} />
        </Link>
      </div>
      

      {/* Monthly Comparison */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', height: '240px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>Income vs. Expense</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={monthlyComparison} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              contentStyle={{ background: 'var(--bg-surface-elevated)', border: 'none', borderRadius: '8px' }}
            />
            <Legend iconType="circle" />
            <Bar dataKey="income" fill="var(--accent-success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="var(--accent-danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown (Income/Expense Toggle) */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
          {['expense', 'income'].map(t => (
            <button 
              key={t}
              onClick={() => setBreakdownType(t)}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '700',
                background: breakdownType === t ? 'var(--accent-primary)' : 'transparent',
                color: breakdownType === t ? 'white' : 'var(--text-secondary)',
                textTransform: 'capitalize', cursor: 'pointer'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '800' }}>
          {breakdownType === 'expense' ? 'Expense Breakdown' : 'Income Sources'}
        </h3>
        
        {(() => {
          const currentData = breakdownType === 'expense' ? categoryData : incomeCategoryData;
          const totalVal = breakdownType === 'expense' ? expense : income;

          if (currentData.length === 0) {
            return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No {breakdownType} recorded this month.</p>;
          }

          return (
            <div style={{ width: '100%', height: '400px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1.5 }}
                    style={{ fontSize: '11px', fontWeight: '800' }}
                  >
                    {currentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label 
                      value={`$${totalVal.toLocaleString()}`} 
                      position="center" 
                      fill="white" 
                      style={{ fontSize: '16px', fontWeight: '800' }} 
                    />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-surface-elevated)', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>


      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Income</p>
          <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-success)' }}>+${income.toLocaleString()}</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Expense</p>
          <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-danger)' }}>-${expense.toLocaleString()}</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px', gridColumn: 'span 2' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Monthly Transfers</p>
          <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-transfer)' }}>${transfer.toLocaleString()}</p>
        </div>
      </div>

      {/* Invisible Budget */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '4px', fontSize: '15px', fontWeight: '700' }}>🧠 Invisible Budget</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Your natural spending limits, discovered from 3 months of data.</p>
        {(() => {
          const results = categories.filter(c => c.type === 'expense').map(cat => {
            let monthlyAmounts = [];
            for (let i = 1; i <= 3; i++) {
              const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
              const total = transactions
                .filter(t => t.type === 'expense' && t.categoryId === cat.id && new Date(t.date) >= m && new Date(t.date) <= mEnd)
                .reduce((sum, t) => sum + t.amount, 0);
              monthlyAmounts.push(total);
            }
            const avg = monthlyAmounts.reduce((s, v) => s + v, 0) / 3;
            const max = Math.max(...monthlyAmounts);
            const min = Math.min(...monthlyAmounts);
            const variance = max - min;
            const isControlled = avg > 0 && variance < avg * 0.5;
            return { ...cat, avg: Math.round(avg), variance: Math.round(variance), isControlled };
          }).filter(c => c.avg > 0).sort((a, b) => b.avg - a.avg);

          if (results.length === 0) return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Not enough data yet. Keep recording for 3 months!</p>;

          return results.map(cat => (
            <div key={cat.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.isControlled ? '#10b981' : '#f59e0b' }} />
                  <p style={{ fontSize: '13px', fontWeight: '600' }}>{cat.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', fontWeight: '800' }}>${cat.avg}/mo</p>
                  <p style={{ fontSize: '10px', color: cat.isControlled ? '#10b981' : '#f59e0b' }}>
                    {cat.isControlled ? '✓ Stable' : `⚡ Varies ±$${cat.variance}`}
                  </p>
                </div>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (cat.avg / (results[0]?.avg || 1)) * 100)}%`, background: cat.isControlled ? '#10b981' : '#f59e0b', borderRadius: '2px' }} />
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Savings Simulator Link */}
      <Link to="/savings-simulator" style={{ textDecoration: 'none' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(0,0,0,0))', border: '1px solid rgba(16,185,129,0.1)' }}>
          <div>
            <p style={{ fontWeight: '700', fontSize: '14px' }}>💰 Savings Simulator</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>See where you'll be in 1, 2, 3 years</p>
          </div>
          <ChevronRight size={20} color="var(--text-secondary)" />
        </div>
      </Link>
    </div>
  );
}
