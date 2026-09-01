import { Routes, Route } from "react-router-dom"
import { OverviewPage } from "./pages/OverviewPage"
import { PaymentsPage } from "./pages/PaymentsPage"
import { AtRiskPage } from "./pages/AtRiskPage"
import { CustomersPage } from "./pages/CustomersPage"
import { RecoveriesPage } from "./pages/RecoveriesPage"
// Import other pages as they are created

function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="/at-risk" element={<AtRiskPage />} />
      <Route path="/recoveries" element={<RecoveriesPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/agent" element={<div className="p-8">Agent Settings (Phase 3)</div>} />
      <Route path="/audit-log" element={<div className="p-8">Audit Log (Phase 3)</div>} />
      <Route path="/evaluation" element={<div className="p-8">Evaluation (Phase 3)</div>} />
    </Routes>
  )
}

export default App
