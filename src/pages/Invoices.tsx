import { useState, useEffect, useMemo } from 'react';
import { getInvoices, getClients, getTimeLogs, createInvoice, getProjects } from '../services/firestore';
import { Invoice, Client, TimeLog, Project, InvoiceLineItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Search, Filter, Download, Send, CheckCircle2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { auth } from '../firebase';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [unbilledLogs, setUnbilledLogs] = useState<TimeLog[]>([]);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'issued_date',
    direction: 'desc'
  });
  
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    issued_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    tax_amount: 0,
    notes: ''
  });

  useEffect(() => {
    const unsubInvoices = getInvoices(setInvoices);
    const unsubClients = getClients(setClients);
    const unsubLogs = getTimeLogs(setTimeLogs);
    const unsubProjects = getProjects(setProjects);
    return () => {
      unsubInvoices();
      unsubClients();
      unsubLogs();
      unsubProjects();
    };
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      setUnbilledLogs(timeLogs.filter(log => log.client_id === selectedClientId && !log.is_invoiced && log.is_billable));
    } else {
      setUnbilledLogs([]);
    }
  }, [selectedClientId, timeLogs]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedInvoices = useMemo(() => {
    let items = [...invoices];
    
    if (search) {
      items = items.filter(inv => {
        const clientName = clients.find(c => c.id === inv.client_id)?.name || '';
        return inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
               clientName.toLowerCase().includes(search.toLowerCase());
      });
    }

    if (sortConfig) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'client_name') {
          aValue = clients.find(c => c.id === a.client_id)?.name || '';
          bValue = clients.find(c => c.id === b.client_id)?.name || '';
        } else {
          aValue = (a as any)[sortConfig.key];
          bValue = (b as any)[sortConfig.key];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return items;
  }, [invoices, search, sortConfig, clients]);

  const handleCreateInvoice = async () => {
    if (!selectedClientId || unbilledLogs.length === 0) {
      return toast.error("Please select a client with unbilled work");
    }

    const client = clients.find(c => c.id === selectedClientId);
    
    // Calculate line items
    const lineItems: Omit<InvoiceLineItem, 'id'>[] = unbilledLogs.map(log => {
      const project = projects.find(p => p.id === log.project_id);
      const rate = project?.budget_amount || client?.default_hourly_rate || 100;
      return {
        invoice_id: '', // Will be set by service
        description: `${project?.name || 'Project'}: ${log.description || 'Work logged'}`,
        quantity: log.logged_hours,
        unit_rate: rate,
        subtotal: log.logged_hours * rate,
        source_type: 'time_log',
        source_id: log.id
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + (newInvoice.tax_amount || 0);

    try {
      await createInvoice(
        {
          ...newInvoice as Omit<Invoice, 'id'>,
          client_id: selectedClientId,
          status: 'draft',
          subtotal,
          total,
          amount_paid: 0,
          created_by: auth.currentUser?.uid || '',
          created_at: new Date().toISOString()
        },
        lineItems,
        unbilledLogs.map(l => l.id)
      );
      
      setIsAddOpen(false);
      setSelectedClientId('');
      toast.success("Invoice created successfully");
    } catch (error) {
      toast.error("Failed to create invoice");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input 
            placeholder="Search invoices..." 
            className="pl-10 bg-white" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label>Select Client</Label>
                <Select onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client to bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => {
                      const unbilledCount = timeLogs.filter(l => l.client_id === c.id && !l.is_invoiced && l.is_billable).length;
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {unbilledCount > 0 ? `(${unbilledCount} unbilled items)` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3">Unbilled Work Summary</h4>
                    <div className="space-y-2">
                      {unbilledLogs.map(log => (
                        <div key={log.id} className="flex justify-between text-sm">
                          <span className="text-neutral-600">{projects.find(p => p.id === log.project_id)?.name} • {log.logged_hours} hrs</span>
                          <span className="font-medium">${(log.logged_hours * (projects.find(p => p.id === log.project_id)?.budget_amount || clients.find(c => c.id === selectedClientId)?.default_hourly_rate || 100)).toLocaleString()}</span>
                        </div>
                      ))}
                      {unbilledLogs.length === 0 && <div className="text-amber-600 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /> No unbilled work for this client</div>}
                    </div>
                    {unbilledLogs.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between font-bold">
                        <span>Total Estimated</span>
                        <span>${unbilledLogs.reduce((sum, log) => sum + (log.logged_hours * (projects.find(p => p.id === log.project_id)?.budget_amount || clients.find(c => c.id === selectedClientId)?.default_hourly_rate || 100)), 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Invoice Number</Label>
                      <Input value={newInvoice.invoice_number} onChange={e => setNewInvoice({...newInvoice, invoice_number: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={newInvoice.due_date} onChange={e => setNewInvoice({...newInvoice, due_date: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateInvoice} disabled={!selectedClientId || unbilledLogs.length === 0}>Generate Invoice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('invoice_number')}>
                <div className="flex items-center">
                  Invoice #
                  <SortIcon column="invoice_number" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('client_name')}>
                <div className="flex items-center">
                  Client
                  <SortIcon column="client_name" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('issued_date')}>
                <div className="flex items-center">
                  Issued Date
                  <SortIcon column="issued_date" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('due_date')}>
                <div className="flex items-center">
                  Due Date
                  <SortIcon column="due_date" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('total')}>
                <div className="flex items-center">
                  Amount
                  <SortIcon column="total" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('status')}>
                <div className="flex items-center">
                  Status
                  <SortIcon column="status" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-neutral-50/50 transition-colors">
                <TableCell className="font-bold text-neutral-900">{inv.invoice_number}</TableCell>
                <TableCell className="font-medium">{clients.find(c => c.id === inv.client_id)?.name || '...'}</TableCell>
                <TableCell className="text-neutral-500">{format(new Date(inv.issued_date), 'MMM d, yyyy')}</TableCell>
                <TableCell className={cn(
                  "text-neutral-500",
                  new Date(inv.due_date) < new Date() && inv.status !== 'paid' && "text-red-600 font-medium"
                )}>
                  {format(new Date(inv.due_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold">${inv.total.toLocaleString()}</span>
                    {inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                      <span className="text-[10px] text-neutral-400">Paid: ${inv.amount_paid.toLocaleString()}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(
                    "capitalize border",
                    inv.status === 'paid' ? "bg-green-50 text-green-700 border-green-200" :
                    inv.status === 'sent' ? "bg-blue-50 text-blue-700 border-blue-200" :
                    inv.status === 'overdue' ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-neutral-100 text-neutral-600 border-neutral-200"
                  )}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sortedInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-neutral-400 italic">
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
