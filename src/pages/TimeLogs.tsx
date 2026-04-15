import { useState, useEffect } from 'react';
import { getTimeLogs, addTimeLog, getProjects, getTasks, getClients } from '../services/firestore';
import { TimeLog, Project, Task, Client } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, Calendar as CalendarIcon, Filter, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { auth } from '../firebase';

export default function TimeLogs() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [newLog, setNewLog] = useState<Partial<TimeLog>>({
    project_id: '',
    task_id: '',
    logged_hours: 0,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    is_billable: true
  });

  useEffect(() => {
    const unsubLogs = getTimeLogs(setLogs);
    const unsubProjects = getProjects(setProjects);
    const unsubClients = getClients(setClients);
    return () => {
      unsubLogs();
      unsubProjects();
      unsubClients();
    };
  }, []);

  // Fetch tasks when project changes
  useEffect(() => {
    if (newLog.project_id) {
      return getTasks(newLog.project_id, setTasks);
    }
  }, [newLog.project_id]);

  const handleAddLog = async () => {
    if (!newLog.project_id || !newLog.task_id || !newLog.logged_hours) {
      return toast.error("Please fill in all required fields");
    }
    
    const project = projects.find(p => p.id === newLog.project_id);
    
    try {
      await addTimeLog({
        ...newLog as Omit<TimeLog, 'id'>,
        client_id: project?.client_id || '',
        user_id: auth.currentUser?.uid || '',
        is_invoiced: false
      });
      setIsAddOpen(false);
      setNewLog({
        project_id: '',
        task_id: '',
        logged_hours: 0,
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        is_billable: true
      });
      toast.success("Time logged successfully");
    } catch (error) {
      toast.error("Failed to log time");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="bg-white">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Log Time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Work Time</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Project</Label>
                  <Select onValueChange={val => setNewLog({...newLog, project_id: val, task_id: ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Task</Label>
                  <Select 
                    disabled={!newLog.project_id} 
                    onValueChange={val => {
                      const task = tasks.find(t => t.id === val);
                      setNewLog({...newLog, task_id: val, is_billable: task?.is_billable ?? true});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Hours</Label>
                  <Input 
                    type="number" 
                    step="0.25" 
                    placeholder="0.00" 
                    value={newLog.logged_hours || ''} 
                    onChange={e => setNewLog({...newLog, logged_hours: Number(e.target.value)})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newLog.date} 
                    onChange={e => setNewLog({...newLog, date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description (Optional)</Label>
                <Input 
                  placeholder="What did you work on?" 
                  value={newLog.description} 
                  onChange={e => setNewLog({...newLog, description: e.target.value})} 
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="billable-log" 
                  checked={newLog.is_billable} 
                  onChange={e => setNewLog({...newLog, is_billable: e.target.checked})}
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <Label htmlFor="billable-log">Billable work</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLog}>Save Log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client & Project</TableHead>
              <TableHead>Task & Description</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const project = projects.find(p => p.id === log.project_id);
              const client = clients.find(c => c.id === log.client_id);
              const taskTitle = tasks.find(t => t.id === log.task_id)?.title || 'Unknown Task';
              
              return (
                <TableRow key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                  <TableCell className="font-medium text-neutral-600">
                    {format(new Date(log.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-neutral-900">{client?.name || '...'}</span>
                      <span className="text-xs text-neutral-500">{project?.name || '...'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{taskTitle}</span>
                      <span className="text-xs text-neutral-400 truncate max-w-[200px]">{log.description || 'No description'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{log.logged_hours}</span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">HRS</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {log.is_invoiced ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">INVOICED</Badge>
                      ) : log.is_billable ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">UNBILLED</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-neutral-100 text-neutral-500 border-neutral-200 text-[10px]">NON-BILLABLE</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={log.is_invoiced}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-neutral-400 italic">
                  No time logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
