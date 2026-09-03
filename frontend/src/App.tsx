import { Routes, Route } from "react-router-dom"
import { AuthProvider } from "./lib/AuthContext"
import { ProtectedRoute } from "./components/ProtectedRoute"

import { LoginPage } from "./pages/auth/LoginPage"
import { SignUpPage } from "./pages/auth/SignUpPage"
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage"

import { OverviewPage } from "./pages/OverviewPage"
import { PaymentsPage } from "./pages/PaymentsPage"
import { AtRiskPage } from "./pages/AtRiskPage"
import { CustomersPage } from "./pages/CustomersPage"
import { RecoveriesPage } from "./pages/RecoveriesPage"
import { AgentConsolePage } from "./pages/AgentConsolePage"
import { AuditLogPage } from "./pages/AuditLogPage"
import { ReportsPage } from "./pages/ReportsPage"
import { EvaluationsPage } from "./pages/EvaluationsPage"
import { IntegrationsPage } from "./pages/IntegrationsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { WorkflowsPage } from "./pages/WorkflowsPage"

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/at-risk" element={<AtRiskPage />} />
          <Route path="/recoveries" element={<RecoveriesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/agent" element={<AgentConsolePage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
