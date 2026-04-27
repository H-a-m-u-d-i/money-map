import React from 'react';
import useStore from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Sankey, Label } from 'recharts';
import { Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home, Heart, MoreHorizontal, Settings } from 'lucide-react';
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

  // Calculate expenses by category
  const expensesList = transactions.filter(t => t.type === 'expense');
  const categoryData = categories.filter(c => c.type === 'expense').map(cat => {
    const total = expensesList.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
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
      
      {/* Wealth Flow (Sankey) */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>Wealth Flow</h3>
        {sankeyData.links.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Not enough transfer/expense data to show flow.</p>
        ) : (
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                node={{ stroke: 'var(--accent-primary)', strokeWidth: 2 }}
                link={{ stroke: 'var(--accent-primary)', strokeOpacity: 0.2 }}
                margin={{ top: 20, left: 10, right: 10, bottom: 20 }}
              >
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-surface-elevated)', border: 'none', borderRadius: '8px' }}
                />
              </Sankey>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <span>ACCOUNTS</span>
              <span>DESTINATIONS</span>
            </div>
          </div>
        )}
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

      {/* Category Breakdown (Circular Dashboard Style) */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '800' }}>Expense Breakdown</h3>
        
        {categoryData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No expenses recorded this month.</p>
        ) : (
          <div style={{ width: '100%', height: '320px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label 
                    value={`$${expense.toLocaleString()}`} 
                    position="center" 
                    fill="white" 
                    style={{ fontSize: '20px', fontWeight: '800' }} 
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Floating Category Icons around the chart */}
            {categoryData.map((cat, index) => {
              const angle = (index / categoryData.length) * 360 - 90;
              const radius = 135;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              
              const catObj = categories.find(c => c.name === cat.name);
              const Icon = ICON_MAP[catObj?.icon] || MoreHorizontal;

              return (
                <div 
                  key={index}
                  style={{
                    position: 'absolute',
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 10
                  }}
                >
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '10px', 
                    background: 'var(--bg-surface-elevated)', border: `1px solid ${cat.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cat.color, marginBottom: '2px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    <Icon size={18} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                    {((cat.value / expense) * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
    </div>
  );
}
