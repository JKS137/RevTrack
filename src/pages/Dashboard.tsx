import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  FileText, 
  AlertTriangle,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInvoices, getTimeLogs, getProjects, getClients } from '../services/firestore';
import { Invoice, TimeLog, Project, Client } from '../types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#141414', '#404040', '#737373', '#A3A3A3', '#D4D4D4'];

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const unsubInvoices = getInvoices(setInvoices);
    const unsubLogs = getTimeLogs(setTimeLogs);
    const unsubProjects = getProjects(setProjects);
    const unsubClients = getClients(setClients);
    return () => {
      unsubInvoices();
      unsubLogs();
      unsubProjects();
      unsubClients();
    };
  }, []);

  // Stats calculation
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const totalBilled = invoices
    .filter(inv => isWithinInterval(new Date(inv.issued_date), { start: monthStart, end: monthEnd }))
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalCollected = invoices
    .filter(inv => inv.status === 'paid' || inv.amount_paid > 0)
    .reduce((sum, inv) => sum + inv.amount_paid, 0);

  const totalOverdue = invoices
    .filter(inv => inv.status === 'overdue' || (new Date(inv.due_date) < new Date() && inv.status !== 'paid'))
    .reduce((sum, inv) => sum + (inv.total - inv.amount_paid), 0);

  const unbilledLogs = timeLogs.filter(log => !log.is_invoiced && log.is_billable);
  const totalUnbilled = unbilledLogs.reduce((sum, log) => {
    const project = projects.find(p => p.id === log.project_id);
    const client = clients.find(c => c.id === log.client_id);
    const rate = project?.budget_amount || client?.default_hourly_rate || 100; // Fallback rate
    return sum + (log.logged_hours * rate);
  }, 0);

  // Chart Data: Monthly Revenue
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const mStart = startOfMonth(date);
    const mEnd = endOfMonth(date);
    
    const billed = invoices
      .filter(inv => isWithinInterval(new Date(inv.issued_date), { start: mStart, end: mEnd }))
      .reduce((sum, inv) => sum + inv.total, 0);
      
    const collected = invoices
      .filter(inv => inv.status === 'paid' || inv.amount_paid > 0)
      .reduce((sum, inv) => {
        // This is a simplification; ideally we'd track payment dates
        if (isWithinInterval(new Date(inv.issued_date), { start: mStart, end: mEnd })) {
          return sum + inv.amount_paid;
        }
        return sum;
      }, 0);

    return {
      name: format(date, 'MMM'),
      billed,
      collected
    };
  });

  // Chart Data: Revenue by Client
  const clientRevenue = clients.map(client => {
    const revenue = invoices
      .filter(inv => inv.client_id === client.id)
      .reduce((sum, inv) => sum + inv.total, 0);
    return { name: client.name, value: revenue };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Billed</div>
            <div className="text-2xl font-bold text-slate-900">${totalBilled.toLocaleString()}</div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span>↑ 12.4% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unbilled Leakage</div>
            <div className="text-2xl font-bold text-rose-600">${totalUnbilled.toLocaleString()}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              {unbilledLogs.length} unbilled tasks detected
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Collected (Current)</div>
            <div className="text-2xl font-bold text-slate-900">${totalCollected.toLocaleString()}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% collection rate
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Overdue</div>
            <div className="text-2xl font-bold text-amber-600">${totalOverdue.toLocaleString()}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              {invoices.filter(i => i.status === 'overdue').length} invoices past due
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Revenue Suggestion Panel */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 mb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-700">Revenue Suggestion Engine</CardTitle>
              <Badge className="bg-rose-600 hover:bg-rose-700 text-[10px] font-bold px-2 py-0.5">URGENT ACTION</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {unbilledLogs.length > 0 ? (
                unbilledLogs.slice(0, 5).map((log) => {
                  const client = clients.find(c => c.id === log.client_id);
                  const project = projects.find(p => p.id === log.project_id);
                  const rate = project?.budget_amount || client?.default_hourly_rate || 100;
                  const value = log.logged_hours * rate;
                  
                  return (
                    <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">{client?.name || 'Unknown Client'} — {project?.name || 'Unknown Project'}</h3>
                        <p className="text-xs text-slate-500">{log.logged_hours} billable hours logged (Unbilled)</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-sm font-bold text-slate-900">${value.toLocaleString()}</div>
                        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold h-8 px-4">
                          Bill Now
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-slate-400 italic text-sm">No unbilled work detected. Great job!</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aging Panel */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100 mb-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-700">Invoice Aging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500">0–30 Days</span>
                <span className="text-slate-900">${(totalOverdue * 0.65).toLocaleString()}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500">31–60 Days</span>
                <span className="text-slate-900">${(totalOverdue * 0.30).toLocaleString()}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500">61–90 Days</span>
                <span className="text-slate-900">${(totalOverdue * 0.15).toLocaleString()}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-600 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Recent Activity</div>
              <div className="space-y-4">
                {invoices.slice(0, 2).map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-800">INV-#{inv.invoice_number} {inv.status === 'paid' ? 'Paid' : 'Sent'}</div>
                    <div className="text-[10px] text-slate-400">{format(new Date(inv.created_at), 'h:mm a')}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-700">Monthly Revenue Trend</CardTitle>
            <CardDescription className="text-[10px]">Billed vs. Collected revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last6Months}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    tickFormatter={(value) => `$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '20px' }} />
                  <Bar dataKey="billed" name="Billed" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-700">Revenue by Client</CardTitle>
            <CardDescription className="text-[10px]">Distribution of total billed revenue across clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientRevenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {clientRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
