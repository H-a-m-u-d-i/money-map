import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, Plus, Trash2, Edit2, Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home, Heart, MoreHorizontal, Check, X, Download, Upload, RefreshCw, CloudUpload, ChevronDown, ChevronUp } from 'lucide-react';

const ICONS = [
  { id: 'pizza', icon: Pizza },
  { id: 'zap', icon: Zap },
  { id: 'car', icon: Car },
  { id: 'briefcase', icon: Briefcase },
  { id: 'shopping', icon: ShoppingBag },
  { id: 'coffee', icon: Coffee },
  { id: 'home', icon: Home },
  { id: 'heart', icon: Heart },
  { id: 'more', icon: MoreHorizontal }
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#71717a', '#f43f5e', '#06b6d4', '#fbbf24'];

export default function CategoryManager() {
  const navigate = useNavigate();
  const categories = useStore(state => state.categories);
  const addCategory = useStore(state => state.addCategory);
  const updateCategory = useStore(state => state.updateCategory);
  const deleteCategory = useStore(state => state.deleteCategory);
  const resetCategories = useStore(state => state.resetCategories);

  const exportData = useStore(state => state.exportData);
  const importData = useStore(state => state.importData);
  const [showManualImport, setShowManualImport] = useState(false);
  const [manualJSON, setManualJSON] = useState('');

  const [showExpenseList, setShowExpenseList] = useState(true);
  const [showIncomeList, setShowIncomeList] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [selectedIcon, setSelectedIcon] = useState('more');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const resetForm = () => {
    setName('');
    setType('expense');
    setSelectedIcon('more');
    setSelectedColor(COLORS[0]);
    setShowAdd(false);
    setEditId(null);
  };

  const handleEdit = (cat) => {
    setEditId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!name) return;
    const categoryData = { name, type, icon: selectedIcon, color: selectedColor };
    
    if (editId) {
      updateCategory(editId, categoryData);
    } else {
      addCategory(categoryData);
    }
    
    resetForm();
  };

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} className="btn" style={{ padding: '8px' }}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="title" style={{ fontSize: '20px', marginBottom: 0 }}>Categories</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => showAdd ? resetForm() : setShowAdd(true)} className="btn btn-primary" style={{ padding: '8px' }}>
            {showAdd ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', animation: 'slideIn 0.3s ease' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>{editId ? 'Edit Category' : 'New Category'}</h3>
          
          <div className="input-group">
            <label className="input-label">Category Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Subscriptions" 
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['expense', 'income'].map(t => (
                <button 
                  key={t}
                  className="btn" 
                  style={{ flex: 1, background: type === t ? 'var(--accent-primary)' : 'var(--bg-surface)', color: type === t ? 'white' : 'var(--text-primary)', textTransform: 'capitalize' }}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Icon</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {ICONS.map(({ id, icon: Icon }) => (
                <button 
                  key={id}
                  onClick={() => setSelectedIcon(id)}
                  style={{
                    padding: '12px', borderRadius: '12px',
                    background: selectedIcon === id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    border: 'none', color: selectedIcon === id ? 'white' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button 
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: c, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {selectedColor === c && <Check size={16} color="white" />}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '16px' }} onClick={handleSubmit}>
            {editId ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      )}

      {/* Collapsible Expense Categories Accordion */}
      {(() => {
        const expenseCats = categories.filter(c => c.type === 'expense');
        const incomeCats = categories.filter(c => c.type === 'income');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Expense Categories Header */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <button
                onClick={() => setShowExpenseList(!showExpenseList)}
                style={{
                  width: '100%', padding: '16px', background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: 'var(--text-primary)', cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800' }}>Expense Categories</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-danger)', fontWeight: '700' }}>
                    {expenseCats.length}
                  </span>
                </div>
                {showExpenseList ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
              </button>

              {showExpenseList && (
                <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {expenseCats.map(cat => {
                    const IconComp = ICONS.find(i => i.id === cat.icon)?.icon || MoreHorizontal;
                    return (
                      <div key={cat.id} style={{
                        padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-glass-subtle)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderLeft: `4px solid ${cat.color}`, border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ 
                            width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color
                          }}>
                            <IconComp size={20} />
                          </div>
                          <div>
                            <h4 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{cat.name}</h4>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleEdit(cat)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => { if(window.confirm('Delete this category?')) deleteCategory(cat.id) }} style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.8)', padding: '6px', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Income Categories Header */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <button
                onClick={() => setShowIncomeList(!showIncomeList)}
                style={{
                  width: '100%', padding: '16px', background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: 'var(--text-primary)', cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800' }}>Income Categories</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', fontWeight: '700' }}>
                    {incomeCats.length}
                  </span>
                </div>
                {showIncomeList ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
              </button>

              {showIncomeList && (
                <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {incomeCats.map(cat => {
                    const IconComp = ICONS.find(i => i.id === cat.icon)?.icon || MoreHorizontal;
                    return (
                      <div key={cat.id} style={{
                        padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-glass-subtle)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderLeft: `4px solid ${cat.color}`, border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ 
                            width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color
                          }}>
                            <IconComp size={20} />
                          </div>
                          <div>
                            <h4 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{cat.name}</h4>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleEdit(cat)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => { if(window.confirm('Delete this category?')) deleteCategory(cat.id) }} style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.8)', padding: '6px', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Data Management</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Export your data to a file for backup, restore from Cloud, or sync to another device.</p>
        
        {/* Cloud Actions */}
        {useStore.getState().user && (
          <div style={{ display: 'grid', gridTemplateColumns: (useStore.getState().accounts.length > 0 || useStore.getState().transactions.length > 0) ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '12px' }}>
            {(useStore.getState().accounts.length > 0 || useStore.getState().transactions.length > 0) && (
              <button 
                onClick={async () => {
                  const res = await useStore.getState().syncToCloud();
                  if (res.success) alert("✅ Synced to Cloud!");
                  else alert("⚠️ Sync failed: " + res.error);
                }} 
                className="btn" 
                style={{ background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: '700' }}
              >
                <RefreshCw size={18} /> Sync Cloud
              </button>
            )}
            <button 
              onClick={async () => {
                if (window.confirm("Restore data from Cloud?")) {
                  const res = await useStore.getState().pullFromCloud();
                  if (res.success) { alert("🎉 Restored from Cloud!"); navigate('/'); }
                  else alert("⚠️ Restore failed: " + res.error);
                }
              }} 
              className="btn" 
              style={{ background: 'var(--accent-success)', color: 'white', fontSize: '13px', fontWeight: '700' }}
            >
              <CloudUpload size={18} /> Restore Cloud
            </button>
          </div>
        )}

        {/* Local File Export / Import */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button onClick={exportData} className="btn" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontSize: '13px' }}>
            <Download size={18} /> Export File
          </button>
          
          <div style={{ position: 'relative' }}>
            <button className="btn" style={{ width: '100%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', fontSize: '13px' }}>
              <Upload size={18} /> Import File
            </button>
            <input 
              type="file" 
              accept=".json"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (importData(event.target.result)) {
                      alert('Data imported successfully!');
                      navigate('/');
                    } else {
                      alert('Failed to import data. Invalid file.');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            />
          </div>
        </div>

        <button 
          onClick={() => setShowManualImport(!showManualImport)}
          style={{ 
            width: '100%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', 
            fontSize: '11px', marginTop: '16px', textDecoration: 'underline', cursor: 'pointer' 
          }}
        >
          Trouble with files? Use Manual Rescue
        </button>

        {showManualImport && (
          <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div className="flex-between" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-danger)' }}>Emergency Data Recovery</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Scan for hidden old data backups.</p>
                </div>
                <button 
                  onClick={async () => {
                    if (window.confirm("Attempt to recover lost data? This will scan for older database snapshots.")) {
                      const success = await useStore.getState().emergencyRecovery();
                      if (success) alert("Data found and restored!");
                      else alert("No alternative data found in storage.");
                    }
                  }}
                  className="btn" 
                  style={{ padding: '8px 16px', background: 'var(--accent-danger)', color: 'white', borderRadius: '8px', fontSize: '12px' }}
                >
                  Scan Storage
                </button>
              </div>
              <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-danger)', marginBottom: '8px' }}>⚠️ SILENT WALLET REPAIR</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Use this to fix incorrect balances without adding history logs. This will change the wallet totals silently.</p>
              
              {useStore.getState().accounts.map(acc => (
                <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px' }}>{acc.name}</span>
                  <input 
                    type="number" 
                    className="input-field" 
                    style={{ width: '100px', padding: '4px 8px', fontSize: '12px', height: '30px' }}
                    defaultValue={acc.balance}
                    onBlur={(e) => {
                      const newBal = parseFloat(e.target.value);
                      if (!isNaN(newBal)) {
                        useStore.getState().updateAccount(acc.id, { balance: newBal });
                      }
                    }}
                  />
                </div>
              ))}
              <p style={{ fontSize: '10px', color: 'var(--accent-success)', marginTop: '8px' }}>Changes are saved as soon as you click out of the box.</p>
            </div>

            <textarea 
              placeholder="Paste your backup JSON here..."
              className="input-field"
              style={{ width: '100%', height: '120px', fontSize: '11px', padding: '12px', fontFamily: 'monospace' }}
              value={manualJSON}
              onChange={(e) => setManualJSON(e.target.value)}
            />
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px', padding: '12px', fontSize: '13px' }}
              onClick={() => {
                if (importData(manualJSON)) {
                  alert('Rescue successful!');
                  navigate('/');
                } else {
                  alert('Invalid JSON data.');
                }
              }}
            >
              Confirm Rescue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
