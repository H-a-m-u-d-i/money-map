import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, Plus, Trash2, CheckCircle, User, ArrowUpRight, ArrowDownRight, Calculator, ChevronRight } from 'lucide-react';
import NumericInputer from '../components/NumericInputer';
import AccountSelector from '../components/AccountSelector';

export default function Loans() {
  const navigate = useNavigate();
  const accounts = useStore(state => state.accounts);
  const loans = useStore(state => state.loans);
  const addLoan = useStore(state => state.addLoan);
  const deleteLoan = useStore(state => state.deleteLoan);
  const markLoanAsPaid = useStore(state => state.markLoanAsPaid);

  const [showAdd, setShowAdd] = useState(false);
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('received'); // given, received
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(null);

  const handleAdd = () => {
    if (!person || !amount) return;
    addLoan({ person, amount: parseFloat(amount), type, accountId, date: new Date().toISOString() });
    setPerson('');
    setAmount('');
    setShowAdd(false);
  };

  const handlePay = (id) => {
    const payAccountId = window.prompt("Select Account ID to pay from/to (or just confirm):", accountId);
    if (payAccountId) markLoanAsPaid(id, payAccountId);
  };

  const activeLoans = loans.filter(l => l.status === 'active');
  const paidLoans = loans.filter(l => l.status === 'paid');

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/')} className="btn" style={{ padding: '8px' }}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="title" style={{ fontSize: '20px', marginBottom: 0 }}>Loans & Debts</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
          <div className="input-group">
            <label className="input-label">Person Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Who?" 
              value={person}
              onChange={e => setPerson(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, background: type === 'received' ? 'var(--accent-primary)' : 'var(--bg-surface)' }}
                onClick={() => setType('received')}
              >
                Borrowed
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, background: type === 'given' ? 'var(--accent-primary)' : 'var(--bg-surface)' }}
                onClick={() => setType('given')}
              >
                Lent
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Amount</label>
            <div 
              onClick={() => setShowCalculator(true)}
              className="input-field" 
              style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Calculator size={20} color="var(--accent-primary)" />
              {amount || '0.00'}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Account</label>
            <button 
              type="button"
              className="input-field" 
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setSelectorOpen('loan')}
            >
              <span>{accounts.find(a => a.id === accountId)?.name || 'Select Account'}</span>
              <ChevronRight size={18} color="var(--text-secondary)" />
            </button>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={handleAdd}>
            Create Loan Record
          </button>
        </div>
      )}

      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Active Loans</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {activeLoans.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No active loans.</p>
        ) : (
          activeLoans.map(loan => (
            <div key={loan.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: loan.type === 'given' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: loan.type === 'given' ? 'var(--accent-primary)' : 'var(--accent-danger)'
                }}>
                  {loan.type === 'given' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <h4 style={{ fontWeight: '600' }}>{loan.person}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {loan.type === 'given' ? 'You Lent' : 'You Borrowed'}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: '800', fontSize: '16px' }}>${loan.amount.toLocaleString()}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={() => handlePay(loan.id)} className="btn" style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--bg-surface-elevated)' }}>
                    Mark Paid
                  </button>
                  <button onClick={() => deleteLoan(loan.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.6)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Paid History</h3>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Lent (Returned to you)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paidLoans.filter(l => l.type === 'given').map(loan => (
            <div key={loan.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={16} color="var(--accent-success)" />
                <span style={{ fontSize: '14px' }}>{loan.person} (${loan.amount.toLocaleString()})</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(loan.date).toLocaleDateString()}</span>
            </div>
          ))}
          {paidLoans.filter(l => l.type === 'given').length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No history.</p>}
        </div>
      </div>

      <div>
        <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Borrowed (You paid back)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paidLoans.filter(l => l.type === 'received').map(loan => (
            <div key={loan.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={16} color="var(--accent-success)" />
                <span style={{ fontSize: '14px' }}>{loan.person} (${loan.amount.toLocaleString()})</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(loan.date).toLocaleDateString()}</span>
            </div>
          ))}
          {paidLoans.filter(l => l.type === 'received').length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No history.</p>}
        </div>
      </div>

      {showCalculator && (
        <NumericInputer 
          value={amount} 
          onChange={setAmount} 
          onDone={() => setShowCalculator(false)} 
        />
      )}

      {selectorOpen && (
        <AccountSelector 
          accounts={accounts}
          selectedId={accountId}
          onSelect={(id) => setAccountId(id)}
          onClose={() => setSelectorOpen(null)}
          label="Payment Account"
        />
      )}
    </div>
  );
}
