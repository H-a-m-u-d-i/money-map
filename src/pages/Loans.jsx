import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, Plus, Trash2, CheckCircle, User, ArrowUpRight, ArrowDownRight, Calculator, ChevronRight, Edit2, ChevronDown, X } from 'lucide-react';
import NumericInputer from '../components/NumericInputer';
import AccountSelector from '../components/AccountSelector';

export default function Loans() {
  const navigate = useNavigate();
  const accounts = useStore(state => state.accounts);
  const loans = useStore(state => state.loans);
  const addLoan = useStore(state => state.addLoan);
  const editLoan = useStore(state => state.editLoan);
  const deleteLoan = useStore(state => state.deleteLoan);
  const recordLoanPayment = useStore(state => state.recordLoanPayment);

  // Add/Edit form state
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('received');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(null);

  // Payment modal state
  const [payModal, setPayModal] = useState(null); // { loan } or null
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [showPayCalculator, setShowPayCalculator] = useState(false);

  // Expanded loan for history
  const [expandedLoan, setExpandedLoan] = useState(null);

  const openAdd = () => {
    setEditingId(null);
    setPerson('');
    setAmount('');
    setType('received');
    setAccountId(accounts[0]?.id || '');
    setNote('');
    setModal('add');
  };

  const openEdit = (loan) => {
    setEditingId(loan.id);
    setPerson(loan.person);
    setAmount(loan.amount.toString());
    setType(loan.type);
    setAccountId(loan.accountId);
    setNote(loan.note || '');
    setModal('edit');
  };

  const handleSave = () => {
    if (!person.trim() || !amount || parseFloat(amount) <= 0) return;
    if (modal === 'add') {
      addLoan({ person: person.trim(), amount: parseFloat(amount), type, accountId, note: note.trim(), date: new Date().toISOString() });
    } else {
      editLoan(editingId, { person: person.trim(), note: note.trim() });
      // Note: only allow editing person/note, not amount/type/account after creation
    }
    setModal(null);
  };

  const openPayModal = (loan) => {
    const remaining = getRemainingAmount(loan);
    setPayAmount(remaining.toString());
    setPayAccountId(loan.accountId); // auto-fill with original account
    setPayModal(loan);
  };

  const handleRecordPayment = () => {
    if (!payAmount || parseFloat(payAmount) <= 0 || !payModal) return;
    const remaining = getRemainingAmount(payModal);
    const toPay = Math.min(parseFloat(payAmount), remaining);
    recordLoanPayment(payModal.id, toPay, payAccountId);
    setPayModal(null);
  };

  const getRemainingAmount = (loan) => {
    const paid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, loan.amount - paid);
  };

  const activeLoans = loans.filter(l => l.status !== 'paid');
  const paidLoans = loans.filter(l => l.status === 'paid');

  const FormModal = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '28px 24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontWeight: '800', fontSize: '18px' }}>{modal === 'add' ? 'New Loan Record' : 'Edit Loan'}</h3>
          <button onClick={() => setModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {modal === 'add' && (
          <div className="input-group">
            <label className="input-label">Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                style={{ flex: 1, background: type === 'received' ? 'rgba(239,68,68,0.2)' : 'var(--bg-surface)', border: type === 'received' ? '1px solid var(--accent-danger)' : 'none', color: type === 'received' ? 'var(--accent-danger)' : 'var(--text-secondary)', fontWeight: '700' }}
                onClick={() => setType('received')}
              >
                ↓ Borrowed
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: type === 'given' ? 'rgba(16,185,129,0.2)' : 'var(--bg-surface)', border: type === 'given' ? '1px solid var(--accent-success)' : 'none', color: type === 'given' ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: '700' }}
                onClick={() => setType('given')}
              >
                ↑ Lent Out
              </button>
            </div>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">{type === 'received' ? 'Borrowed from' : 'Lent to'}</label>
          <input type="text" className="input-field" placeholder="Person's name" value={person} onChange={e => setPerson(e.target.value)} />
        </div>

        {modal === 'add' && (
          <>
            <div className="input-group">
              <label className="input-label">Amount</label>
              <div
                onClick={() => setShowCalculator(true)}
                className="input-field"
                style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: type === 'received' ? 'var(--accent-danger)' : 'var(--accent-success)' }}
              >
                {amount || '0.00'}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">{type === 'received' ? 'Add to Account (money received)' : 'Deduct from Account (money given)'}</label>
              <button
                type="button" className="input-field"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setSelectorOpen('loan')}
              >
                <span>{accounts.find(a => a.id === accountId)?.name || 'Select Account'}</span>
                <ChevronRight size={18} color="var(--text-secondary)" />
              </button>
            </div>
          </>
        )}

        <div className="input-group">
          <label className="input-label">Note (optional)</label>
          <input type="text" className="input-field" placeholder="What for?" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '8px', padding: '16px', borderRadius: '14px', background: type === 'received' ? 'var(--accent-danger)' : 'var(--accent-success)' }}
          onClick={handleSave}
        >
          {modal === 'add' ? 'Create Loan Record' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const PayModal = () => {
    if (!payModal) return null;
    const remaining = getRemainingAmount(payModal);
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '28px 24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '18px' }}>Record Payment</h3>
            <button onClick={() => setPayModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            {payModal.type === 'given' ? `${payModal.person} is paying you back` : `You are paying back ${payModal.person}`} • Remaining: <span style={{ color: 'var(--accent-warning)', fontWeight: '700' }}>${remaining.toLocaleString()}</span>
          </p>

          <div className="input-group">
            <label className="input-label">Amount to Pay Now</label>
            <div
              onClick={() => setShowPayCalculator(true)}
              className="input-field"
              style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center', cursor: 'pointer', color: payModal.type === 'given' ? 'var(--accent-success)' : 'var(--accent-danger)' }}
            >
              {payAmount || '0.00'}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Account</label>
            <button
              type="button" className="input-field"
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setSelectorOpen('pay')}
            >
              <span>{accounts.find(a => a.id === payAccountId)?.name || 'Select Account'}</span>
              <ChevronRight size={18} color="var(--text-secondary)" />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              className="btn"
              style={{ flex: 1, padding: '14px', background: 'var(--bg-surface)' }}
              onClick={() => { setPayAmount(remaining.toString()); }}
            >
              Pay Full (${remaining.toLocaleString()})
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '14px', background: payModal.type === 'given' ? 'var(--accent-success)' : 'var(--accent-danger)' }}
              onClick={handleRecordPayment}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/')} className="btn" style={{ padding: '8px' }}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="title" style={{ fontSize: '20px', marginBottom: 0 }}>Loans & Debts</h1>
        <button onClick={openAdd} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={20} />
        </button>
      </div>

      {/* Active Loans */}
      <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Active</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {activeLoans.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No active loans 🎉
          </div>
        ) : (
          activeLoans.map(loan => {
            const remaining = getRemainingAmount(loan);
            const paidSoFar = loan.amount - remaining;
            const pctPaid = loan.amount > 0 ? (paidSoFar / loan.amount) * 100 : 0;
            const isExpanded = expandedLoan === loan.id;

            return (
              <div key={loan.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: loan.type === 'given' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: loan.type === 'given' ? 'var(--accent-success)' : 'var(--accent-danger)'
                      }}>
                        {loan.type === 'given' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: '700', fontSize: '15px' }}>{loan.person}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {loan.type === 'given' ? 'You Lent' : 'You Borrowed'} • {accounts.find(a => a.id === loan.accountId)?.name || ''}
                        </p>
                        {loan.note ? <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{loan.note}</p> : null}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '800', fontSize: '16px' }}>${loan.amount.toLocaleString()}</p>
                      {loan.status === 'partial' && (
                        <p style={{ fontSize: '11px', color: 'var(--accent-warning)', fontWeight: '700' }}>
                          ${remaining.toLocaleString()} left
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for partial */}
                  {loan.status === 'partial' && (
                    <div style={{ marginTop: '12px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctPaid}%`, background: 'var(--accent-success)', borderRadius: '2px', transition: 'width 0.4s' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button
                      onClick={() => openPayModal(loan)}
                      className="btn"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: '700', background: loan.type === 'given' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: loan.type === 'given' ? 'var(--accent-success)' : 'var(--accent-danger)' }}
                    >
                      {loan.type === 'given' ? '+ Receive Payment' : '- Pay Back'}
                    </button>
                    <button
                      onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                      className="btn"
                      style={{ padding: '8px 10px', background: 'transparent', fontSize: '11px', color: 'var(--text-secondary)' }}
                    >
                      <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>
                    <button onClick={() => openEdit(loan)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => { if (window.confirm('Delete this loan record? The balance will be reversed.')) deleteLoan(loan.id); }} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', padding: '8px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Payment history */}
                {isExpanded && (loan.payments || []).length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', background: 'rgba(0,0,0,0.2)' }}>
                    <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Payment History</p>
                    {loan.payments.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < loan.payments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(p.date).toLocaleDateString()}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-success)' }}>${p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && (loan.payments || []).length === 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', background: 'rgba(0,0,0,0.2)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No payments recorded yet.</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paid History */}
      {paidLoans.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Fully Settled</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paidLoans.map(loan => (
              <div key={loan.id} className="glass-panel" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.65 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle size={18} color="var(--accent-success)" />
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{loan.person}</span>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{loan.type === 'given' ? 'Returned to you' : 'You paid back'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '800', fontSize: '14px' }}>${loan.amount.toLocaleString()}</p>
                  <button onClick={() => { if (window.confirm('Delete history?')) deleteLoan(loan.id); }} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', marginTop: '4px' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {modal && <FormModal />}
      {payModal && <PayModal />}

      {showCalculator && (
        <NumericInputer value={amount} onChange={setAmount} onDone={() => setShowCalculator(false)} />
      )}
      {showPayCalculator && (
        <NumericInputer value={payAmount} onChange={setPayAmount} onDone={() => setShowPayCalculator(false)} />
      )}
      {selectorOpen && (
        <AccountSelector
          accounts={accounts}
          selectedId={selectorOpen === 'pay' ? payAccountId : accountId}
          onSelect={(id) => selectorOpen === 'pay' ? setPayAccountId(id) : setAccountId(id)}
          onClose={() => setSelectorOpen(null)}
          label={selectorOpen === 'pay' ? 'Payment Account' : 'Loan Account'}
        />
      )}
    </div>
  );
}
