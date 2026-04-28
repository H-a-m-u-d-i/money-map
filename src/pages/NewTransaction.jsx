import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, CheckCircle, ChevronLeft, ChevronRight, Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home, Heart, MoreHorizontal, Calculator } from 'lucide-react';
import NumericInputer from '../components/NumericInputer';
import AccountSelector from '../components/AccountSelector';

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

export default function NewTransaction() {
  const navigate = useNavigate();
  const location = useLocation();
  const accounts = useStore(state => state.accounts);
  const categories = useStore(state => state.categories);
  const addTransaction = useStore(state => state.addTransaction);
  const editTransaction = useStore(state => state.editTransaction);
  const transactions = useStore(state => state.transactions);

  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode') || 'expense';
  const editId = queryParams.get('edit');
  const existingTxn = editId ? transactions.find(t => t.id === editId) : null;

  const [step, setStep] = useState(1);
  const [type, setType] = useState(existingTxn?.type || mode); 
  const [amount, setAmount] = useState(existingTxn?.amount.toString() || '');
  const [note, setNote] = useState(existingTxn?.note || '');
  const [fromAccountId, setFromAccountId] = useState(existingTxn?.fromAccountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(existingTxn?.toAccountId || accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(existingTxn?.categoryId || '');
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(null); // 'from' or 'to'
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handleClickAway = (e) => {
      if (!e.target.closest('.input-group')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

  useEffect(() => {
    if (mode && !editId) setType(mode);
  }, [mode, editId]);

  const nextStep = () => {
    if (step === 1) {
      if (!amount || parseFloat(amount) <= 0) {
        alert("Please enter a valid amount.");
        return;
      }
      if (type === 'transfer') {
        if (fromAccountId === toAccountId) {
          alert("Source and destination accounts must be different.");
          return;
        }
        handleSubmit();
        return;
      }
      if (type === 'withdrawal') {
        const cashAcc = accounts.find(a => a.type === 'cash');
        if (!cashAcc) {
          alert("Please create a 'Cash' wallet first to perform a withdrawal.");
          return;
        }
        handleSubmit(categoryId, cashAcc.id);
        return;
      }
      if (type === 'income') {
        if (!toAccountId) {
          alert("Please select a deposit account.");
          return;
        }
        handleSubmit();
        return;
      }
    }
    setStep(step + 1);
  };
  
  const prevStep = () => setStep(step - 1);

  const handleSubmit = (finalCategoryId = categoryId, finalToAccountId = toAccountId) => {
    if (!amount || isNaN(parseFloat(amount))) return;

    const txnData = {
      type,
      amount: parseFloat(amount),
      note: note.trim() || (type === 'income' ? 'Income' : type === 'expense' ? 'Expense' : type === 'withdrawal' ? 'Withdrawal' : 'Transfer'),
      fromAccountId: (type === 'expense' || type === 'transfer' || type === 'withdrawal') ? fromAccountId : null,
      toAccountId: (type === 'income' || type === 'transfer' || type === 'withdrawal') ? finalToAccountId : null,
      categoryId: type === 'expense' ? finalCategoryId : null,
      date: existingTxn ? existingTxn.date : new Date().toISOString()
    };

    if (existingTxn) {
      editTransaction(editId, txnData);
    } else {
      addTransaction(txnData);
    }

    navigate('/');
  };

  const filteredCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      <div className="flex-between" style={{ padding: '20px 0' }}>
        <button onClick={() => step > 1 ? prevStep() : navigate('/')} className="btn" style={{ padding: '8px' }}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="title" style={{ fontSize: '18px', marginBottom: 0, textTransform: 'capitalize' }}>
          {existingTxn ? 'Edit' : `New ${type}`}
        </h1>
        <div style={{ width: '40px' }} />
      </div>

      {!existingTxn && step === 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['expense', 'income', 'transfer', 'withdrawal'].map(t => (
            <button 
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1, padding: '10px 4px', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: '700',
                background: type === t ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: type === t ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="input-group">
            <label className="input-label" style={{ textAlign: 'center', display: 'block' }}>Amount</label>
            <div 
              onClick={() => setShowCalculator(true)}
              className="input-field" 
              style={{ 
                fontSize: '42px', 
                textAlign: 'center', 
                fontWeight: '800', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                border: 'none',
                background: 'transparent'
              }}
            >
              <span style={{ color: type === 'expense' ? 'var(--accent-danger)' : type === 'income' ? 'var(--accent-success)' : 'var(--accent-transfer)' }}>
                {type === 'expense' ? '-' : type === 'income' ? '+' : ''}${amount || '0.00'}
              </span>
            </div>
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Note</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Description" 
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ textAlign: 'center', fontSize: '16px' }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && note.trim().length > 0 && (
              <div className="glass-panel" style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                maxHeight: '150px', overflowY: 'auto', marginTop: '4px',
                padding: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}>
                {[...new Set(transactions.map(t => t.note))]
                  .filter(n => n.toLowerCase().includes(note.toLowerCase()) && n.toLowerCase() !== note.toLowerCase())
                  .slice(0, 5)
                  .map((suggestion, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setNote(suggestion); setShowSuggestions(false); }}
                      style={{ 
                        padding: '10px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '14px', color: 'var(--text-secondary)'
                      }}
                    >
                      {suggestion}
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {(type === 'transfer' || type === 'withdrawal' || type === 'expense') && (
            <div className="input-group">
              <label className="input-label">From Account</label>
              <button 
                type="button"
                className="input-field" 
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setSelectorOpen('from')}
              >
                <span>{accounts.find(a => a.id === fromAccountId)?.name || 'Select Account'}</span>
                <ChevronRight size={18} color="var(--text-secondary)" />
              </button>
            </div>
          )}

          {(type === 'transfer' || type === 'income') && (
            <div className="input-group">
              <label className="input-label">{type === 'income' ? 'Deposit To' : 'To Account'}</label>
              <button 
                type="button"
                className="input-field" 
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setSelectorOpen('to')}
              >
                <span>{accounts.find(a => a.id === toAccountId)?.name || 'Select Account'}</span>
                <ChevronRight size={18} color="var(--text-secondary)" />
              </button>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            style={{ 
              width: '100%', marginTop: '24px', padding: '18px', borderRadius: '16px',
              background: type === 'expense' ? 'var(--accent-danger)' : type === 'income' ? 'var(--accent-success)' : 'var(--accent-transfer)'
            }} 
            onClick={nextStep}
          >
            {type === 'expense' ? 'Next: Category' : 'Complete Transaction'}
          </button>
        </div>
      )}

      {step === 2 && type === 'expense' && (
        <div className="animate-in">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>Choose Category</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {filteredCategories.map(cat => {
              const Icon = ICON_MAP[cat.icon] || ICON_MAP.more;
              return (
                <button 
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); handleSubmit(cat.id); }}
                  className="glass-panel"
                  style={{
                    padding: '20px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ color: cat.color }}><Icon size={28} /></div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectorOpen && (
        <AccountSelector 
          accounts={accounts}
          selectedId={selectorOpen === 'from' ? fromAccountId : toAccountId}
          onSelect={(id) => selectorOpen === 'from' ? setFromAccountId(id) : setToAccountId(id)}
          onClose={() => setSelectorOpen(null)}
          label={selectorOpen === 'from' ? 'Source Account' : 'Destination Account'}
        />
      )}

      {showCalculator && (
        <NumericInputer 
          value={amount}
          onChange={(val) => setAmount(val)}
          onDone={() => setShowCalculator(false)}
        />
      )}
    </div>
  );
}

const PlusCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);
