
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, Phone, AlertCircle, DollarSign, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { financeApi, type AccountsReceivable as AccountsReceivableType } from "@/services/financeApi";

const AccountsReceivable = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [receivables, setReceivables] = useState<AccountsReceivableType[]>([]);
  const [summary, setSummary] = useState({
    totalReceivables: 0,
    overdueAmount: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    fetchReceivables();
  }, [filterStatus]);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      setApiConnected(false);
      const params: any = { limit: 50 };
      
      if (filterStatus === "overdue") {
        params.overdue = true;
      }

      const response = await financeApi.getAccountsReceivable(params);
      
      if (response.success) {
        setApiConnected(true);
        
        // IMPROVED: More robust deduplication using Set to track unique invoice numbers
        const seenInvoices = new Set();
        const uniqueReceivables: AccountsReceivableType[] = [];
        
        response.data.receivables.forEach((item) => {
          // Only include items with outstanding balance
          if (item.balance > 0) {
            // Create a unique identifier based on invoice number only
            const uniqueKey = item.invoiceNumber;
            
            // If we haven't seen this invoice number before, add it
            if (!seenInvoices.has(uniqueKey)) {
              seenInvoices.add(uniqueKey);
              uniqueReceivables.push(item);
            }
          }
        });
        
        console.log('Original receivables:', response.data.receivables.length);
        console.log('Unique receivables after deduplication:', uniqueReceivables.length);
        console.log('Filtered receivables:', uniqueReceivables);
        
        setReceivables(uniqueReceivables);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching receivables:', error);
      toast({
        title: "API Connection Issue",
        description: "Using demo data. Check your API connection for live data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format dates safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    
    const date = new Date(dateString);
    // Check if date is valid and not the Unix epoch
    if (isNaN(date.getTime()) || dateString === "1970-01-01" || date.getFullYear() === 1970) {
      return "No due date";
    }
    
    return date.toLocaleDateString();
  };

  const handleCallCustomer = (customer: AccountsReceivableType) => {
    toast({
      title: "Calling Customer",
      description: `Initiating call to ${customer.customerName}`,
    });
  };

  const handleMarkPaid = async (customer: AccountsReceivableType) => {
    try {
      console.log('Marking payment for customer:', customer.customerId, 'Invoice:', customer.invoiceNumber);
      
      const response = await financeApi.recordPayment({
        customerId: customer.customerId,
        amount: customer.balance,
        paymentMethod: 'cash',
        reference: `Payment for ${customer.invoiceNumber}`,
        notes: `Full payment for invoice ${customer.invoiceNumber}`
      });

      if (response.success) {
        toast({
          title: "Payment Recorded",
          description: `Rs. ${customer.balance.toLocaleString()} payment marked as received from ${customer.customerName}`,
        });
        
        // Remove the specific item from the local state instead of refetching
        setReceivables(prev => prev.filter(item => 
          item.invoiceNumber !== customer.invoiceNumber
        ));
        
        // Update summary
        setSummary(prev => ({
          ...prev,
          totalReceivables: prev.totalReceivables - customer.balance,
          overdueAmount: customer.daysOverdue > 0 ? prev.overdueAmount - customer.balance : prev.overdueAmount,
          overdueCount: customer.daysOverdue > 0 ? prev.overdueCount - 1 : prev.overdueCount
        }));
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const filteredReceivables = receivables.filter(item => {
    const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "overdue") return matchesSearch && item.daysOverdue > 0;
    if (filterStatus === "due_today") {
      const today = new Date().toISOString().split('T')[0];
      return matchesSearch && item.dueDate === today;
    }
    if (filterStatus === "upcoming") return matchesSearch && item.daysOverdue < 0;
    
    return matchesSearch;
  });

  const totalDueToday = receivables
    .filter(item => {
      const today = new Date().toISOString().split('T')[0];
      return item.dueDate === today;
    })
    .reduce((sum, item) => sum + item.balance, 0);

  const getStatusBadge = (item: AccountsReceivableType) => {
    if (item.daysOverdue > 0) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        {item.daysOverdue} days overdue
      </Badge>;
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (item.dueDate === today) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
        Due Today
      </Badge>;
    }
    
    if (item.daysOverdue < 0) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">
        Due in {Math.abs(item.daysOverdue)} days
      </Badge>;
    }

    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">
      {item.status}
    </Badge>;
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-6 min-h-screen bg-slate-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading accounts receivable...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 md:p-6 space-y-3 min-h-[calc(100vh-65px)]">
      <div className="flex items-center gap-4 mb-8">

        <div>
          <h1 className="text-3xl font-bold text-gray-500">Accounts Receivable</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-300">Track customer payments and outstanding invoices</p>
            {!apiConnected && (
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                Demo Data
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Total Overdue</p>
                <p className="text-2xl font-bold text-red-600">Rs. {summary.overdueAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Due Today</p>
                <p className="text-2xl font-bold text-yellow-600">Rs. {totalDueToday.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Total Outstanding</p>
                <p className="text-2xl font-bold text-blue-600">Rs. {summary.totalReceivables.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Outstanding Invoices
            </CardTitle>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search customers or invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="due_today">Due Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 custom-scrollbar max-h-[600px] overflow-y-auto">
            {filteredReceivables.map((item) => (
              <div key={item.invoiceNumber} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium text-gray-300">{item.customerName}</h3>
                    <p className="text-sm text-gray-300">Invoice: {item.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">Due: {formatDate(item.dueDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-100">Rs. {item.balance.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Paid: Rs. {item.paidAmount.toLocaleString()}</p>
                    {getStatusBadge(item)}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCallCustomer(item)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMarkPaid(item)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Mark Paid
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredReceivables.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No receivables found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsReceivable;
