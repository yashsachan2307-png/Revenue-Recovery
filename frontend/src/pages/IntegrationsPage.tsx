import { AppShell } from "../layouts/AppShell"
import { Panel, PanelHeader } from "../components/ui/Panel"
import { Webhook, Mail, MessageSquare, CreditCard, Link2, Link2Off, FlaskConical } from "lucide-react"

export function IntegrationsPage() {
  const integrations = [
    {
      id: "razorpay",
      name: "Razorpay",
      description: "Primary payment gateway for capturing charges and executing refunds.",
      icon: <CreditCard className="h-6 w-6 text-[var(--color-ink)]" />,
      status: "connected"
    },
    {
      id: "sendgrid",
      name: "SendGrid Email",
      description: "Automated email provider for dunning campaigns and customer communication.",
      icon: <Mail className="h-6 w-6 text-[var(--color-ink)]" />,
      status: "test"
    },
    {
      id: "twilio",
      name: "Twilio SMS",
      description: "SMS delivery service for urgent high-value payment recovery alerts.",
      icon: <MessageSquare className="h-6 w-6 text-[var(--color-ink)]" />,
      status: "disconnected"
    },
    {
      id: "webhooks",
      name: "Custom Webhooks",
      description: "Receive realtime payment.success and payment.failed events from external systems.",
      icon: <Webhook className="h-6 w-6 text-[var(--color-ink)]" />,
      status: "connected"
    }
  ];

  return (
    <AppShell title="Integrations">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col gap-2 border-b border-[var(--color-border-subtle)] pb-4">
          <h1 className="text-xl font-bold uppercase tracking-widest text-[var(--color-ink)]">System Integrations</h1>
          <p className="text-sm opacity-70">
            Manage connections to external payment gateways, communication providers, and webhook endpoints.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Panel key={integration.id} className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-[var(--color-ink)]/5 flex items-center justify-center border border-[var(--color-border-subtle)]">
                    {integration.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold uppercase tracking-wider">{integration.name}</span>
                    <span className="text-xs font-mono opacity-60">ID: {integration.id.toUpperCase()}</span>
                  </div>
                </div>
                {integration.status === 'connected' && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-success)]/10 text-[var(--color-success)] text-[10px] font-bold uppercase border border-[var(--color-success)]/20">
                    <Link2 className="h-3 w-3" /> Connected
                  </div>
                )}
                {integration.status === 'disconnected' && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-failure)]/10 text-[var(--color-failure)] text-[10px] font-bold uppercase border border-[var(--color-failure)]/20">
                    <Link2Off className="h-3 w-3" /> Disconnected
                  </div>
                )}
                {integration.status === 'test' && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-warning)]/10 text-[var(--color-warning)] text-[10px] font-bold uppercase border border-[var(--color-warning)]/20">
                    <FlaskConical className="h-3 w-3" /> Test Mode
                  </div>
                )}
              </div>
              <p className="text-sm opacity-80 mt-2">
                {integration.description}
              </p>
              <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex gap-4">
                <button className="text-xs font-bold uppercase hover:underline opacity-80">Configure</button>
                <button className="text-xs font-bold uppercase hover:underline opacity-80">View Logs</button>
              </div>
            </Panel>
          ))}
        </div>

        <div className="mt-8">
          <Panel className="border border-[var(--color-border-subtle)] bg-[var(--color-ink)]/5">
            <PanelHeader>Webhook Simulator (Demo)</PanelHeader>
            <div className="mt-4 text-sm font-mono flex flex-col gap-4 opacity-80">
              <p>To simulate a live payment failure webhook in demo mode, send a POST request to:</p>
              <div className="bg-[var(--color-paper)] p-3 border border-[var(--color-border-subtle)] overflow-x-auto">
                <code className="whitespace-pre">
{`curl -X POST http://localhost:3001/api/webhooks/payment \\
-H "Content-Type: application/json" \\
-d '{
  "event": "payment.failed",
  "payload": {
    "amount": 25000,
    "currency": "INR",
    "customer_id": "CUS-DEMO123",
    "failure_reason": "INSUFFICIENT_FUNDS"
  }
}'`}
                </code>
              </div>
            </div>
          </Panel>
        </div>

      </div>
    </AppShell>
  )
}
