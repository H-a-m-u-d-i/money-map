import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import { auth, db, cloudSync } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Configure localforage for offline persistence
localforage.config({
  name: 'MoneyMap',
  storeName: 'moneymap_store',
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE] // Ensure all drivers are checked
});

// Custom storage wrapper for Zustand to use localforage with fallback to localStorage
const localForageStore = {
  getItem: async (name) => {
    try {
      let value = await localforage.getItem(name);
      if (value !== null && value !== undefined) {
        return typeof value === 'string' ? value : JSON.stringify(value);
      }
      
      // Fallback: Check window.localStorage directly
      try {
        const lsValue = localStorage.getItem(name);
        if (lsValue !== null && lsValue !== undefined) {
          console.warn("Recovered store data from localStorage fallback:", name);
          const stringVal = typeof lsValue === 'string' ? lsValue : JSON.stringify(lsValue);
          await localforage.setItem(name, stringVal);
          return stringVal;
        }
      } catch (e) {}

      // Deep scan alternative keys in both localforage and localStorage
      const alternatives = ['money-map-storage', 'moneymap', 'money_map', 'moneyMapStore'];
      for (const alt of alternatives) {
        if (alt === name) continue;
        let altValue = await localforage.getItem(alt);
        if (altValue !== null && altValue !== undefined) {
          console.warn("DEEP SCAN: Found data in alternative localforage key:", alt);
          return typeof altValue === 'string' ? altValue : JSON.stringify(altValue);
        }
        try {
          const lsAlt = localStorage.getItem(alt);
          if (lsAlt !== null && lsAlt !== undefined) {
            console.warn("DEEP SCAN: Found data in alternative localStorage key:", alt);
            return typeof lsAlt === 'string' ? lsAlt : JSON.stringify(lsAlt);
          }
        } catch (e) {}
      }
      return null;
    } catch (e) {
      console.error("localForageStore.getItem error:", e);
      try {
        const lsVal = localStorage.getItem(name);
        if (lsVal !== null) return typeof lsVal === 'string' ? lsVal : JSON.stringify(lsVal);
      } catch (err) {}
      return null;
    }
  },
  setItem: async (name, value) => {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      await localforage.setItem(name, stringVal);
    } catch (e) {
      console.error("localforage setItem error:", e);
    }
    try {
      localStorage.setItem(name, stringVal);
    } catch (e) {
      console.error("localStorage setItem error:", e);
    }
  },
  removeItem: async (name) => {
    try {
      await localforage.removeItem(name);
    } catch (e) {}
    try {
      localStorage.removeItem(name);
    } catch (e) {}
  },
};


