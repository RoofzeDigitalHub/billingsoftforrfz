import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./components/auth/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Dashboard from "./pages/dashboard/Dashboard";
import CreateInvoice from "./pages/invoices/CreateInvoice";
import InvoicesList from "./pages/invoices/InvoicesList";
import InvoiceDetail from "./pages/invoices/InvoiceDetail";
import ClientMaster from "./pages/clients/ClientMaster";
import CreateProposal from "./pages/proposals/CreateProposal";
import ProposalsList from "./pages/proposals/ProposalsList";
import ProposalDetail from "./pages/proposals/ProposalDetail";
import ExpensesList from "./pages/expenses/ExpensesList";
import ClientLedgerReport from "./pages/reports/ClientLedgerReport";
import IncomeExpenseReport from "./pages/reports/IncomeExpenseReport";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default URL */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Create Invoice */}
        <Route
          path="/dashboard/invoices/create"
          element={
            <ProtectedRoute>
              <CreateInvoice />
            </ProtectedRoute>
          }
        />

        {/* Invoice List */}
        <Route
          path="/dashboard/invoices"
          element={
            <ProtectedRoute>
              <InvoicesList />
            </ProtectedRoute>
          }
        />

        {/* Invoice Detail / Print view */}
        <Route
          path="/dashboard/invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetail />
            </ProtectedRoute>
          }
        />

        {/* Proposals */}
        <Route
          path="/dashboard/proposals"
          element={
            <ProtectedRoute>
              <ProposalsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/proposals/create"
          element={
            <ProtectedRoute>
              <CreateProposal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/proposals/:id/edit"
          element={
            <ProtectedRoute>
              <CreateProposal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/proposals/:id"
          element={
            <ProtectedRoute>
              <ProposalDetail />
            </ProtectedRoute>
          }
        />

        {/* Client Master */}
        <Route
          path="/dashboard/clients"
          element={
            <ProtectedRoute>
              <ClientMaster />
            </ProtectedRoute>
          }
        />

        {/* Expenses & Transactions */}
        <Route
          path="/dashboard/expenses"
          element={
            <ProtectedRoute>
              <ExpensesList />
            </ProtectedRoute>
          }
        />

        {/* Reports: Client Ledger */}
        <Route
          path="/dashboard/reports/client-ledger"
          element={
            <ProtectedRoute>
              <ClientLedgerReport />
            </ProtectedRoute>
          }
        />

        {/* Reports: Income vs Expense */}
        <Route
          path="/dashboard/reports/income-expense"
          element={
            <ProtectedRoute>
              <IncomeExpenseReport />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;