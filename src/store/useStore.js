import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';

// Configure localforage for offline persistence
localforage.config({
  name: 'MoneyMap',
  storeName: 'moneymap_store'
});

// Custom storage wrapper for Zustand to use localforage
const localForageStore = {
  getItem: async (name) => {
    const value = await localforage.getItem(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name) => {
    await localforage.removeItem(name);
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

      setPaydayDay: (day) => set({ paydayDay: day }),

      resetCategories: () => set({ categories: MONEFY_CATEGORIES }),

      setViewSettings: (settings) => set((state) => ({ ...state, ...settings })),
      resetDateView: () => set({ currentDateView: new Date().toISOString() }),

      // Actions
      addAccount: (account) => set((state) => ({
        accounts: [...state.accounts, { ...account, id: `acc_${Date.now()}` }]
      })),

      updateAccount: (id, updates) => set((state) => ({
        accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc)
      })),

      addCategory: (category) => set((state) => ({
        categories: [...state.categories, { ...category, id: `cat_${Date.now()}` }]
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
        const newTxn = { ...transaction, id: `txn_${Date.now()}` };
        
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
        const newLoan = { ...loan, id: `loan_${Date.now()}`, status: 'active', payments: [] };
        
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
        recurring: [...state.recurring, { ...rec, id: `rec_${Date.now()}` }]
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
      exportData: () => {
        const data = {
          accounts: get().accounts,
          categories: get().categories,
          transactions: get().transactions,
          loans: get().loans
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `money-map-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      },

      importData: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          if (data.accounts || data.transactions) {
            set({
              accounts: data.accounts || [],
              categories: data.categories || MONEFY_CATEGORIES,
              transactions: data.transactions || [],
              loans: data.loans || []
            });
            return true;
          }
        } catch (e) {
          console.error("Import failed", e);
          return false;
        }
      }
    }),
    {
      name: 'money-map-storage',
      storage: createJSONStorage(() => localForageStore),
    }
  )
);

export default useStore;
