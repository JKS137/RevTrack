import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  getDoc,
  Timestamp,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Client, 
  Project, 
  Task, 
  TimeLog, 
  Invoice, 
  InvoiceLineItem, 
  Payment,
  UserProfile
} from '../types';

// Error handling helper
const handleFirestoreError = (error: any, operation: string, path: string) => {
  console.error(`Firestore ${operation} error at ${path}:`, error);
  throw error;
};

// Users
export const getUsers = (callback: (users: UserProfile[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
  });
};

// Clients
export const getClients = (callback: (clients: Client[]) => void) => {
  return onSnapshot(query(collection(db, 'clients'), orderBy('name')), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
  });
};

export const addClient = async (client: Omit<Client, 'id'>) => {
  return addDoc(collection(db, 'clients'), client);
};

export const updateClient = async (id: string, client: Partial<Client>) => {
  return updateDoc(doc(db, 'clients', id), client);
};

// Projects
export const getProjects = (callback: (projects: Project[]) => void) => {
  return onSnapshot(query(collection(db, 'projects'), orderBy('created_at', 'desc')), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
  });
};

export const addProject = async (project: Omit<Project, 'id'>) => {
  return addDoc(collection(db, 'projects'), project);
};

// Tasks
export const getTasks = (projectId: string, callback: (tasks: Task[]) => void) => {
  return onSnapshot(query(collection(db, 'tasks'), where('project_id', '==', projectId), orderBy('created_at', 'desc')), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
  });
};

export const addTask = async (task: Omit<Task, 'id'>) => {
  return addDoc(collection(db, 'tasks'), task);
};

export const updateTask = async (id: string, task: Partial<Task>) => {
  return updateDoc(doc(db, 'tasks', id), task);
};

// Time Logs
export const getTimeLogs = (callback: (logs: TimeLog[]) => void, filters?: { userId?: string, is_invoiced?: boolean }) => {
  let q = query(collection(db, 'timeLogs'), orderBy('date', 'desc'));
  
  if (filters?.userId) {
    q = query(q, where('user_id', '==', filters.userId));
  }
  if (filters?.is_invoiced !== undefined) {
    q = query(q, where('is_invoiced', '==', filters.is_invoiced));
  }

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog)));
  });
};

export const addTimeLog = async (log: Omit<TimeLog, 'id'>) => {
  return addDoc(collection(db, 'timeLogs'), log);
};

// Invoices
export const getInvoices = (callback: (invoices: Invoice[]) => void) => {
  return onSnapshot(query(collection(db, 'invoices'), orderBy('created_at', 'desc')), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
  });
};

export const createInvoice = async (invoice: Omit<Invoice, 'id'>, lineItems: Omit<InvoiceLineItem, 'id'>[], logIds: string[]) => {
  const invoiceRef = await addDoc(collection(db, 'invoices'), invoice);
  
  // Add line items
  for (const item of lineItems) {
    await addDoc(collection(db, 'invoiceLineItems'), { ...item, invoice_id: invoiceRef.id });
  }

  // Update time logs as invoiced
  for (const logId of logIds) {
    await updateDoc(doc(db, 'timeLogs', logId), { is_invoiced: true, invoice_id: invoiceRef.id });
  }

  return invoiceRef.id;
};

// Payments
export const getPayments = (callback: (payments: Payment[]) => void) => {
  return onSnapshot(query(collection(db, 'payments'), orderBy('payment_date', 'desc')), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
  });
};

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
  const paymentRef = await addDoc(collection(db, 'payments'), payment);
  
  // Update invoice amount paid
  const invoiceRef = doc(db, 'invoices', payment.invoice_id);
  const invoiceSnap = await getDoc(invoiceRef);
  if (invoiceSnap.exists()) {
    const currentPaid = invoiceSnap.data().amount_paid || 0;
    const newPaid = currentPaid + payment.amount;
    const total = invoiceSnap.data().total;
    
    await updateDoc(invoiceRef, { 
      amount_paid: newPaid,
      status: newPaid >= total ? 'paid' : 'sent'
    });
  }

  return paymentRef.id;
};
