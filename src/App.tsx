import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import Quotations from "./pages/Quotations";
import ExpenseTracking from "./pages/ExpenseTracking";
import CustomerInsights from "./pages/CustomerInsights";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import BackupSync from "./pages/BackupSync";
import Calendar from "./pages/Calendar";
import AccountsReceivable from "./pages/AccountsReceivable";
import OutsourcedOrders from "./pages/OutsourcedOrders";
import Profit from "./pages/Profit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="hardware-store-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
              <AppSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto custom-scrollbar">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/profit" element={<Profit />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/outsourced-orders" element={<OutsourcedOrders />} />
                    <Route path="/customers" element={<Customers />} />
                    
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/quotations" element={<Quotations />} />
                    <Route path="/expense-tracking" element={<ExpenseTracking />} />
                    <Route path="/customer-insights" element={<CustomerInsights />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/backup" element={<BackupSync />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/accounts-receivable" element={<AccountsReceivable />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
