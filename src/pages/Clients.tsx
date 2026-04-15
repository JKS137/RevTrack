import { useState, useEffect } from 'react';
import { getClients, addClient, updateClient } from '../services/firestore';
import { Client } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, MoreHorizontal, Edit2, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    billing_currency: 'USD',
    status: 'active'
  });

  useEffect(() => {
    return getClients(setClients);
  }, []);

  const handleAddClient = async () => {
    if (!newClient.name) return toast.error("Client name is required");
    try {
      await addClient({
        ...newClient as Omit<Client, 'id'>,
        created_at: new Date().toISOString()
      });
      setIsAddOpen(false);
      setNewClient({ name: '', email: '', phone: '', address: '', billing_currency: 'USD', status: 'active' });
      toast.success("Client added successfully");
    } catch (error) {
      toast.error("Failed to add client");
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input 
            placeholder="Search clients..." 
            className="pl-10 bg-white" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Client Name</Label>
                <Input id="name" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Billing Currency</Label>
                <Input id="currency" value={newClient.billing_currency} onChange={e => setNewClient({...newClient, billing_currency: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddClient}>Save Client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="w-[300px]">Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} className="hover:bg-neutral-50/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-neutral-900">{client.name}</span>
                      <span className="text-xs text-neutral-400">Added {new Date(client.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Mail className="h-3.5 w-3.5 text-neutral-400" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Phone className="h-3.5 w-3.5 text-neutral-400" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className={cn(
                    "capitalize",
                    client.status === 'active' ? "bg-green-50 text-green-700 border-green-200" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                  )}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{client.billing_currency}</div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-neutral-400 italic">
                  No clients found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
