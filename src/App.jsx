import React, { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Wallet, PieChart, Activity, ShieldCheck } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Wallets from './pages/Wallets';
import NewTransaction from './pages/NewTransaction';
import Insights from './pages/Insights';
import CategoryManager from './pages/CategoryManager';
import Loans from './pages/Loans';
import RecurringManager from './pages/RecurringManager';
import HealthScore from './pages/HealthScore';
import SavingsSimulator from './pages/SavingsSimulator';
import useStore from './store/useStore';
import { Cloud, CloudOff, CloudUpload, AlertCircle, RefreshCw, X } from 'lucide-react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Main tab routes — these replace history so they never stack
const MAIN_TABS = ['/', '/wallets', '/loans', '/insights'];
// Sub-pages — pressing back on these goes to home
const SUB_PAGES = ['/new', '/settings/categories'];

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
      {/* All tab links use 'replace' so they never push to browser history stack */}
      <NavItem to="/" replace icon={<Home size={24} />} active={location.pathname === '/'} label="Home" />
      <NavItem to="/wallets" replace icon={<Wallet size={24} />} active={location.pathname === '/wallets'} label="Wallets" />
      
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
      
      <NavItem to="/loans" replace icon={<Activity size={24} />} active={location.pathname === '/loans'} label="Loans" />
      <NavItem to="/insights" replace icon={<PieChart size={24} />} active={location.pathname === '/insights'} label="Stats" />
    </div>
  );
};

const NavItem = ({ to, replace, icon, active, label }) => (
  <Link to={to} replace={replace} style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.2s ease',
  }}>
    {icon}
    <span>{label}</span>
  </Link>
);