const MONEFY_CATEGORIES = [
  // Expenses
  { id: 'cat_clothes', name: 'Clothes', type: 'expense', color: '#f43f5e', icon: 'shopping' },
  { id: 'cat_eating_out', name: 'Eating out', type: 'expense', color: '#f59e0b', icon: 'pizza' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', color: '#8b5cf6', icon: 'more' },
  { id: 'cat_food', name: 'Food', type: 'expense', color: '#10b981', icon: 'pizza' },
  { id: 'cat_gifts', name: 'Gifts', type: 'expense', color: '#ec4899', icon: 'heart' },
  { id: 'cat_health', name: 'Health', type: 'expense', color: '#ef4444', icon: 'heart' },
  { id: 'cat_house', name: 'House', type: 'expense', color: '#3b82f6', icon: 'home' },
  { id: 'cat_hygiene', name: 'Hygiene', type: 'expense', color: '#06b6d4', icon: 'zap' },
  { id: 'cat_pets', name: 'Pets', type: 'expense', color: '#fbbf24', icon: 'heart' },
  { id: 'cat_phone', name: 'Phone', type: 'expense', color: '#6366f1', icon: 'zap' },
  { id: 'cat_sports', name: 'Sports', type: 'expense', color: '#f97316', icon: 'more' },
  { id: 'cat_taxi', name: 'Taxi', type: 'expense', color: '#fbbf24', icon: 'car' },
  { id: 'cat_toiletry', name: 'Toiletry', type: 'expense', color: '#06b6d4', icon: 'zap' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#3b82f6', icon: 'car' },
  { id: 'cat_service_fees', name: 'Service Fees', type: 'expense', color: '#64748b', icon: 'zap' },
  // Income
  { id: 'cat_deposits', name: 'Deposits', type: 'income', color: '#10b981', icon: 'briefcase' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#10b981', icon: 'briefcase' },
  { id: 'cat_savings', name: 'Savings', type: 'income', color: '#3b82f6', icon: 'briefcase' }
];

// Module-level hydration tracker — NOT persisted to localforage.
// Resolves once Zustand has finished loading data from IndexedDB.
let _hydrateResolve;
export const hydrationReady = new Promise(resolve => { _hydrateResolve = resolve; });
export const waitForHydration = () => hydrationReady;

const useStore = create(
  persist(
    (set, get) => ({
      accounts: [],
      categories: MONEFY_CATEGORIES,
      transactions: [],
      displayMode: 'month',
      currentDateView: new Date().toISOString(),
      customDateRange: { start: null, end: null },
      loans: [],
      recurring: [],
      paydayDay: null, // day of month (1-31) user gets paid
      hasData: false, // Safety flag to detect if the app was ever used
      user: null, // Firebase user object
      lastSynced: null,

      setPaydayDay: (day) => set({ paydayDay: day }),

      resetCategories: () => set({ categories: MONEFY_CATEGORIES }),

      setViewSettings: (settings) => set((state) => ({ ...state, ...settings })),
      resetDateView: () => set({ currentDateView: new Date().toISOString() }),

      // Actions
      addAccount: (account) => set((state) => {
        const newAccountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const initialBalance = account.balance || 0;
        
        // Always log opening balance as income for stats accuracy
        let newTransactions = state.transactions;
        if (initialBalance > 0) {
          const openingBalanceTxn = {
            id: `txn_${Date.now()}_init_${Math.random().toString(36).substr(2, 9)}`,
            type: 'income',
            amount: initialBalance,
            note: `Opening Balance: ${account.name}`,
            toAccountId: newAccountId,
            fromAccountId: null,
            categoryId: 'cat_deposits',
            date: new Date().toISOString()
          };
          newTransactions = [openingBalanceTxn, ...state.transactions];
        }

        return {
          accounts: [...state.accounts, { ...account, id: newAccountId, balance: initialBalance }],
          transactions: newTransactions
        };
      }),

      adjustBalance: (accountId, newBalance) => set((state) => {
        const account = state.accounts.find(a => a.id === accountId);
        if (!account) return state;

        const diff = newBalance - account.balance;
        if (diff === 0) return state;

        const adjustmentTxn = {
          id: `txn_${Date.now()}_adj_${Math.random().toString(36).substr(2, 9)}`,
          type: diff > 0 ? 'income' : 'expense',
          amount: Math.abs(diff),
          note: `Balance Adjustment: ${account.name}`,
          toAccountId: diff > 0 ? accountId : null,
          fromAccountId: diff < 0 ? accountId : null,
          categoryId: diff > 0 ? 'cat_deposits' : 'cat_service_fees',
          date: new Date().toISOString(),
          isAdjustment: true
        };

        return {
          accounts: state.accounts.map(a => a.id === accountId ? { ...a, balance: newBalance } : a),
          transactions: [adjustmentTxn, ...state.transactions]
        };
      }),

      updateAccount: (id, updates) => set((state) => ({
        accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc)
      })),

      addCategory: (category) => set((state) => ({
        categories: [...state.categories, { ...category, id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }]
      })),

      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat)
      })),

      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(cat => cat.id !== id)
      })),

      deleteAccount: (id) => set((state) => ({
        accounts: state.accounts.filter(acc => acc.id !== id),
        // Optionally handle orphaned transactions here, but for now we keep it simple
      })),

      deleteTransaction: (id) => set((state) => {
        const txnToDelete = state.transactions.find(t => t.id === id);
        if (!txnToDelete) return state;

        // Reverse the balance impact
        const updatedAccounts = state.accounts.map(acc => {
          if (txnToDelete.type === 'expense' && acc.id === txnToDelete.fromAccountId) {
            return { ...acc, balance: acc.balance + txnToDelete.amount };
          }
          if (txnToDelete.type === 'income' && acc.id === txnToDelete.toAccountId) {
            return { ...acc, balance: acc.balance - txnToDelete.amount };
          }
          if (txnToDelete.type === 'transfer' || txnToDelete.type === 'withdrawal') {
            if (acc.id === txnToDelete.fromAccountId) return { ...acc, balance: acc.balance + txnToDelete.amount };
            if (acc.id === txnToDelete.toAccountId) return { ...acc, balance: acc.balance - txnToDelete.amount };
          }
          return acc;
        });

        return {
          transactions: state.transactions.filter(t => t.id !== id),
          accounts: updatedAccounts
        };
      }),

      editTransaction: (id, updatedTxn) => set((state) => {
        const oldTxn = state.transactions.find(t => t.id === id);
        if (!oldTxn) return state;

        // 1. Reverse old transaction's balance impact
        let tempAccounts = state.accounts.map(acc => {
          if (oldTxn.type === 'expense' && acc.id === oldTxn.fromAccountId) return { ...acc, balance: acc.balance + oldTxn.amount };
          if (oldTxn.type === 'income' && acc.id === oldTxn.toAccountId) return { ...acc, balance: acc.balance - oldTxn.amount };
          if (oldTxn.type === 'transfer' || oldTxn.type === 'withdrawal') {
            if (acc.id === oldTxn.fromAccountId) return { ...acc, balance: acc.balance + oldTxn.amount };
            if (acc.id === oldTxn.toAccountId) return { ...acc, balance: acc.balance - oldTxn.amount };
          }
          return acc;
        });

        // 2. Apply new transaction's balance impact
        const finalAccounts = tempAccounts.map(acc => {
          if (updatedTxn.type === 'expense' && acc.id === updatedTxn.fromAccountId) return { ...acc, balance: acc.balance - updatedTxn.amount };
          if (updatedTxn.type === 'income' && acc.id === updatedTxn.toAccountId) return { ...acc, balance: acc.balance + updatedTxn.amount };
          if (updatedTxn.type === 'transfer' || updatedTxn.type === 'withdrawal') {
            if (acc.id === updatedTxn.fromAccountId) return { ...acc, balance: acc.balance - updatedTxn.amount };
            if (acc.id === updatedTxn.toAccountId) return { ...acc, balance: acc.balance + updatedTxn.amount };
          }
          return acc;
        });

        return {
          transactions: state.transactions.map(t => t.id === id ? { ...updatedTxn, id } : t),
          accounts: finalAccounts
        };
      }),
      
      addTransaction: (transaction) => set((state) => {
        const newTxn = { ...transaction, id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
        
        // Atomically update account balances based on the transaction type
        const updatedAccounts = state.accounts.map(acc => {
          // Expense: subtract from source
          if (newTxn.type === 'expense' && acc.id === newTxn.fromAccountId) {
            return { ...acc, balance: acc.balance - newTxn.amount };
          }
          // Income: add to destination
          if (newTxn.type === 'income' && acc.id === newTxn.toAccountId) {
            return { ...acc, balance: acc.balance + newTxn.amount };
          }
          // Transfer/Withdrawal: subtract from source, add to destination
          if (newTxn.type === 'transfer' || newTxn.type === 'withdrawal') {
            if (acc.id === newTxn.fromAccountId) {
              return { ...acc, balance: acc.balance - newTxn.amount };
            }
            if (acc.id === newTxn.toAccountId) {
              return { ...acc, balance: acc.balance + newTxn.amount };
            }
          }
          return acc;
        });

        return {
          transactions: [newTxn, ...state.transactions],
          accounts: updatedAccounts
        };
      }),

      addLoan: (loan) => set((state) => {
        const newLoan = { ...loan, id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, status: 'active', payments: [] };
        
        // Impact on accounts: borrowed = add to wallet, lent = subtract from wallet
        const updatedAccounts = state.accounts.map(acc => {
          if (loan.type === 'given' && acc.id === loan.accountId) {
            return { ...acc, balance: acc.balance - loan.amount };
          }
          if (loan.type === 'received' && acc.id === loan.accountId) {
            return { ...acc, balance: acc.balance + loan.amount };
          }
          return acc;
        });

        return {
          loans: [newLoan, ...state.loans],
          accounts: updatedAccounts
        };
      }),

      editLoan: (id, updates) => set((state) => ({
        loans: state.loans.map(l => l.id === id ? { ...l, ...updates } : l)
      })),

      deleteLoan: (id) => set((state) => {
        const loanToDelete = state.loans.find(l => l.id === id);
        if (!loanToDelete) return state;

        // Only reverse the UNPAID portion if the loan is NOT fully paid.
        // If it's already paid, we just remove the record from history without touching wallets.
        let updatedAccounts = state.accounts;
        if (loanToDelete.status !== 'paid') {
          const paidAmount = (loanToDelete.payments || []).reduce((sum, p) => sum + p.amount, 0);
          const remainingAmount = Math.max(0, loanToDelete.amount - paidAmount);

          if (remainingAmount > 0) {
            updatedAccounts = state.accounts.map(acc => {
              if (acc.id === loanToDelete.accountId) {
                if (loanToDelete.type === 'given') return { ...acc, balance: acc.balance + remainingAmount };
                if (loanToDelete.type === 'received') return { ...acc, balance: acc.balance - remainingAmount };
              }
              return acc;
            });
          }
        }

        return {
          loans: state.loans.filter(l => l.id !== id),
          accounts: updatedAccounts
        };
      }),

      deleteLoanPayment: (loanId, paymentIndex) => set((state) => {
        const loan = state.loans.find(l => l.id === loanId);
        if (!loan || !loan.payments || !loan.payments[paymentIndex]) return state;

        const paymentToDelete = loan.payments[paymentIndex];
        
        // Reverse the wallet impact of this specific payment
        const updatedAccounts = state.accounts.map(acc => {
          if (acc.id === paymentToDelete.accountId) {
            // Lent (given): original payment added money to wallet -> now subtract it back
            // Borrowed (received): original payment subtracted from wallet -> now add it back
            return { ...acc, balance: loan.type === 'given' ? acc.balance - paymentToDelete.amount : acc.balance + paymentToDelete.amount };
          }
          return acc;
        });

        const updatedPayments = loan.payments.filter((_, i) => i !== paymentIndex);
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid >= loan.amount ? 'paid' : totalPaid > 0 ? 'partial' : 'active';
        return {
          loans: state.loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments, status: newStatus } : l),
          accounts: updatedAccounts
        };
      }),

      updateLoanPayment: (loanId, paymentIndex, newAmount) => set((state) => {
        const loan = state.loans.find(l => l.id === loanId);
        if (!loan || !loan.payments || !loan.payments[paymentIndex]) return state;

        const oldPayment = loan.payments[paymentIndex];
        const diff = newAmount - oldPayment.amount;
        
        const updatedAccounts = state.accounts.map(acc => {
          if (acc.id === oldPayment.accountId) {
            return { ...acc, balance: loan.type === 'given' ? acc.balance + diff : acc.balance - diff };
          }
          return acc;
        });

        const updatedPayments = loan.payments.map((p, i) => i === paymentIndex ? { ...p, amount: newAmount } : p);
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid >= loan.amount ? 'paid' : totalPaid > 0 ? 'partial' : 'active';

        return {
          loans: state.loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments, status: newStatus } : l),
          accounts: updatedAccounts
        };
      }),

      // paidAmount: how much is being paid now (partial or full)
      // payAccountId: which wallet to use (auto-filled from loan.accountId)
      recordLoanPayment: (id, paidAmount, payAccountId) => set((state) => {
        const loan = state.loans.find(l => l.id === id);
        if (!loan || loan.status === 'paid') return state;

        const newPayment = { amount: paidAmount, date: new Date().toISOString(), accountId: payAccountId };
        const allPayments = [...(loan.payments || []), newPayment];
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid >= loan.amount ? 'paid' : 'partial';

        // Reverse effect on the payment account:
        // - Lent (given): you receive money back → add to wallet
        // - Borrowed (received): you pay back → subtract from wallet
        const updatedAccounts = state.accounts.map(acc => {
          if (acc.id === payAccountId) {
            return { ...acc, balance: loan.type === 'given' ? acc.balance + paidAmount : acc.balance - paidAmount };
          }
          return acc;
        });

        return {
          loans: state.loans.map(l => l.id === id ? { ...l, status: newStatus, payments: allPayments } : l),
          accounts: updatedAccounts
        };
      }),

      addRecurring: (rec) => set((state) => ({
        recurring: [...state.recurring, { ...rec, id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }]
      })),

      deleteRecurring: (id) => set((state) => ({
        recurring: state.recurring.filter(r => r.id !== id)
      })),

      processRecurring: () => {
        const state = get();
        const now = new Date();
        let newTransactions = [];
        let updatedRecurring = [...state.recurring];
        let hasChanges = false;

        updatedRecurring = updatedRecurring.map(rec => {
          const nextDate = new Date(rec.nextDate);
          if (now >= nextDate) {
            hasChanges = true;
            const newTxn = {
              id: `txn_auto_${Date.now()}_${rec.id}`,
              type: rec.type,
              amount: rec.amount,
              note: `[Auto] ${rec.note}`,
              fromAccountId: rec.fromAccountId,
              toAccountId: rec.toAccountId,
              categoryId: rec.categoryId,
              date: nextDate.toISOString(),
              isAuto: true
            };
            newTransactions.push(newTxn);

            const newNext = new Date(nextDate);
            if (rec.frequency === 'daily') newNext.setDate(newNext.getDate() + 1);
            if (rec.frequency === 'weekly') newNext.setDate(newNext.getDate() + 7);
            if (rec.frequency === 'monthly') newNext.setMonth(newNext.getMonth() + 1);
            
            return { ...rec, nextDate: newNext.toISOString(), lastProcessed: now.toISOString() };
          }
          return rec;
        });

        if (hasChanges) {
          let updatedAccounts = [...state.accounts];
          newTransactions.forEach(txn => {
            updatedAccounts = updatedAccounts.map(acc => {
              if (txn.type === 'expense' && acc.id === txn.fromAccountId) return { ...acc, balance: acc.balance - txn.amount };
              if (txn.type === 'income' && acc.id === txn.toAccountId) return { ...acc, balance: acc.balance + txn.amount };
              if (txn.type === 'transfer' || txn.type === 'withdrawal') {
                if (acc.id === txn.fromAccountId) return { ...acc, balance: acc.balance - txn.amount };
                if (acc.id === txn.toAccountId) return { ...acc, balance: acc.balance + txn.amount };
              }
              return acc;
            });
          });

          set({ 
            transactions: [...newTransactions, ...state.transactions],
            recurring: updatedRecurring,
            accounts: updatedAccounts
          });
        }
      },

      // Backup & Restore
      exportData: async () => {
        const data = {
          accounts: get().accounts,
          categories: get().categories,
          transactions: get().transactions,
          loans: get().loans,
          recurring: get().recurring,
          paydayDay: get().paydayDay
        };
        const jsonString = JSON.stringify(data, null, 2);
        const fileName = `money-map-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        // Helper for browser download
        const triggerBrowserDownload = () => {
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
        };

        try {
          // Check if we are running in a native environment (Android/iOS)
          const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
          
          if (!isNative) {
            triggerBrowserDownload();
            return;
          }

          const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
          
          try {
            await Filesystem.requestPermissions();
          } catch (e) {}

          await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true
          });
          
          alert(`Backup saved to Documents/${fileName}`);
        } catch (e) {
          console.error("Local save failed, falling back to browser download", e);
          triggerBrowserDownload();
        }
      },

      importData: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          if (data.accounts || data.transactions) {
            set({
              accounts: data.accounts || [],
              categories: data.categories || MONEFY_CATEGORIES,
              transactions: data.transactions || [],
              loans: data.loans || [],
              recurring: data.recurring || [],
              paydayDay: data.paydayDay || null,
              hasData: true
            });
            return true;
          }
        } catch (e) {
          console.error("Import failed", e);
          return false;
        }
      },

      // Emergency Recovery Action (NUCLEAR VERSION)
      emergencyRecovery: async () => {
        console.log("Starting Nuclear Recovery Scan...");
        
        // 1. Try to list all IndexedDB databases (Modern browsers/WebViews)
        if (window.indexedDB && window.indexedDB.databases) {
          try {
            const dbs = await window.indexedDB.databases();
            console.log("Found databases:", dbs);
            for (const dbInfo of dbs) {
              if (dbInfo.name.toLowerCase().includes('money')) {
                console.warn("Potential DB found:", dbInfo.name);
                // We found a DB, but localforage needs to be configured to talk to it
              }
            }
          } catch (e) { console.error("DB List failed", e); }
        }

        // 2. Scan all keys in the current LocalForage instance
        const keys = await localforage.keys();
        const alternatives = ['money-map-storage', 'moneymap', 'money_map', 'moneyMapStore', 'zustand'];
        
        for (const key of [...keys, ...alternatives]) {
          try {
            const data = await localforage.getItem(key);
            if (data && (data.state || data.accounts)) {
              console.log("SUCCESS: Data found in key:", key);
              const recoveredState = data.state || data;
              set({ ...recoveredState, hasData: true });
              return true;
            }
          } catch (e) {}
        }

        // 3. Last Resort: Check LocalStorage
        try {
          const lsData = localStorage.getItem('money-map-storage');
          if (lsData) {
            const data = JSON.parse(lsData);
            if (data && data.state) {
              set({ ...data.state, hasData: true });
              return true;
            }
          }
        } catch (e) {}

        return false;
      },

      // Firebase Cloud Sync Actions
      setUser: (user) => set({ user }),
      
      syncToCloud: async (force = false, isSilent = false) => {
        const { user, accounts, transactions, categories, loans, recurring, paydayDay } = get();
        if (!user) return { success: false, error: 'No user logged in' };
        
        const localIsEmpty = (accounts.length === 0 && transactions.length === 0);

        // ABSOLUTE GUARD: Cannot sync empty local records to cloud under any circumstance
        if (localIsEmpty) {
          console.warn("SYNC BLOCKED: Device has 0 local records.");
          if (!isSilent) {
            alert("Sync Disabled: Your device has 0 records. Please tap 'Restore' to load your data from Cloud.");
          }
          return { success: false, error: 'Cannot sync 0 records. Use Restore instead.' };
        }

        const fetchRes = await cloudSync.fetchData(user.uid);
        const existingCloudData = fetchRes.success ? fetchRes.data : null;
        const cloudHasData = existingCloudData && ((existingCloudData.accounts && existingCloudData.accounts.length > 0) || (existingCloudData.transactions && existingCloudData.transactions.length > 0));

        // Create backup snapshot of existing cloud data before overwriting (if cloud had data)
        if (cloudHasData) {
          await cloudSync.createBackupSnapshot(user.uid, existingCloudData);
        }

        const dataToSync = { accounts, transactions, categories, loans, recurring, paydayDay };
        const saveRes = await cloudSync.saveData(user.uid, dataToSync);

        if (saveRes.success) {
          set({ lastSynced: saveRes.timestamp || new Date().toISOString() });
          return { success: true, timestamp: saveRes.timestamp };
        } else {
          console.error("Cloud Save Failed:", saveRes.error);
          return { success: false, error: saveRes.error || "Failed to save to cloud" };
        }
      },

      pullFromCloud: async () => {
        const { user } = get();
        if (!user) return { success: false, error: 'No user logged in' };

        const fetchRes = await cloudSync.fetchData(user.uid);
        const cloudData = fetchRes.success ? fetchRes.data : null;

        if (cloudData && ((cloudData.accounts && cloudData.accounts.length > 0) || (cloudData.transactions && cloudData.transactions.length > 0))) {
          set({
            accounts: cloudData.accounts || [],
            transactions: cloudData.transactions || [],
            categories: cloudData.categories || [],
            loans: cloudData.loans || [],
            recurring: cloudData.recurring || [],
            paydayDay: cloudData.paydayDay || null,
            hasData: true,
            lastSynced: cloudData.lastUpdated || new Date().toISOString()
          });
          return { success: true, data: cloudData };
        }

        // If main cloud doc is empty, check if there are subcollection backups!
        const backups = await cloudSync.fetchBackups(user.uid);
        const validBackup = backups.find(b => (b.accounts && b.accounts.length > 0) || (b.transactions && b.transactions.length > 0));
        if (validBackup) {
          set({
            accounts: validBackup.accounts || [],
            transactions: validBackup.transactions || [],
            categories: validBackup.categories || [],
            loans: validBackup.loans || [],
            recurring: validBackup.recurring || [],
            paydayDay: validBackup.paydayDay || null,
            hasData: true,
            lastSynced: validBackup.backedUpAt || validBackup.lastUpdated || new Date().toISOString()
          });
          return { success: true, data: validBackup, isFromBackup: true };
        }

        if (cloudData) {
          set({
            accounts: cloudData.accounts || [],
            transactions: cloudData.transactions || [],
            categories: cloudData.categories || [],
            loans: cloudData.loans || [],
            recurring: cloudData.recurring || [],
            paydayDay: cloudData.paydayDay || null,
            hasData: true,
            lastSynced: cloudData.lastUpdated || new Date().toISOString()
          });
          return { success: true, data: cloudData, isEmpty: true };
        }

        return { success: false, error: fetchRes.error || 'Failed to fetch data from Cloud' };
      },

      checkCloudDataExists: async () => {
        const { user } = get();
        if (!user) return false;
        const fetchRes = await cloudSync.fetchData(user.uid);
        if (fetchRes.success && fetchRes.data) {
          const d = fetchRes.data;
          if ((d.accounts && d.accounts.length > 0) || (d.transactions && d.transactions.length > 0)) {
            return true;
          }
        }
        const backups = await cloudSync.fetchBackups(user.uid);
        return backups.some(b => (b.accounts && b.accounts.length > 0) || (b.transactions && b.transactions.length > 0));
      }
    }),
    {
      name: 'money-map-storage',
      storage: createJSONStorage(() => localForageStore),
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (error) {
            console.error("Hydration Error:", error);
          } else if (hydratedState) {
            // If the app was previously used (hasData is true) but now has 0 accounts/transactions
            // This is a sign of storage eviction or failure
            if (hydratedState.hasData && hydratedState.accounts.length === 0 && hydratedState.transactions.length === 0) {
              console.warn("CRITICAL: Storage was previously used but is now empty. Preventing overwrite.");
            }
            
            // Mark as used if they add anything
            if (hydratedState.accounts.length > 0 || hydratedState.transactions.length > 0) {
              state.hasData = true;
            }
          }
          // Resolve the module-level hydration promise so waitForHydration() callers unblock.
          // This is NEVER stored in localforage — it resets fresh on every page load.
          _hydrateResolve();
        };
      },
    }
  )
);

export default useStore;
