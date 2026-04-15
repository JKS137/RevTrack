export type UserRole = 'admin' | 'member';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  billing_currency: string;
  default_hourly_rate?: number;
  status: 'active' | 'archived';
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  type: 'hourly' | 'fixed' | 'retainer';
  status: 'active' | 'on_hold' | 'completed';
  estimated_hours?: number;
  logged_hours: number;
  budget_amount?: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  is_billable: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  created_at: string;
  completed_at?: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  project_id: string;
  client_id: string;
  user_id: string;
  logged_hours: number;
  is_billable: boolean;
  description?: string;
  date: string;
  is_invoiced: boolean;
  invoice_id?: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issued_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_rate: number;
  subtotal: number;
  source_type: 'time_log' | 'task' | 'manual';
  source_id?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  recorded_by: string;
}
