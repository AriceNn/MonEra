import { describe, it, expect } from 'vitest';
import {
  calculateTotalIncome,
  calculateTotalExpense,
  calculateTotalSavings,
  calculateCashBalance,
  calculateSavingsRate,
  generateFinancialSummary,
} from './calculations';
import type { Transaction } from '../types';

const createTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: '1',
  title: 'Test',
  amount: 0,
  category: 'Test',
  date: '2025-01-01',
  type: 'income',
  originalCurrency: 'TRY',
  ...overrides,
});

describe('Financial Calculations', () => {
  describe('calculateTotalIncome', () => {
    it('should return 0 for empty array', () => {
      expect(calculateTotalIncome([])).toBe(0);
    });

    it('should calculate total income', () => {
      const transactions = [
        createTransaction({ amount: 1000, type: 'income' }),
        createTransaction({ id: '2', amount: 2000, type: 'income' }),
      ];
      expect(calculateTotalIncome(transactions)).toBe(3000);
    });

    it('should ignore non-income transactions', () => {
      const transactions = [
        createTransaction({ amount: 1000, type: 'income' }),
        createTransaction({ id: '2', amount: 500, type: 'expense' }),
      ];
      expect(calculateTotalIncome(transactions)).toBe(1000);
    });
  });

  describe('calculateTotalExpense', () => {
    it('should return 0 for empty array', () => {
      expect(calculateTotalExpense([])).toBe(0);
    });

    it('should calculate total expenses', () => {
      const transactions = [
        createTransaction({ amount: 500, type: 'expense' }),
        createTransaction({ id: '2', amount: 300, type: 'expense' }),
      ];
      expect(calculateTotalExpense(transactions)).toBe(800);
    });
  });

  describe('calculateTotalSavings', () => {
    it('should return 0 for empty array', () => {
      expect(calculateTotalSavings([])).toBe(0);
    });

    it('should calculate only savings (not withdrawals)', () => {
      const transactions = [
        createTransaction({ amount: 1000, type: 'savings' }),
        createTransaction({ id: '2', amount: 500, type: 'savings' }),
      ];
      expect(calculateTotalSavings(transactions)).toBe(1500);
    });
    
    it('should ignore withdrawals', () => {
      const transactions = [
        createTransaction({ amount: 1000, type: 'savings' }),
        createTransaction({ id: '2', amount: 200, type: 'withdrawal' }),
      ];
      expect(calculateTotalSavings(transactions)).toBe(1000);
    });
  });

  describe('calculateCashBalance', () => {
    it('should return 0 for empty array', () => {
      expect(calculateCashBalance([])).toBe(0);
    });

    it('should calculate income minus expenses minus savings', () => {
      const transactions = [
        createTransaction({ amount: 5000, type: 'income' }),
        createTransaction({ id: '2', amount: 2000, type: 'expense' }),
        createTransaction({ id: '3', amount: 1000, type: 'savings' }),
      ];
      // 5000 - 2000 - 1000 = 2000
      expect(calculateCashBalance(transactions)).toBe(2000);
    });

    it('should add withdrawals back to cash balance', () => {
      const transactions = [
        createTransaction({ amount: 5000, type: 'income' }),
        createTransaction({ id: '2', amount: 2000, type: 'expense' }),
        createTransaction({ id: '3', amount: 1000, type: 'savings' }),
        createTransaction({ id: '4', amount: 500, type: 'withdrawal' }),
      ];
      // 5000 - 2000 - 1000 + 500 = 2500
      expect(calculateCashBalance(transactions)).toBe(2500);
    });

    it('should handle negative balance', () => {
      const transactions = [
        createTransaction({ amount: 1000, type: 'income' }),
        createTransaction({ id: '2', amount: 2000, type: 'expense' }),
      ];
      expect(calculateCashBalance(transactions)).toBe(-1000);
    });
  });

  describe('calculateSavingsRate', () => {
    it('should return 0 for empty array', () => {
      expect(calculateSavingsRate([])).toBe(0);
    });

    it('should return 0 when income is 0', () => {
      const transactions = [
        createTransaction({ amount: 1000, type: 'expense' }),
      ];
      expect(calculateSavingsRate(transactions)).toBe(0);
    });

    it('should calculate savings rate correctly', () => {
      const transactions = [
        createTransaction({ amount: 5000, type: 'income' }),
        createTransaction({ id: '2', amount: 2000, type: 'expense' }),
      ];
      // (5000 - 2000) / 5000 * 100 = 60%
      expect(calculateSavingsRate(transactions)).toBe(60);
    });

    it('should handle 100% savings rate', () => {
      const transactions = [
        createTransaction({ amount: 5000, type: 'income' }),
      ];
      expect(calculateSavingsRate(transactions)).toBe(100);
    });
  });

  describe('generateFinancialSummary', () => {
    it('should handle empty transactions', () => {
      const summary = generateFinancialSummary([], 0, 2025);
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpense).toBe(0);
      expect(summary.cashBalance).toBe(0);
      expect(summary.savingsRate).toBe(0);
    });

    it('should generate complete summary', () => {
      const transactions = [
        createTransaction({ amount: 5000, type: 'income' }),
        createTransaction({ id: '2', amount: 2000, type: 'expense' }),
        createTransaction({ id: '3', amount: 500, type: 'savings' }),
      ];
      const summary = generateFinancialSummary(transactions, 0, 2025);
      expect(summary.totalIncome).toBe(5000);
      expect(summary.totalExpense).toBe(2000);
      // Cash balance = 5000 - 2000 - 500 = 2500 (savings reduce cash balance)
      expect(summary.cashBalance).toBe(2500);
      expect(summary.savingsRate).toBe(60);
    });
  });
});
