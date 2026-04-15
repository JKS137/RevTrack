import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Clock, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserProfile } from '../types';

interface SidebarItemProps {
  to: string;
  icon: any;
  label: string;
  active?: boolean;
  key?: string;
}

function SidebarItem({ to, icon: Icon, label, active }: SidebarItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-6 py-3 transition-all duration-200 group text-sm font-medium",
        active 
          ? "bg-slate-800 text-white border-l-3 border-indigo-600" 
          : "text-slate-400 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500 group-hover:text-white")} />
      <span>{label}</span>
      {active && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
    </Link>
  );
}

export function Layout({ children, user, onLogout }: { children: ReactNode, user: UserProfile, onLogout: () => void }) {
  const location = useLocation();
  const isAdmin = user.role === 'admin';

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: true, section: "Main" },
    { to: "/clients", icon: Users, label: "Clients", adminOnly: true, section: "Structure" },
    { to: "/projects", icon: Briefcase, label: "Projects", adminOnly: false, section: "Structure" },
    { to: "/time-logs", icon: Clock, label: "Time Logs", adminOnly: false, section: "Main" },
    { to: "/invoices", icon: FileText, label: "Invoices", adminOnly: true, section: "Invoicing" },
    { to: "/payments", icon: CreditCard, label: "Payments", adminOnly: true, section: "Invoicing" },
    { to: "/reports", icon: BarChart3, label: "Reports", adminOnly: true, section: "Intelligence" },
  ];

  const sections = ["Main", "Structure", "Invoicing", "Intelligence"];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="px-6 py-8 flex items-center gap-2">
          <div className="text-xl font-bold tracking-tighter">
            REV<span className="text-indigo-600">TRACK</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col">
          {sections.map(section => {
            const items = navItems.filter(i => i.section === section && (!i.adminOnly || isAdmin));
            if (items.length === 0) return null;
            
            return (
              <div key={section} className="mb-4">
                <div className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {section}
                </div>
                {items.map((item) => (
                  <SidebarItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    active={location.pathname === item.to}
                  />
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-xs truncate">{user.name}</span>
              <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-500 hover:text-white hover:bg-slate-800 text-xs h-9"
            onClick={onLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-8 justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-900">
            {navItems.find(i => i.to === location.pathname)?.label || "RevTrack"}
          </h1>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 text-[10px] font-bold uppercase tracking-wider">
                <AlertCircle className="h-3 w-3" />
                <span>3 Revenue Leaks</span>
              </div>
            )}
            <Button variant="outline" size="sm" className="rounded-md border-slate-200 text-slate-600 h-8 text-xs font-semibold">
              <Settings className="h-3.5 w-3.5 mr-2" />
              Settings
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-semibold px-4">
              + Create Invoice
            </Button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