// Separate component so it has access to useLocation and useNavigate inside the Router
function AppInner({ showExitConfirm, setShowExitConfirm, handleExit }) {
  const location = useLocation();
  const navigate = useNavigate();
  const exitTimeout = useRef(null);

  const processRecurring = useStore(state => state.processRecurring);
  const resetDateView = useStore(state => state.resetDateView);
  const { user, setUser, syncToCloud, lastSynced, pullFromCloud } = useStore();
  
  const [showSplash, setShowSplash] = React.useState(true);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncing, setSyncing] = React.useState(false);
  const [showSyncPrompt, setShowSyncPrompt] = React.useState(false);
  
  // Auth Modal State
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [authError, setAuthError] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 1. Listen for Auth Changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // If user just logged in and we have no local data, suggest a pull
      if (firebaseUser && useStore.getState().accounts.length === 0) {
        setShowSyncPrompt(true);
      }
    });

    // 2. Listen for Network Changes
    const handleOnline = () => {
      setIsOnline(true);
      if (useStore.getState().user) setShowSyncPrompt(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    processRecurring();
    resetDateView();
    
    // Ensure Service Fees category exists
    const categories = useStore.getState().categories;
    if (!categories.find(c => c.id === 'cat_service_fees' || c.name === 'Service Fees')) {
      const newCat = { id: 'cat_service_fees', name: 'Service Fees', type: 'expense', color: '#64748b', icon: 'zap' };
      useStore.setState({ categories: [...categories, newCat] });
    }

    let listener;
    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        listener = await CapApp.addListener('backButton', () => {
          const path = location.pathname;
          
          if (MAIN_TABS.includes(path)) {
            // On a main tab → show exit confirmation
            setShowExitConfirm(true);
            if (exitTimeout.current) clearTimeout(exitTimeout.current);
            exitTimeout.current = setTimeout(() => setShowExitConfirm(false), 3000);
          } else {
            // On a sub-page → go home (replace so it doesn't stack)
            navigate('/', { replace: true });
          }
        });
      } catch (e) {
        // Not running in Capacitor — skip
      }
    };
    setupBackButton();
    return () => {
      unsubscribeAuth();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (listener) listener.remove();
      if (exitTimeout.current) clearTimeout(exitTimeout.current);
    };
  }, [location.pathname, navigate, setShowExitConfirm, processRecurring, resetDateView, setUser]);

  const handleSync = async () => {
    setSyncing(true);
    const success = await syncToCloud();
    setSyncing(false);
    if (success) setShowSyncPrompt(false);
  };

  const handleRestore = async () => {
    if (window.confirm("Restore data from cloud? This will overwrite your current local data.")) {
      setSyncing(true);
      const success = await pullFromCloud();
      setSyncing(false);
      if (success) {
        alert("Data restored successfully!");
        setShowSyncPrompt(false);
      }
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLoginModal(false);
    } catch (e) {
      console.error("Auth failed", e);
      setAuthError(e.message.replace('Firebase: ', ''));
    }
  };

  const handleLogout = () => {
    if(window.confirm("Sign out of Cloud Sync?")) {
      signOut(auth);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: '40px' }}>
      {/* Cloud Status Header Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '40px',
        background: 'rgba(10, 10, 15, 0.4)', backdropFilter: 'blur(10px)',
        zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', fontSize: '10px', color: 'rgba(255,255,255,0.4)',
        fontWeight: '600', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user ? (
            <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-success)', cursor: 'pointer' }}>
              <Cloud size={12} />
              <span>CLOUD ACTIVE</span>
            </div>
          ) : (
            <div onClick={() => setShowLoginModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <CloudOff size={12} />
              <span>GUEST MODE (TAP TO LOGIN)</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastSynced ? `LAST SYNC: ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'NOT SYNCED'}
          {user && (
            <button 
              onClick={handleSync} 
              disabled={syncing}
              style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '9px', fontWeight: '800' }}
            >
              {syncing ? '...' : 'SYNC'}
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{isSignUp ? 'Create Cloud Account' : 'Cloud Login'}</h2>
              <X size={24} onClick={() => setShowLoginModal(false)} style={{ color: 'var(--text-secondary)' }} />
            </div>
            
            <form onSubmit={handleAuthSubmit}>
              <input 
                type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', marginBottom: '12px' }}
              />
              <input 
                type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', marginBottom: '8px' }}
              />
              {authError && <p style={{ color: 'var(--accent-danger)', fontSize: '11px', marginBottom: '12px' }}>{authError}</p>}
              
              <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '800', marginTop: '8px' }}>
                {isSignUp ? 'Sign Up' : 'Login'}
              </button>
            </form>
            
            <p onClick={() => setIsSignUp(!isSignUp)} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', cursor: 'pointer' }}>
              {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </p>
          </div>
        </div>
      )}

      {/* Sync / Restore Prompt Banners */}
      {showSyncPrompt && isOnline && user && (
        useStore.getState().accounts.length === 0 && useStore.getState().transactions.length === 0 ? (
          /* Restore Prompt (when device is empty) */
          <div style={{
            position: 'fixed', top: '50px', left: '20px', right: '20px',
            background: 'var(--accent-success)', color: 'white', borderRadius: '16px',
            padding: '16px', zIndex: 1100, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CloudUpload size={24} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: '800' }}>Cloud Restore Available</p>
                <p style={{ fontSize: '11px', opacity: 0.9 }}>Local device is empty. Restore your cloud records?</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowSyncPrompt(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', padding: '8px' }}>Dismiss</button>
              <button 
                onClick={handleRestore} 
                disabled={syncing}
                style={{ background: 'white', color: 'var(--accent-success)', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: '800' }}
              >
                {syncing ? 'Restoring...' : 'Restore Data'}
              </button>
            </div>
          </div>
        ) : (
          /* Sync Prompt (when device has non-empty local data) */
          <div style={{
            position: 'fixed', top: '50px', left: '20px', right: '20px',
            background: 'var(--accent-primary)', color: 'white', borderRadius: '16px',
            padding: '16px', zIndex: 1100, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={24} className={syncing ? 'spin' : ''} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: '800' }}>Cloud Sync Available</p>
                <p style={{ fontSize: '11px', opacity: 0.8 }}>Backup your latest local data to Cloud.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowSyncPrompt(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', padding: '8px' }}>Dismiss</button>
              <button 
                onClick={handleSync} 
                disabled={syncing}
                style={{ background: 'white', color: 'var(--accent-primary)', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: '800' }}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
        )
      )}

      {showSplash && (
        <div style={{
          position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeOut 0.5s ease 2s forwards'
        }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', marginBottom: '24px', animation: 'scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <img src="/logo.png?v=1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Money Map" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px', color: 'white', opacity: 0, animation: 'fadeInUp 0.6s ease 0.4s forwards' }}>MONEY MAP</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', opacity: 0, animation: 'fadeInUp 0.6s ease 0.6s forwards' }}>PREMIUM FINANCE MANAGER</p>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/new" element={<NewTransaction />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings/categories" element={<CategoryManager />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/recurring" element={<RecurringManager />} />
        <Route path="/health" element={<HealthScore />} />
        <Route path="/savings-simulator" element={<SavingsSimulator />} />
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
      <style>{`
        @keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform: translateY(-20px); } to { opacity:1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity:1; } to { opacity:0; visibility:hidden; } }
        @keyframes scaleIn { from { opacity:0; transform: scale(0.5); } to { opacity:1; transform: scale(1); } }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function App() {
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);

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
      <AppInner
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        handleExit={handleExit}
      />
    </Router>
  );
}

export default App;
