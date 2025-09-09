
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Plus, ArrowUp, ArrowDown, Calendar, TrendingUp, TrendingDown, CreditCard, DollarSign, Users, FileText, Package, RefreshCw, Wallet, Building2, Receipt, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { financeApi, type FinanceOverview, type AccountsReceivable, type Expense } from "@/services/financeApi";
import { apiConfig } from "@/utils/apiConfig";

type AccountsPayable = {
  id: number;
  supplierName: string;
  amount: number;
  contactPerson: string;
  phone: string;
  email: string;
  pendingOrders: number;
};

type CashFlowEntry = {
  type: "inflow" | "outflow";
  amount: number;
  reference: string;
  description: string;
  date: string;
};

const Finance = () => {
  const { toast } = useToast();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    fetchFinanceData();
    // eslint-disable-next-line
  }, [period]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      setApiConnected(false);

      // Fetch overview
      const overviewResponse = await financeApi.getOverview(period);
      if (overviewResponse.success) {
        setOverview(overviewResponse.data);
        setApiConnected(true);
      }

      // Fetch receivables
      const receivablesResponse = await financeApi.getAccountsReceivable({ limit: 10 });
      if (receivablesResponse.success) setReceivables(receivablesResponse.data.receivables);

      // Fetch payables - using mock data for now
      setPayables([
        {
          id: 1,
          supplierName: "ABC Suppliers",
          amount: 8000,
          contactPerson: "John Doe",
          phone: "+92-322-6506118",
          email: "john@abcsuppliers.com",
          pendingOrders: 2
        },
        {
          id: 2,
          supplierName: "XYZ Traders",
          amount: 12000,
          contactPerson: "Jane Smith",
          phone: "+92-322-6506118",
          email: "jane@xyztraders.com",
          pendingOrders: 1
        }
      ]);

      // Fetch cash flow - using mock data for now
      setCashFlow([
        {
          type: "inflow",
          amount: 25000,
          reference: "SAL-001",
          description: "Product sales payment",
          date: new Date().toLocaleDateString('en-GB')
        },
        {
          type: "outflow",
          amount: 5000,
          reference: "EXP-001",
          description: "Office supplies purchase",
          date: new Date().toLocaleDateString('en-GB')
        },
        {
          type: "inflow",
          amount: 15000,
          reference: "SAL-002",
          description: "Service payment received",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
        }
      ]);

      // Fetch expenses
      const expensesResponse = await financeApi.getExpenses({ limit: 10 });
      if (expensesResponse.success) setExpenses(expensesResponse.data.expenses);

    } catch (error) {
      console.error("Error fetching finance data:", error);
      toast({
        title: "API Connection Issue",
        description: "Using demo data. Check your API connection for live data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (paymentData: any) => {
    try {
      const res = await fetch(`${apiConfig.getBaseUrl()}/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(paymentData.customerId),
          amount: Number(paymentData.amount),
          paymentMethod: paymentData.paymentMethod,
          reference: paymentData.reference,
          notes: paymentData.notes
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: "Payment Recorded",
          description: result.message || "Payment was recorded successfully.",
        });
        setIsPaymentDialogOpen(false);
        fetchFinanceData(); // Refresh all panels
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to record payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Could not connect to API. Failed to record payment.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 bg-background min-h-screen no-horizontal-scroll">
        <div className="flex items-center justify-center h-64">
          <div className="flex gap-3 items-center text-lg text-muted-foreground">
            <RefreshCw className="animate-spin h-6 w-6" />
            Loading finance data...
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex-1 p-3 space-y-3 bg-background min-h-screen no-horizontal-scroll">
        <div className="flex items-center gap-4 mb-8">
  
          <div>
            <h1 className="text-3xl font-bold text-foreground">Finance Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive financial overview and management</p>
          </div>
        </div>
        <Card className="bg-card shadow-lg border-0">
          <CardContent className="p-12 text-center">
            <div className="bg-orange-100 dark:bg-orange-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">API Connection Issue</h3>
            <p className="text-muted-foreground mb-4">
              Unable to connect to the finance API. The demo data is being shown instead.
            </p>
            <Button onClick={fetchFinanceData} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 bg-background min-h-[calc(100vh-65px)] no-horizontal-scroll">
      {/* Header and Actions: Now stacked responsively */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Finance Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">Comprehensive financial overview and management</p>
              {!apiConnected && (
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:bg-orange-950">
                  Demo Data
                </Badge>
              )}
            </div>
          </div>
        </div>
        {/* Actions group: stack on mobile, inline on md+ */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-full sm:w-32 bg-card shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-card shadow-sm hover:bg-accent w-full sm:w-auto" onClick={fetchFinanceData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <PaymentDialog onSubmit={handleRecordPayment} onClose={() => setIsPaymentDialogOpen(false)} />
          </Dialog>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Revenue */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold">Rs. {overview.revenue.total.toLocaleString()}</p>
                <p className="text-emerald-200 text-xs mt-1">+{overview.revenue.growth}% growth</p>
              </div>
              <div className="bg-emerald-400 bg-opacity-30 p-3 rounded-full">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Profit */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Net Profit</p>
                <p className="text-2xl font-bold">Rs. {overview.profit.net.toLocaleString()}</p>
                <p className="text-blue-200 text-xs mt-1">{overview.profit.margin}% margin</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Cash Flow */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Cash Flow</p>
                <p className="text-2xl font-bold">Rs. {overview.cashFlow.net.toLocaleString()}</p>
                <p className="text-purple-200 text-xs mt-1">Net flow</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Expenses */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Expenses</p>
                <p className="text-2xl font-bold">Rs. {overview.expenses.total.toLocaleString()}</p>
                <p className="text-orange-200 text-xs mt-1">+{overview.expenses.growth}% growth</p>
              </div>
              <div className="bg-orange-400 bg-opacity-30 p-3 rounded-full">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cash Revenue */}
        <Card className="bg-card shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Revenue</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">Rs. {overview.revenue.cash.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Credit Revenue */}
        <Card className="bg-card shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Revenue</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">Rs. {overview.revenue.credit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Outstanding */}
        <Card className="bg-card shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-foreground">Rs. {overview.accountsReceivable.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Accounts Receivable */}
        <Card className="bg-card shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-600" />
              Accounts Receivable
              <Badge className="ml-auto bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                Rs. {overview.accountsReceivable.toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {receivables.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{rec.customerName}</div>
                    <div className="text-sm text-muted-foreground">Invoice {rec.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">Due: {rec.dueDate}</div>
                    {rec.daysOverdue > 0 && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        {rec.daysOverdue} days overdue
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-700 dark:text-blue-400">Rs. {rec.balance.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Paid: Rs. {rec.paidAmount.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Accounts Payable */}
        <Card className="bg-card shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-orange-600" />
              Accounts Payable
              <Badge className="ml-auto bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                Rs. {overview.accountsPayable.toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {payables.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{pay.supplierName}</div>
                    {pay.contactPerson && <div className="text-sm text-muted-foreground">Contact: {pay.contactPerson}</div>}
                    {pay.pendingOrders > 0 && (
                      <div className="text-xs text-muted-foreground">{pay.pendingOrders} pending orders</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-orange-700 dark:text-orange-400">Rs. {pay.amount.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <Card className="bg-card shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-red-600" />
              Recent Expenses
              <Badge className="ml-auto bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                Rs. {overview.expenses.total.toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {expenses.map((exp) => (
                <div key={exp.id} className="p-4 border-b border-border last:border-0 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{exp.description}</div>
                      <div className="text-sm text-muted-foreground">{exp.category}</div>
                      <div className="text-xs text-muted-foreground">
                        {exp.date} • {exp.paymentMethod.replace("_", " ")}
                      </div>
                    </div>
                    <div className="font-semibold text-red-700 dark:text-red-400">Rs. {exp.amount.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Cash Flow */}
        <Card className="bg-card shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-cyan-600" />
              Cash Flow
              <Badge className="ml-auto bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300">
                Rs. {overview.cashFlow.net.toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {cashFlow.map((cf, idx) => (
                <div key={idx} className="p-4 border-b border-border last:border-0 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {cf.type === "inflow" ? (
                        <div className="bg-green-100 dark:bg-green-900 p-1.5 rounded-full">
                          <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="bg-red-100 dark:bg-red-900 p-1.5 rounded-full">
                          <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">{cf.description}</div>
                        <div className="text-xs text-muted-foreground">{cf.date}</div>
                      </div>
                    </div>
                    <div className={`font-semibold ${cf.type === "inflow" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      Rs. {cf.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PaymentDialog = ({ onSubmit, onClose }: { onSubmit: (data: any) => void; onClose: () => void }) => {
  const [formData, setFormData] = useState({
    customerId: "",
    amount: "",
    paymentMethod: "",
    reference: "",
    notes: ""
  });

  return (
    <DialogContent className="max-w-xl bg-card">
      <DialogHeader>
        <DialogTitle className="text-emerald-600 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Record Payment
        </DialogTitle>
      </DialogHeader>
      <form
        onSubmit={e => {
          e.preventDefault();
          onSubmit({
            ...formData,
            customerId: Number(formData.customerId),
            amount: Number(formData.amount)
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerId" className="text-sm font-medium">Customer ID</Label>
            <Input
              id="customerId"
              type="number"
              value={formData.customerId}
              onChange={e => setFormData({ ...formData, customerId: e.target.value })}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">Amount (Rs.)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={value => setFormData({ ...formData, paymentMethod: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="reference" className="text-sm font-medium">Reference</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={e => setFormData({ ...formData, reference: e.target.value })}
            placeholder="Leave blank to auto generate"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes about the payment"
            rows={2}
            className="mt-1"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={!formData.customerId || !formData.amount || !formData.paymentMethod}
          >
            Record Payment
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};

export default Finance;
