import { useState, useEffect } from 'react';
import { getProjects, addProject, getClients, getTasks, addTask, updateTask } from '../services/firestore';
import { Project, Client, Task } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Briefcase, CheckCircle2, Clock, MoreVertical, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    client_id: '',
    type: 'hourly',
    status: 'active',
    budget_amount: 0
  });

  useEffect(() => {
    const unsubProjects = getProjects(setProjects);
    const unsubClients = getClients(setClients);
    return () => {
      unsubProjects();
      unsubClients();
    };
  }, []);

  const handleAddProject = async () => {
    if (!newProject.name || !newProject.client_id) return toast.error("Name and Client are required");
    try {
      await addProject({
        ...newProject as Omit<Project, 'id'>,
        logged_hours: 0,
        created_at: new Date().toISOString()
      });
      setIsAddOpen(false);
      setNewProject({ name: '', client_id: '', type: 'hourly', status: 'active', budget_amount: 0 });
      toast.success("Project created successfully");
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="bg-white">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button variant="ghost" size="sm">
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="p-name">Project Name</Label>
                <Input id="p-name" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <Select onValueChange={val => setNewProject({...newProject, client_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Billing Type</Label>
                  <Select onValueChange={val => setNewProject({...newProject, type: val as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="retainer">Retainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget / Rate</Label>
                  <Input id="budget" type="number" value={newProject.budget_amount} onChange={e => setNewProject({...newProject, budget_amount: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} clientName={clients.find(c => c.id === project.client_id)?.name || 'Unknown'} />
        ))}
        {projects.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 rounded-2xl">
            <Briefcase className="h-12 w-12 mb-4 opacity-20" />
            <p className="italic">No projects yet. Create your first project to start tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, clientName }: { project: Project, clientName: string, key?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);

  useEffect(() => {
    if (isTasksOpen) {
      return getTasks(project.id, setTasks);
    }
  }, [isTasksOpen, project.id]);

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-neutral-200 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider mb-2 bg-neutral-50">
              {project.type}
            </Badge>
            <CardTitle className="text-lg group-hover:text-neutral-900 transition-colors">{project.name}</CardTitle>
            <CardDescription className="font-medium text-neutral-500">{clientName}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-neutral-400">Progress</span>
            <span className="text-neutral-900">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neutral-900 transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-neutral-50 rounded-md">
              <Clock className="h-3.5 w-3.5 text-neutral-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 uppercase font-bold">Logged</span>
              <span className="text-sm font-semibold">{project.logged_hours} hrs</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-neutral-50 rounded-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-neutral-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 uppercase font-bold">Tasks</span>
              <span className="text-sm font-semibold">{completedTasks}/{tasks.length}</span>
            </div>
          </div>
        </div>

        <Dialog open={isTasksOpen} onOpenChange={setIsTasksOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full group-hover:bg-neutral-900 group-hover:text-white transition-colors">
              Manage Tasks
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Tasks: {project.name}</DialogTitle>
              <DialogDescription>Manage deliverables and billable items</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto pr-2">
              <AddTaskForm projectId={project.id} />
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("h-6 w-6 p-0 rounded-full border", task.status === 'completed' ? "bg-green-500 border-green-500 text-white" : "border-neutral-200")}
                        onClick={() => updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-medium", task.status === 'completed' && "line-through text-neutral-400")}>{task.title}</span>
                        {task.is_billable && <Badge variant="outline" className="w-fit text-[8px] h-4 px-1 mt-1 text-amber-600 border-amber-200 bg-amber-50">BILLABLE</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && <div className="text-center py-8 text-neutral-400 text-sm italic">No tasks yet</div>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddTaskForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  const handleAddTask = async () => {
    if (!title) return;
    try {
      await addTask({
        project_id: projectId,
        title,
        is_billable: isBillable,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      setTitle('');
      toast.success("Task added");
    } catch (error) {
      toast.error("Failed to add task");
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
      <Input 
        placeholder="Add a new task..." 
        className="bg-white border-none shadow-none focus-visible:ring-0" 
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
      />
      <div className="flex items-center gap-2 px-2 border-l border-neutral-200">
        <Label htmlFor="billable" className="text-[10px] uppercase font-bold text-neutral-400">Billable</Label>
        <input 
          id="billable" 
          type="checkbox" 
          checked={isBillable} 
          onChange={e => setIsBillable(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
        />
      </div>
      <Button size="sm" onClick={handleAddTask}>Add</Button>
    </div>
  );
}
