import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Plus, CreditCard, Landmark, Coins, Edit2, Trash2, X } from 'lucide-react';

export default function Wallets() {
  const accounts = useStore(state => state.accounts);
  const addAccount = useStore(state => state.addAccount);
  const updateAccount = useStore(state => state.updateAccount);
  const deleteAccount = useStore(state => state.deleteAccount);
  
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [balance, setBalance] = useState('');
  
  const resetForm = () => {
    setName('');
    setType('bank');
    setBalance('');
    setShowForm(false);
    setEditId(null);
  };

  const handleEdit = (acc) => {
    setEditId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || balance === '') return;
    
    const accountData = {
      name,
      type,
      balance: parseFloat(balance) || 0,
      color: type === 'cash' ? '#10b981' : '#3b82f6'
    };

    if (editId) {
      updateAccount(editId, accountData);
    } else {
      addAccount(accountData);
    }
    
    resetForm();
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="title" style={{ fontSize: '20px' }}>Wallets</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Total: <span style={{color: 'var(--accent-success)', fontWeight: '800'}}>${totalBalance.toLocaleString()}</span></p>
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '12px' }} onClick={() => showForm ? resetForm() : setShowForm(true)}>
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span style={{ fontSize: '13px' }}>{showForm ? 'Cancel' : 'Add'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '24px', marginBottom: '24px', animation: 'slideDown 0.3s ease' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>{editId ? 'Edit Wallet' : 'New Wallet'}</h3>
          
          <div className="input-group">
            <label className="input-label">Account Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. My Savings" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Account Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['bank', 'cash'].map(t => (
                <button 
                  key={t}
                  type="button"
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    background: type === t ? (t === 'bank' ? 'var(--accent-primary)' : 'var(--accent-success)') : 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: type === t ? 'white' : 'var(--text-secondary)'
                  }}
                  onClick={() => setType(t)}
                >
                  {t === 'bank' ? <Landmark size={18} /> : <Coins size={18} />}
                  <span style={{ textTransform: 'capitalize' }}>{t}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label">Initial Balance ($)</label>
            <input 
              type="number" 
              step="0.01"
              className="input-field" 
              placeholder="0.00" 
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '16px' }}>
            {editId ? 'Update Wallet' : 'Create Wallet'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {accounts.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <CreditCard size={48} style={{ opacity: 0.1, margin: '0 auto 16px auto' }} />
            <p>Your vault is empty.</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="glass-panel" style={{ 
              padding: '16px 20px', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: `4px solid ${acc.color}`,
              transition: 'transform 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: acc.color
                }}>
                  {acc.type === 'bank' ? <Landmark size={20} /> : <Coins size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>{acc.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{acc.type}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>${acc.balance.toLocaleString()}</h3>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleEdit(acc)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}><Edit2 size={14} /></button>
                  <button onClick={() => { if(window.confirm('Delete this wallet?')) deleteAccount(acc.id) }} style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.4)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
