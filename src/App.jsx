import React, { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Wallet, PieChart, Activity, ShieldCheck, Cloud, CloudOff, CloudUpload, AlertCircle, RefreshCw, X, Key, Lock, LogOut, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Wallets from './pages/Wallets';
import NewTransaction from './pages/NewTransaction';
import Insights from './pages/Insights';
import CategoryManager from './pages/CategoryManager';
import Loans from './pages/Loans';
import RecurringManager from './pages/RecurringManager';
import HealthScore from './pages/HealthScore';
import SavingsSimulator from './pages/SavingsSimulator';
import useStore, { waitForHydration } from './store/useStore';
import { auth, changeUserPassword, sendResetPasswordEmail } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Main tab routes — these replace history so they never stack
const MAIN_TABS = ['/', '/wallets', '/loans', '/insights'];

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

function AppInner({ showExitConfirm, setShowExitConfirm, handleExit }) {
  const location = useLocation();
  const navigate = useNavigate();
  const exitTimeout = useRef(null);

  const processRecurring = useStore(state => state.processRecurring);
  const resetDateView = useStore(state => state.resetDateView);
  const { user, setUser, syncToCloud, lastSynced, pullFromCloud, checkCloudDataExists, accounts, transactions } = useStore();

  // SYNC button only visible when there are real local records
  const hasLocalRecords = (accounts.length > 0 || transactions.length > 0);

  const [showSplash, setShowSplash] = React.useState(true);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncing, setSyncing] = React.useState(false);
  const [mandatoryRestore, setMandatoryRestore] = React.useState(false);

  // Auth & Password Modal State
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const [authSuccess, setAuthSuccess] = React.useState('');

  // Password Change State
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [pwdMsg, setPwdMsg] = React.useState({ type: '', text: '' });
  const [changingPwd, setChangingPwd] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Check if mandatory data recovery is needed.
  // ALWAYS waits for localforage hydration to complete first — this prevents
  // false positives on page refresh where IndexedDB hasn't loaded yet.
  // Returns true if mandatory restore was triggered, false otherwise.
  const verifyDataIntegrity = async (firebaseUser) => {
    if (!firebaseUser) return false;

    // Wait until Zustand has finished loading persisted data from IndexedDB.
    // waitForHydration() resolves as soon as onRehydrateStorage fires.
    await waitForHydration();

    const store = useStore.getState();
    const localIsEmpty = store.accounts.length === 0 && store.transactions.length === 0;

    if (localIsEmpty) {
      const cloudHasData = await checkCloudDataExists();
      if (cloudHasData) {
        console.warn("MANDATORY RESTORE: Local storage is truly empty (0 records), Cloud has data.");
        setMandatoryRestore(true);
        return true;
      }
    }
    return false;
  };

  // Auto-sync: called on page load after auth resolves, and on network reconnect.
  // Only syncs if local records exist. If local is empty, checks for mandatory restore instead.
  const doAutoSync = async (firebaseUser) => {
    await waitForHydration();
    const state = useStore.getState();
    const currentUser = firebaseUser || state.user;
    if (!currentUser) return;

    if (state.accounts.length === 0 && state.transactions.length === 0) {
      await verifyDataIntegrity(currentUser);
    } else if (navigator.onLine) {
      console.log("Auto-syncing to Cloud...");
      setSyncing(true);
      await state.syncToCloud(false, true); // silent
      setSyncing(false);
    }
  };

  useEffect(() => {
    // 1. Auth listener — on every page load/refresh this fires once with the cached user.
    //    After hydration wait completes, we check integrity then do initial auto-sync.
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const isMandatory = await verifyDataIntegrity(firebaseUser);
        if (!isMandatory) {
          // Local data exists — do an initial silent sync on every page load
          await doAutoSync(firebaseUser);
        }
      }
    });

    // 2. Web: window online event — fires when browser goes from offline → online
    const handleOnline = async () => {
      setIsOnline(true);
      await doAutoSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Mobile APK: @capacitor/network for reliable Android network detection
    //    This fires on every network state change (WiFi, mobile data connect/disconnect)
    let capNetworkListener = null;
    const setupCapacitorNetwork = async () => {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOnline(status.connected);

        capNetworkListener = await Network.addListener('networkStatusChange', async (netStatus) => {
          setIsOnline(netStatus.connected);
          if (netStatus.connected) {
            console.log("Capacitor: Network connected. Auto-syncing...");
            await doAutoSync();
          }
        });
      } catch (e) {
        // Running in web browser — window events above handle it
      }
    };
    setupCapacitorNetwork();

    processRecurring();
    resetDateView();

    // Ensure Service Fees category exists
    const categoriesList = useStore.getState().categories;
    if (!categoriesList.find(c => c.id === 'cat_service_fees' || c.name === 'Service Fees')) {
      const newCat = { id: 'cat_service_fees', name: 'Service Fees', type: 'expense', color: '#64748b', icon: 'zap' };
      useStore.setState({ categories: [...categoriesList, newCat] });
    }

    let listener;
    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        listener = await CapApp.addListener('backButton', () => {
          const path = location.pathname;
          if (MAIN_TABS.includes(path)) {
            setShowExitConfirm(true);
            if (exitTimeout.current) clearTimeout(exitTimeout.current);
            exitTimeout.current = setTimeout(() => setShowExitConfirm(false), 3000);
          } else {
            navigate('/', { replace: true });
          }
        });
      } catch (e) {}
    };
    setupBackButton();

    return () => {
      unsubscribeAuth();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (capNetworkListener) capNetworkListener.remove();
      if (listener) listener.remove();
      if (exitTimeout.current) clearTimeout(exitTimeout.current);
    };
  }, [location.pathname, navigate, setShowExitConfirm, processRecurring, resetDateView, setUser]);

  const handleSync = async () => {
    if (!hasLocalRecords) {
      alert("Cannot Sync: Your device has 0 records. Please tap 'Restore' to load your data from Cloud.");
      return;
    }
    setSyncing(true);
    const res = await syncToCloud(false, false);
    setSyncing(false);
    if (res.success) {
      alert("✅ Data Synced to Cloud successfully!");
    } else if (res.error) {
      alert("⚠️ Sync Failed: " + res.error);
    }
  };

  const handleRestore = async () => {
    if (window.confirm("Restore data from Cloud? This will download your latest cloud backup to this device.")) {
      setSyncing(true);
      const res = await pullFromCloud();
      setSyncing(false);
      if (res.success) {
        alert("🎉 Data Restored Successfully!");
        setMandatoryRestore(false);
      } else {
        alert("⚠️ Restore Failed: " + (res.error || "No data found in Cloud"));
      }
    }
  };

  const handleMandatoryRestoreAction = async () => {
    setSyncing(true);
    const res = await pullFromCloud();
    setSyncing(false);
    if (res.success) {
      alert("🎉 Your records have been fully restored!");
      setMandatoryRestore(false);
    } else {
      alert("⚠️ Recovery failed: " + (res.error || "Could not retrieve records from Cloud"));
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthSuccess("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLoginModal(false);
    } catch (e) {
      console.error("Auth failed", e);
      setAuthError(e.message.replace('Firebase: ', ''));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (!newPassword || newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setChangingPwd(true);
    const res = await changeUserPassword(newPassword);
    setChangingPwd(false);
    if (res.success) {
      setPwdMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwdMsg({ type: 'error', text: res.error || 'Failed to update password. Try logging in again.' });
    }
  };

  const handleSendResetEmail = async () => {
    if (!user || !user.email) return;
    setPwdMsg({ type: '', text: '' });
    const res = await sendResetPasswordEmail(user.email);
    if (res.success) {
      setPwdMsg({ type: 'success', text: `Password reset email sent to ${user.email}` });
    } else {
      setPwdMsg({ type: 'error', text: res.error || 'Failed to send reset email.' });
    }
  };

  const handleLogout = () => {
    if (window.confirm("Sign out of Cloud Sync?")) {
      signOut(auth);
      setShowLoginModal(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: '40px' }}>
      {/* Cloud Status Header Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '40px',
        background: 'rgba(10, 10, 15, 0.6)', backdropFilter: 'blur(10px)',
        zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', fontSize: '10px', color: 'rgba(255,255,255,0.6)',
        fontWeight: '600', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {user ? (
            <div onClick={() => setShowLoginModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-success)', cursor: 'pointer' }}>
              <Cloud size={13} />
              <span>CLOUD ACTIVE</span>
            </div>
          ) : (
            <div onClick={() => setShowLoginModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <CloudOff size={13} />
              <span>GUEST MODE (LOGIN)</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>
            {lastSynced ? `LAST SYNC: ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'NOT SYNCED'}
          </span>
          {user && hasLocalRecords && (
            <button 
              onClick={handleSync} 
              disabled={syncing}
              title="Upload local records to Cloud"
              style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '9px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
            >
              <RefreshCw size={10} className={syncing ? 'spin' : ''} />
              <span>SYNC</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth & Password Modal */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '380px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--accent-primary)" />
                {user ? 'Cloud Account Settings' : (isSignUp ? 'Create Cloud Account' : 'Cloud Login')}
              </h2>
              <X size={22} onClick={() => setShowLoginModal(false)} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
            </div>

            {user ? (
              /* Account Actions & Change Password */
              <div>
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: '700' }}>CONNECTED ACCOUNT</p>
                  <p style={{ fontSize: '14px', fontWeight: '800', marginTop: '2px', wordBreak: 'break-all' }}>{user.email}</p>
                </div>

                {/* Cloud Sync & Restore Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: hasLocalRecords ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '20px' }}>
                  {hasLocalRecords && (
                    <button onClick={handleSync} disabled={syncing} className="btn" style={{ background: 'var(--accent-primary)', color: 'white', padding: '12px', fontSize: '13px', fontWeight: '800' }}>
                      <RefreshCw size={16} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  )}
                  <button onClick={handleRestore} disabled={syncing} className="btn" style={{ background: 'var(--accent-success)', color: 'white', padding: '12px', fontSize: '13px', fontWeight: '800' }}>
                    <CloudUpload size={16} /> Restore Data
                  </button>
                </div>

                {/* Change Password Section */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={14} color="var(--accent-primary)" /> Change Password
                  </h4>
                  <form onSubmit={handleChangePassword}>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="New Password (min 6 chars)" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        required 
                        minLength={6}
                        style={{ width: '100%', padding: '10px 36px 10px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="Confirm New Password" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        required 
                        minLength={6}
                        style={{ width: '100%', padding: '10px 36px 10px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {pwdMsg.text && (
                      <p style={{ color: pwdMsg.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)', fontSize: '11px', marginBottom: '10px', fontWeight: '600' }}>
                        {pwdMsg.text}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" disabled={changingPwd} className="btn" style={{ flex: 1, background: 'var(--accent-primary)', color: 'white', padding: '10px', fontSize: '12px', fontWeight: '800' }}>
                        {changingPwd ? 'Updating...' : 'Update Password'}
                      </button>
                      <button type="button" onClick={handleSendResetEmail} className="btn" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '10px', fontSize: '11px' }}>
                        Reset Email
                      </button>
                    </div>
                  </form>
                </div>

                <button onClick={handleLogout} className="btn" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-danger)', padding: '12px', fontWeight: '800', fontSize: '13px' }}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            ) : (
              /* Login / Signup Form with Show/Hide Password Toggle */
              <form onSubmit={handleAuthSubmit}>
                <input 
                  type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', marginBottom: '12px' }}
                />
                
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    style={{ width: '100%', padding: '12px 40px 12px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {authError && <p style={{ color: 'var(--accent-danger)', fontSize: '11px', marginBottom: '12px' }}>{authError}</p>}
                
                <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '800', marginTop: '8px' }}>
                  {isSignUp ? 'Create Cloud Account' : 'Login'}
                </button>

                <p onClick={() => setIsSignUp(!isSignUp)} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', cursor: 'pointer' }}>
                  {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Data Loss Recovery Lockscreen (PURE MANDATORY RESTORE, NO BYPASS) */}
      {mandatoryRestore && user && (
        <div style={{
          position: 'fixed', inset: 0, background: '#0a0a0f',
          zIndex: 20000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-danger)', marginBottom: '20px'
          }}>
            <ShieldAlert size={42} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'white', marginBottom: '10px' }}>
            Data Recovery Required
          </h2>

          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', maxWidth: '340px', lineHeight: '1.5', marginBottom: '20px' }}>
            Your device storage was reset (0 records found), but your financial history is safely stored in your Cloud Account (<strong>{user.email}</strong>).
          </p>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '16px', width: '100%', maxWidth: '340px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent-success)', fontWeight: '800' }}>
              🔒 Mandatory Protection
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              You must restore your records to access Money Map. This prevents losing your 2+ months of financial records.
            </p>
          </div>

          <button 
            onClick={handleMandatoryRestoreAction}
            disabled={syncing}
            style={{
              width: '100%', maxWidth: '340px', padding: '16px',
              background: 'var(--accent-success)', color: 'white', border: 'none',
              borderRadius: '14px', fontSize: '15px', fontWeight: '900',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)', cursor: 'pointer'
            }}
          >
            <CloudUpload size={22} />
            {syncing ? 'Restoring Data...' : 'RESTORE MY CLOUD DATA NOW'}
          </button>
        </div>
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
