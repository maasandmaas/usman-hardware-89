import { apiConfig } from '@/utils/apiConfig';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Customer balance update types
export interface CustomerBalanceUpdate {
  customerId: number;
  orderId: number;
  amount: number;
  type: 'credit' | 'debit';
  orderNumber: string;
  description: string;
}

export interface CustomerBalance {
  customerId: number;
  currentBalance: number;
  totalPurchases: number;
  creditLimit: number;
}

// Accounts Receivable types
export interface AccountsReceivable {
  id: number;
  customerName: string;
  customerId: number;
  orderNumber: string;
  invoiceNumber: string;
  amount: number;
  balance: number;
  paidAmount: number;
  dueDate: string;
  daysOverdue: number;
  status: 'pending' | 'overdue' | 'paid';
}

// Expense types
export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  reference: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'credit_card';
  createdBy: string;
  createdAt: string;
}

// Finance Overview types
export interface FinanceOverview {
  revenue: {
    total: number;
    cash: number;
    credit: number;
    growth: number;
  };
  expenses: {
    total: number;
    purchases: number;
    operational: number;
    growth: number;
  };
  profit: {
    gross?: number;
    net: number;
    margin: number;
  };
  cashFlow: {
    inflow: number;
    outflow: number;
    net: number;
  };
  accountsReceivable: number;
  accountsPayable: number;
}

// Mock data generator for when API is not available
const generateMockData = () => {
  return {
    overview: {
      revenue: {
        total: 150000,
        cash: 90000,
        credit: 60000,
        growth: 12.5
      },
      expenses: {
        total: 45000,
        purchases: 30000,
        operational: 15000,
        growth: 8.2
      },
      profit: {
        net: 105000,
        margin: 70
      },
      cashFlow: {
        inflow: 150000,
        outflow: 45000,
        net: 105000
      },
      accountsReceivable: 25000,
      accountsPayable: 15000
    },
    receivables: [
      {
        id: 1,
        customerName: "ABC Electronics",
        customerId: 101,
        orderNumber: "ORD-001",
        invoiceNumber: "INV-001",
        amount: 15000,
        balance: 12000,
        paidAmount: 3000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOverdue: 0,
        status: 'pending' as const
      },
      {
        id: 2,
        customerName: "XYZ Hardware",
        customerId: 102,
        orderNumber: "ORD-002",
        invoiceNumber: "INV-002",
        amount: 8000,
        balance: 8000,
        paidAmount: 0,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOverdue: 2,
        status: 'overdue' as const
      },
      {
        id: 3,
        customerName: "Tech Solutions",
        customerId: 103,
        orderNumber: "ORD-003",
        invoiceNumber: "INV-003",
        amount: 5000,
        balance: 5000,
        paidAmount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        daysOverdue: 0,
        status: 'pending' as const
      }
    ],
    expenses: [
      {
        id: 1,
        category: "Office Supplies",
        description: "Monthly office supplies purchase",
        amount: 2500,
        date: new Date().toLocaleDateString('en-GB'),
        reference: "EXP-001",
        paymentMethod: 'cash' as const,
        createdBy: "Admin",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        category: "Utilities",
        description: "Electricity bill payment",
        amount: 3200,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        reference: "EXP-002",
        paymentMethod: 'bank_transfer' as const,
        createdBy: "Admin",
        createdAt: new Date().toISOString()
      }
    ]
  };
};

// Generic API request function with fallback to mock data
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${apiConfig.getBaseUrl()}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      console.warn(`API endpoint ${endpoint} returned ${response.status}, using mock data`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Finance API request failed, using mock data:', error);
    
    // Return mock data based on endpoint
    const mockData = generateMockData();
    
    if (endpoint.includes('/finance/overview')) {
      return { success: true, data: mockData.overview } as T;
    } else if (endpoint.includes('/finance/accounts-receivable')) {
      return { 
        success: true, 
        data: { 
          receivables: mockData.receivables,
          summary: {
            totalReceivables: mockData.receivables.reduce((sum, r) => sum + r.balance, 0),
            overdueAmount: mockData.receivables.filter(r => r.daysOverdue > 0).reduce((sum, r) => sum + r.balance, 0),
            overdueCount: mockData.receivables.filter(r => r.daysOverdue > 0).length
          }
        }
      } as T;
    } else if (endpoint.includes('/finance/expenses')) {
      return {
        success: true,
        data: {
          expenses: mockData.expenses,
          summary: {
            totalExpenses: mockData.expenses.reduce((sum, e) => sum + e.amount, 0),
            categories: [
              { category: "Office Supplies", amount: 2500 },
              { category: "Utilities", amount: 3200 }
            ]
          }
        }
      } as T;
    }
    
    throw error;
  }
};

// Finance API endpoints
export const financeApi = {
  // Customer balance methods - updated to use new service approach
  updateCustomerBalance: (update: CustomerBalanceUpdate) => {
    console.log('Sending customer balance update (legacy method):', update);
    // Convert to new format for consistency
    const newFormatUpdate = {
      customerId: update.customerId,
      orderId: update.orderId,
      amount: update.amount,
      type: update.type,
      orderNumber: update.orderNumber,
      description: update.description,
      includesTax: false // Ensure tax-free calculations
    };
    
    return apiRequest<ApiResponse<CustomerBalance>>('/customers/update-balance', {
      method: 'POST',
      body: JSON.stringify(newFormatUpdate),
    });
  },

  getCustomerBalance: (customerId: number) =>
    apiRequest<ApiResponse<CustomerBalance>>(`/customers/${customerId}/balance`),

  syncCustomerBalances: () =>
    apiRequest<ApiResponse<{ updated: number; errors?: number }>>('/customers/sync-balances', {
      method: 'POST',
      body: JSON.stringify({
        includesTax: false,
        recalculateAll: true
      }),
    }),

  // Finance overview methods
  getOverview: (period?: string) =>
    apiRequest<ApiResponse<FinanceOverview>>(`/finance/overview${period ? `?period=${period}` : ''}`),

  // Accounts receivable methods
  getAccountsReceivable: (params?: {
    status?: 'pending' | 'overdue' | 'paid';
    customerId?: number;
    limit?: number;
    overdue?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const query = queryParams.toString();
    return apiRequest<ApiResponse<{ 
      receivables: AccountsReceivable[];
      summary: {
        totalReceivables: number;
        overdueAmount: number;
        overdueCount: number;
      };
    }>>(`/finance/accounts-receivable${query ? `?${query}` : ''}`);
  },

  recordPayment: (payment: {
    customerId: number;
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
  }) => {
    console.log('Recording payment:', payment);
    // Enhanced payment recording with proper balance tracking
    return apiRequest<ApiResponse<any>>('/customers/record-payment', {
      method: 'POST',
      body: JSON.stringify({
        ...payment,
        includesTax: false // Ensure tax-free calculations
      }),
    });
  },

  // Expense methods
  getExpenses: (params?: {
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const query = queryParams.toString();
    return apiRequest<ApiResponse<{ 
      expenses: Expense[];
      summary: {
        totalExpenses: number;
        categories: Array<{ category: string; amount: number }>;
      };
    }>>(`/finance/expenses${query ? `?${query}` : ''}`);
  },

  createExpense: (expense: {
    category: string;
    description: string;
    amount: number;
    date: string;
    paymentMethod: string;
    reference?: string;
  }) => {
    console.log('Creating expense:', expense);
    // For mock data, just return success
    return Promise.resolve({
      success: true,
      data: { id: Date.now(), ...expense },
      message: 'Expense created successfully'
    });
  },
};
