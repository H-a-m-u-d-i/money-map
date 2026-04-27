import React, { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, PlusCircle, PieChart, Activity } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Wallets from './pages/Wallets';
import NewTransaction from './pages/NewTransaction';
import Insights from './pages/Insights';
import CategoryManager from './pages/CategoryManager';
import Loans from './pages/Loans';

const BottomNav = () => {
  const location = useLocation();
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '70px',
      background: 'rgba(30, 30, 36, 0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 1000
    }}>
      <NavItem to="/" icon={<Home size={24} />} active={location.pathname === '/'} label="Home" />
      <NavItem to="/wallets" icon={<Wallet size={24} />} active={location.pathname === '/wallets'} label="Wallets" />
      
      {/* Split Entry Buttons */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', transform: 'translateY(-10px)' }}>
        <Link to="/new?mode=expense" style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid var(--accent-danger)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-danger)',
          textDecoration: 'none',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          -
        </Link>
        <Link to="/new?mode=income" style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '2px solid var(--accent-success)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-success)',
          textDecoration: 'none',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          +
        </Link>
      </div>
      
      <NavItem to="/loans" icon={<Activity size={24} />} active={location.pathname === '/loans'} label="Loans" />
      <NavItem to="/insights" icon={<PieChart size={24} />} active={location.pathname === '/insights'} label="Stats" />
    </div>
  );
};

const NavItem = ({ to, icon, active, label, style }) => (
  <Link to={to} style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.2s ease',
    ...style
  }}>
    {icon}
    <span>{label}</span>
  </Link>
);

function App() {
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const exitTimeout = useRef(null);

  useEffect(() => {
    // Capacitor Android back button handler
    let listener;
    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            // We're at root — show exit confirmation
            setShowExitConfirm(true);
            if (exitTimeout.current) clearTimeout(exitTimeout.current);
            exitTimeout.current = setTimeout(() => setShowExitConfirm(false), 3000);
          } else {
            window.history.back();
          }
        });
      } catch (e) {
        // Not running in Capacitor, skip
      }
    };
    setupBackButton();
    return () => {
      if (listener) listener.remove();
      if (exitTimeout.current) clearTimeout(exitTimeout.current);
    };
  }, []);

  const handleExit = async () => {
    try {
      const { App: CapApp } = await import('@capacitor/app');
      await CapApp.exitApp();
    } catch (e) {
      window.close();
    }
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/new" element={<NewTransaction />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings/categories" element={<CategoryManager />} />
          <Route path="/loans" element={<Loans />} />
        </Routes>
        <BottomNav />

        {/* Exit Confirmation Toast */}
        {showExitConfirm && (
          <div style={{
            position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30,30,36,0.97)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '16px 24px', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.2s ease',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Exit Money Map?
            </span>
            <button
              onClick={() => setShowExitConfirm(false)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', padding: '8px 16px', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              Stay
            </button>
            <button
              onClick={handleExit}
              style={{ background: 'var(--accent-danger)', border: 'none', borderRadius: '10px', padding: '8px 16px', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              Exit
            </button>
          </div>
        )}
        <style>{`@keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
      </div>
    </Router>
  );
}

export default App;
