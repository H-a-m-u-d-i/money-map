import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, Plus, Trash2, Calendar, Repeat, ArrowUpRight, ArrowDownRight, X, ChevronRight } from 'lucide-react';
import AccountSelector from '../components/AccountSelector';

const FormModal = ({ type, setType, amount, setAmount, frequency, setFrequency, note, setNote, accountId, setAccountId, accounts, setSelectorOpen, handleAdd, onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
  }}>
    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '28px 24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontWeight: '800', fontSize: '18px' }}>New Recurring</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}><X size={22} /></button>
      </div>

      <div className="input-group">
        <label className="input-label">Type</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['expense', 'income'].map(t => (
            <button
              key={t}
              className="btn"
              style={{ flex: 1, background: type === t ? 'var(--accent-primary)' : 'var(--bg-surface)', fontWeight: '700' }}
              onClick={() => setType(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Frequency</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['daily', 'weekly', 'monthly'].map(f => (
            <button
              key={f}
              className="btn"
              style={{ flex: 1, background: frequency === f ? 'var(--accent-primary)' : 'var(--bg-surface)', fontSize: '12px' }}
              onClick={() => setFrequency(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Amount</label>
        <input type="number" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      </div>

      <div className="input-group">
        <label className="input-label">Account</label>
        <button className="input-field" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }} onClick={() => setSelectorOpen(true)}>
          <span>{accounts.find(a => a.id === accountId)?.name || 'Select'}</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="input-group">
        <label className="input-label">Note</label>
        <input type="text" className="input-field" value={note} onChange={e => setNote(e.target.value)} placeholder="Rent, Salary, etc." />
      </div>

      <button className="btn btn-primary" style={{ width: '100%', padding: '16px', marginTop: '10px' }} onClick={handleAdd}>
        Start Recurring
      </button>
    </div>
  </div>
);

export default function RecurringManager() {
  const navigate = useNavigate();
  const accounts = useStore(state => state.accounts);
  const categories = useStore(state => state.categories);
  const recurring = useStore(state => state.recurring);
  const addRecurring = useStore(state => state.addRecurring);
  const deleteRecurring = useStore(state => state.deleteRecurring);

  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleAdd = () => {
    if (!amount || !note) return;
    const cat = categories.find(c => c.type === type);
    addRecurring({
      type,
      amount: parseFloat(amount),
      frequency,
      note,
      fromAccountId: type === 'expense' ? accountId : null,
      toAccountId: type === 'income' ? accountId : null,
      categoryId: cat?.id || '',
      nextDate: new Date().toISOString()
    });
    setShowAdd(false);
    setAmount('');
    setNote('');
  };

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/')} className="btn" style={{ padding: '8px' }}><ChevronLeft size={24} /></button>
        <h1 className="title" style={{ fontSize: '20px', marginBottom: 0 }}>Recurring</h1>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ padding: '8px 16px' }}><Plus size={20} /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recurring.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Repeat size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>No recurring payments set up yet.</p>
          </div>
        ) : (
          recurring.map(rec => (
            <div key={rec.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: rec.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: rec.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)'
                }}>
                  <Repeat size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: '700' }}>{rec.note}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {rec.frequency.toUpperCase()} • Next: {new Date(rec.nextDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: '800', color: rec.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {rec.type === 'income' ? '+' : '-'}${rec.amount.toLocaleString()}
                </p>
                <button onClick={() => deleteRecurring(rec.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.5)', marginTop: '4px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <FormModal 
          type={type} setType={setType} amount={amount} setAmount={setAmount} 
          frequency={frequency} setFrequency={setFrequency} note={note} setNote={setNote} 
          accountId={accountId} setAccountId={setAccountId} accounts={accounts} 
          setSelectorOpen={setSelectorOpen} handleAdd={handleAdd} onClose={() => setShowAdd(false)}
        />
      )}

      {selectorOpen && (
        <AccountSelector 
          accounts={accounts} selectedId={accountId} 
          onSelect={id => { setAccountId(id); setSelectorOpen(false); }} 
          onClose={() => setSelectorOpen(false)} label="Payment Account"
        />
      )}
    </div>
  );
}
