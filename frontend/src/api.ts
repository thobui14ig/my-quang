const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface User {
  id: number;
  username: string;
  fullName: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number | string;
  description: string;
  note?: string | null;
  date: string;
  source_type: 'manual' | 'daily_sale' | 'employee_salary';
  created_at: string;
}

export interface Sale {
  id: number;
  date: string;
  quantity: number;
  unitPrice: number | string;
  amount: number | string;
  note?: string | null;
}

export interface DashboardData {
  date: string;
  day: { income: number; expense: number; net: number; bowls: number; noodleRevenue: number };
  month: {
    income: number; expense: number; net: number; bowls: number;
    activeEmployeeCount: number;
    pendingEmployeeCount: number;
    operatorShare: number; partnerShare: number;
  };
  lifetime: { income: number; expense: number; net: number; operatorShare: number; partnerShare: number };
}

export interface Business {
  name: string;
  initial_capital: number | string;
  noodle_price: number | string;
  operator_capital: number | string;
  partner_capital: number | string;
  owner_profit_percent: number | string;
  partner_profit_percent: number | string;
  cashOpeningBalance: number | string;
  cashOpeningDate: string;
}

export interface CashBalance {
  openingBalance: number;
  openingDate: string;
  income: number;
  expense: number;
  contributions: number;
  withdrawals: number;
  balance: number;
}

export interface CashMovement {
  id: number;
  type: 'contribution' | 'withdrawal';
  amount: number | string;
  date: string;
  note?: string | null;
  createdAt: string;
}

export interface ReportRow {
  date: string;
  income: number;
  expense: number;
  net: number;
  bowls: number;
  noodle_revenue: number;
}

export interface Employee {
  id: number;
  fullName: string;
}

export interface EmployeePayment {
  id: number;
  employeeId: number;
  month: string;
  amount: number | string;
  createdAt: string;
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('my-quang-token', token);
  else localStorage.removeItem('my-quang-token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('my-quang-token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message || `Yêu cầu thất bại (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
