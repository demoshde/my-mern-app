// User types
export interface User {
  _id: string;
  username: string;
  fullName: string;
  position: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFormData {
  username: string;
  password?: string;
  fullName: string;
  position: string;
  role: 'admin' | 'user';
}

// PPE Item types
export interface CustomField {
  fieldName: string;
  fieldValue: string;
}

export interface PPEItem {
  _id: string;
  id: string;
  name: string;
  description?: string;
  photo?: string;
  quantity: number;
  lowStockThreshold: number;
  size?: string;
  type?: string;
  expiryDate?: string;
  usageDays?: number; // How many days before a new one can be issued
  customFields?: CustomField[];
  barcode?: string;
  qrCode?: string;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

// Driver types
export interface IssuedItem {
  item: PPEItem | string;
  quantity: number;
  issuedDate: string;
  transactionId?: string;
}

export interface Driver {
  _id: string;
  name: string;
  employeeId: string;
  email?: string;
  phone?: string;
  photo?: string;
  department?: string;
  currentlyIssuedItems: IssuedItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Transaction types
export interface TransactionItem {
  item: PPEItem | string;
  itemName: string;
  quantity: number;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  earlyIssueReason?: 'lost' | 'damaged' | 'not_suitable' | 'other' | null;
  earlyIssueNote?: string;
}

export interface Transaction {
  _id: string;
  type: 'issue' | 'return';
  driver: Driver | string;
  items: TransactionItem[];
  notes?: string;
  originalTransaction?: Transaction | string;
  performedBy?: { _id: string; username: string };
  transactionDate: string;
  createdAt: string;
}

// Report types
export interface DashboardStats {
  totalItems: number;
  totalDrivers: number;
  lowStockItems: number;
  totalStock: number;
  todayTransactions: number;
  itemsCurrentlyIssued: number;
  driversWithIssuedItems: number;
}

export interface LowStockAlert {
  id: string;
  name: string;
  type?: string;
  currentQuantity: number;
  threshold: number;
  deficit: number;
}

// Form types
export interface PPEItemFormData {
  name: string;
  description?: string;
  photo?: string;
  quantity: number;
  lowStockThreshold: number;
  size?: string;
  type?: string;
  expiryDate?: string;
  usageDays?: number;
  customFields?: CustomField[];
  barcode?: string;
}

export interface DriverFormData {
  name: string;
  employeeId: string;
  email?: string;
  phone?: string;
  photo?: string;
  department?: string;
}

export interface IssueFormData {
  driverId: string;
  items: {
    itemId: string;
    quantity: number;
    condition: string;
    earlyIssueReason?: string | null;
    earlyIssueNote?: string;
  }[];
  notes?: string;
}

export interface ReturnFormData {
  driverId: string;
  items: {
    itemId: string;
    quantity: number;
    condition: string;
  }[];
  notes?: string;
  originalTransactionId?: string;
}

// Order types
export interface OrderItem {
  _id?: string;
  item: PPEItem | string;
  itemId: string;
  itemName: string;
  currentStock: number;
  orderQuantity: number;
  receivedQuantity: number;
  receivedDate?: string;
  size?: string;
  type?: string;
}

export interface OrderAttachment {
  _id: string;
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: { _id: string; username: string; fullName?: string };
}

export interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  status: 'pending' | 'sent' | 'partial' | 'received' | 'cancelled';
  notes?: string;
  attachments?: OrderAttachment[];
  createdBy?: { _id: string; username: string; fullName?: string };
  receivedAt?: string;
  receivedBy?: { _id: string; username: string; fullName?: string };
  totalOrdered?: number;
  totalReceived?: number;
  isFullyReceived?: boolean;
  createdAt: string;
  updatedAt: string;
}
