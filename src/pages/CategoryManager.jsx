import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { ChevronLeft, Plus, Trash2, Edit2, Pizza, Zap, Car, Briefcase, ShoppingBag, Coffee, Home, Heart, MoreHorizontal, Check, X, Download, Upload } from 'lucide-react';

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
                  style={{ flex: 1, background: type === t ? 'var(--accent-primary)' : 'var(--bg-surface)', textTransform: 'capitalize' }}
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
                    border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {categories.map(cat => {
          const IconComp = ICONS.find(i => i.id === cat.icon)?.icon || MoreHorizontal;
          return (
            <div key={cat.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${cat.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color
                }}>
                  <IconComp size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: '700' }}>{cat.name}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{cat.type}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleEdit(cat)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '8px' }}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => { if(window.confirm('Delete this category?')) deleteCategory(cat.id) }} style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.6)', padding: '8px' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Data Management</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Export your data to a file for backup or sync it to another device.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button onClick={exportData} className="btn" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontSize: '13px' }}>
            <Download size={18} /> Export
          </button>
          
          <div style={{ position: 'relative' }}>
            <button className="btn" style={{ width: '100%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', fontSize: '13px' }}>
              <Upload size={18} /> Import
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
      </div>
    </div>
  );
}
