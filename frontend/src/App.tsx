import { Routes, Route } from "react-router-dom"
import { OverviewPage } from "./pages/OverviewPage"
import { PaymentsPage } from "./pages/PaymentsPage"
import { AtRiskPage } from "./pages/AtRiskPage"
import { CustomersPage } from "./pages/CustomersPage"
import { RecoveriesPage } from "./pages/RecoveriesPage"
import { AgentConsolePage } from "./pages/AgentConsolePage"
import { AuditLogPage } from "./pages/AuditLogPage"
import { ReportsPage } from "./pages/ReportsPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="/at-risk" element={<AtRiskPage />} />
      <Route path="/recoveries" element={<RecoveriesPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/agent" element={<AgentConsolePage />} />
      <Route path="/audit-log" element={<AuditLogPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Routes>
  )
}

export default App
