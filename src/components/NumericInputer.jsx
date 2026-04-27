import React, { useState } from 'react';
import { Delete, X, Check, Plus, Minus, X as Multiply, Divide } from 'lucide-react';

export default function NumericInputer({ value, onChange, onDone }) {
  const [expression, setExpression] = useState(value || '');

  const keys = [
    '1', '2', '3', '÷',
    '4', '5', '6', '×',
    '7', '8', '9', '-',
    '0', '.', 'C', '+'
  ];

  const handleKeyPress = (key) => {
    if (key === 'C') {
      setExpression('');
      onChange('0');
    } else if (key === '÷') {
      setExpression(prev => prev + '/');
    } else if (key === '×') {
      setExpression(prev => prev + '*');
    } else {
      setExpression(prev => prev + key);
    }
  };

  const calculate = () => {
    try {
      // Evaluate expression safely
      // Note: In a production app, use a proper math library parser
      const result = eval(expression);
      const finalValue = result.toString();
      setExpression(finalValue);
      onChange(finalValue);
    } catch (e) {
      // If incomplete or invalid, just show current expression
    }
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  return (
    <div style={{
      background: 'var(--bg-surface-elevated)',
      padding: '20px',
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2000,
      boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-primary)' }}>
          {expression || '0'}
        </h3>
        <button onClick={handleBackspace} className="btn" style={{ padding: '8px', background: 'transparent' }}>
          <Delete size={20} />
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '12px' 
      }}>
        {keys.map(key => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            style={{
              padding: '16px 0',
              borderRadius: '12px',
              border: 'none',
              background: isNaN(key) && key !== '.' && key !== 'C' ? 'var(--bg-surface)' : 'rgba(255,255,255,0.05)',
              color: isNaN(key) && key !== '.' && key !== 'C' ? 'var(--accent-primary)' : 'white',
              fontSize: '20px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {key}
          </button>
        ))}
        
        <button
          onClick={calculate}
          style={{
            gridColumn: 'span 2',
            padding: '16px 0',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--bg-surface)',
            color: 'var(--accent-success)',
            fontSize: '18px',
            fontWeight: '700'
          }}
        >
          =
        </button>
        
        <button
          onClick={() => { calculate(); onDone(); }}
          style={{
            gridColumn: 'span 2',
            padding: '16px 0',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent-primary)',
            color: 'white',
            fontSize: '18px',
            fontWeight: '700'
          }}
        >
          Done
        </button>
      </div>
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
