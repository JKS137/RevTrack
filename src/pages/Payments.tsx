import { useState, useEffect, useMemo } from 'react';
import { getPayments, getInvoices, addPayment, getClients } from '../services/firestore';
import { Payment, Invoice, Client } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CreditCard, Search, Calendar as CalendarIcon, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { auth } from '../firebase';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'payment_date',
    direction: 'desc'
  });
  
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    invoice_id: '',
    amount: 0,
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'Bank Transfer',
    notes: ''
  });

  useEffect(() => {
    const unsubPayments = getPayments(setPayments);
    const unsubInvoices = getInvoices(setInvoices);
    const unsubClients = getClients(setClients);
    return () => {
      unsubPayments();
      unsubInvoices();
      unsubClients();
    };
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPayments = useMemo(() => {
    let items = [...payments];
    
    if (search) {
      items = items.filter(p => {
        const invoice = invoices.find(i => i.id === p.invoice_id);
        const client = clients.find(c => c.id === invoice?.client_id);
        return invoice?.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
               client?.name.toLowerCase().includes(search.toLowerCase());
      });
    }

    if (sortConfig) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'invoice_number') {
          aValue = invoices.find(i => i.id === a.invoice_id)?.invoice_number || '';
          bValue = invoices.find(i => i.id === b.invoice_id)?.invoice_number || '';
        } else if (sortConfig.key === 'client_name') {
          const invA = invoices.find(i => i.id === a.invoice_id);
          const invB = invoices.find(i => i.id === b.invoice_id);
          aValue = clients.find(c => c.id === invA?.client_id)?.name || '';
          bValue = clients.find(c => c.id === invB?.client_id)?.name || '';
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
  }, [payments, search, sortConfig, invoices, clients]);

  const handleAddPayment = async () => {
    if (!newPayment.invoice_id || !newPayment.amount) {
      return toast.error("Please select an invoice and enter amount");
    }

    try {
      await addPayment({
        ...newPayment as Omit<Payment, 'id'>,
        recorded_by: auth.currentUser?.uid || '',
      });
      setIsAddOpen(false);
      setNewPayment({
        invoice_id: '',
        amount: 0,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'Bank Transfer',
        notes: ''
      });
      toast.success("Payment recorded successfully");
    } catch (error) {
      toast.error("Failed to record payment");
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
            placeholder="Search payments..." 
            className="pl-10 bg-white" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Invoice</Label>
                <Select onValueChange={val => {
                  const inv = invoices.find(i => i.id === val);
                  setNewPayment({...newPayment, invoice_id: val, amount: (inv?.total || 0) - (inv?.amount_paid || 0)});
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.filter(i => i.status !== 'paid').map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number} - {clients.find(c => c.id === i.client_id)?.name} (${(i.total - i.amount_paid).toLocaleString()} due)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Amount</Label>
                  <Input 
                    type="number" 
                    value={newPayment.amount || ''} 
                    onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newPayment.payment_date} 
                    onChange={e => setNewPayment({...newPayment, payment_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select onValueChange={val => setNewPayment({...newPayment, payment_method: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Reference / Notes</Label>
                <Input 
                  placeholder="Check #, Transaction ID, etc." 
                  value={newPayment.notes} 
                  onChange={e => setNewPayment({...newPayment, notes: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddPayment}>Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('payment_date')}>
                <div className="flex items-center">
                  Date
                  <SortIcon column="payment_date" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('invoice_number')}>
                <div className="flex items-center">
                  Invoice
                  <SortIcon column="invoice_number" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('client_name')}>
                <div className="flex items-center">
                  Client
                  <SortIcon column="client_name" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('payment_method')}>
                <div className="flex items-center">
                  Method
                  <SortIcon column="payment_method" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-neutral-900" onClick={() => handleSort('amount')}>
                <div className="flex items-center">
                  Amount
                  <SortIcon column="amount" />
                </div>
              </TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.map((payment) => {
              const invoice = invoices.find(i => i.id === payment.invoice_id);
              const client = clients.find(c => c.id === invoice?.client_id);
              
              return (
                <TableRow key={payment.id} className="hover:bg-neutral-50/50 transition-colors">
                  <TableCell className="text-neutral-500">{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-bold">{invoice?.invoice_number || '...'}</TableCell>
                  <TableCell className="font-medium">{client?.name || '...'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                      {payment.payment_method}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-green-600">${payment.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-green-600 text-xs font-bold uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmed
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {sortedPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-neutral-400 italic">
                  No payments recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
