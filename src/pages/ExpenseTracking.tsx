
import { useState, useEffect } from "react";
import { Plus, Search, Filter, Calendar, TrendingUp, TrendingDown, Edit2, Trash2, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { financeApi } from "@/services/financeApi";

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: 'cash' | 'bank_transfer' | 'cheque';
  reference: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  categories: Array<{ category: string; amount: number; count: number }>;
  paymentMethods: Array<{ method: string; amount: number; count: number }>;
}

import { apiConfig } from '@/utils/apiConfig';

export default function ExpenseTracking() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    categories: [],
    paymentMethods: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, currentPage]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      });
      
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${apiConfig.getBaseUrl()}/finance/expenses?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setExpenses(data.data.expenses || []);
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages);
        }
        
        // Calculate summary from fetched data
        calculateSummary(data.data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expense data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (expenseData: Expense[]) => {
    const totalExpenses = expenseData.reduce((sum, exp) => sum + exp.amount, 0);
    
    const categoryMap = new Map();
    const paymentMethodMap = new Map();
    
    expenseData.forEach(expense => {
      // Categories
      const cat = categoryMap.get(expense.category) || { amount: 0, count: 0 };
      categoryMap.set(expense.category, {
        amount: cat.amount + expense.amount,
        count: cat.count + 1
      });
      
      // Payment methods
      const pm = paymentMethodMap.get(expense.payment_method) || { amount: 0, count: 0 };
      paymentMethodMap.set(expense.payment_method, {
        amount: pm.amount + expense.amount,
        count: pm.count + 1
      });
    });
    
    setSummary({
      totalExpenses,
      categories: Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count
      })),
      paymentMethods: Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count
      }))
    });
  };

  const handleCreateExpense = async (expenseData: any) => {
    try {
      const data = await financeApi.createExpense(expenseData);
      if (data.success) {
        toast({
          title: "Success",
          description: "Expense created successfully",
        });
        setShowAddModal(false);
        fetchExpenses();
      } else {
        throw new Error(data.message || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to create expense",
        variant: "destructive",
      });
    }
  };

  const handleUpdateExpense = async (id: number, expenseData: any) => {
    try {
      const response = await fetch(`${apiConfig.getBaseUrl()}/finance/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
        setEditingExpense(null);
        fetchExpenses();
      } else {
        throw new Error(data.message || 'Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const response = await fetch(`${apiConfig.getBaseUrl()}/finance/expenses/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Expense deleted successfully",
        });
        fetchExpenses();
      } else {
        throw new Error(data.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const todayExpenses = expenses
    .filter(expense => {
      const today = new Date().toLocaleDateString('en-GB');
      return expense.date === today;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const thisMonthExpenses = expenses
    .filter(expense => {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const expenseMonth = expense.date.split('/').reverse().join('-').slice(0, 7);
      return expenseMonth === thisMonth;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const getPaymentMethodBadge = (method: string | undefined | null) => {
    // Handle undefined, null, or empty method
    if (!method) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
          Unknown
        </Badge>
      );
    }

    const colors = {
      cash: 'bg-green-100 text-green-800 border-green-200',
      bank_transfer: 'bg-blue-100 text-blue-800 border-blue-200',
      cheque: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return (
      <Badge className={`${colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'} border`}>
        {method.replace('_', ' ')}
      </Badge>
    );
  };

  const pieChartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-slate-600">Loading expense data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 min-h-[calc(100vh-65px)]">
      <div className="flex items-center gap-4 mb-8">
      
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-1">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-500 to-slate-500 bg-clip-text text-transparent">
              Expense Management
            </h1>
            <p className="text-slate-600 mt-1">Track and manage your business expenses</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-2 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold">Rs. {summary.totalExpenses.toLocaleString()}</p>
              </div>
              <div className="bg-red-400 bg-opacity-30 p-3 rounded-full">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-2 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold">Rs. {thisMonthExpenses.toLocaleString()}</p>
              </div>
              <div className="bg-orange-400 bg-opacity-30 p-3 rounded-full">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-2 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Today</p>
                <p className="text-2xl font-bold">Rs. {todayExpenses.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-400 bg-opacity-30 p-3 rounded-full">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-2 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Categories</p>
                <p className="text-2xl font-bold">{summary.categories.length}</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full">
                <Badge className="bg-purple-600">{expenses.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Category Expense Chart */}
        <Card className=" shadow-xl border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-500 flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingDown className="h-5 w-5 text-blue-500" />
              </div>
              Expense by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.categories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card className=" shadow-xl border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-500 flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.paymentMethods}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="method"
                  >
                    {summary.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Management */}
      <Card className=" shadow-xl border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Eye className="h-5 w-5 text-indigo-600" />
            </div>
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input 
                placeholder="Search expenses..." 
                className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-500 font-semibold">Category</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Description</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Amount</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Date</TableHead>
                  <TableHead className="text-slate-500 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">{expense.description}</TableCell>
                    <TableCell className="font-semibold text-red-600">Rs. {expense.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-600">{expense.date}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingExpense(expense)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium">No expenses found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Expense Modal */}
      <ExpenseFormModal
        open={showAddModal || !!editingExpense}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingExpense(null);
          }
        }}
        expense={editingExpense}
        onSubmit={editingExpense ? 
          (data) => handleUpdateExpense(editingExpense.id, data) : 
          handleCreateExpense
        }
      />
    </div>
  );
}

const ExpenseFormModal = ({ 
  open, 
  onOpenChange, 
  expense, 
  onSubmit 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  onSubmit: (data: any) => void;
}) => {
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: ''
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category,
        description: expense.description || '',
        amount: expense.amount.toString(),
        date: expense.date
      });
    } else {
      setFormData({
        category: '',
        description: '',
        amount: '',
        date: new Date().toLocaleDateString('en-GB')
      });
    }
  }, [expense, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      payment_method: "cash",
      reference: `EXP-${Date.now()}`,
      receipt_url: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-800 flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-slate-700">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="mt-1 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., Office Supplies"
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-slate-700">Amount (Rs.) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="mt-1 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Describe the expense..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-sm font-medium text-slate-700">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date ? formData.date.split('/').reverse().join('-') : ''}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setFormData({ ...formData, date: date.toLocaleDateString('en-GB') });
              }}
              required
              className="mt-1 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              disabled={!formData.category || !formData.amount || !formData.date}
            >
              {expense ? 'Update Expense' : 'Add Expense'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
