import React from 'react';
import { X, Check } from 'lucide-react';

export default function AccountSelector({ accounts, selectedId, onSelect, onClose, label }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        width: '100%',
        background: 'var(--bg-surface)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '24px 20px 40px 20px',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800' }}>{label || 'Select Account'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accounts.map(acc => {
            const isSelected = acc.id === selectedId;
            return (
              <button 
                key={acc.id}
                onClick={() => { onSelect(acc.id); onClose(); }}
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'left',
                  width: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '44px', height: '44px', borderRadius: '12px', 
                    background: acc.color + '20', color: acc.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {/* Simplified icon logic for selector */}
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'currentColor' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '800', fontSize: '16px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{acc.name}</p>
                    <p style={{ fontSize: '13px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '600' }}>
                      ${acc.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    background: 'var(--accent-primary)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <Check size={14} color="white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
