export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // e.g., 'ks', 'h', 'm2'
  unitPrice: number;
  vatRate: number; // e.g., 20 for 20%
  discount?: number; // Percentage discount
}

export interface Customer {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zip: string;
  country: string;
  ico: string; // ID
  dic: string; // TAX ID
  icDph: string; // VAT ID
  email: string;
  registrationNumber?: string; // Company Registration Number (e.g. from Business Register)
  logo?: string; // Base64 image
  shippingAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    zip: string;
    country: string;
  };
}

export interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  swift: string;
  label?: string; // e.g., 'EUR Account', 'Main Account'
}

export interface Supplier {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zip: string;
  country: string;
  ico: string;
  dic: string;
  icDph: string;
  bankName: string;
  iban: string;
  swift: string;
  bankAccounts?: BankAccount[];
  logo?: string; // Base64 image string
  signature?: string; // Base64 image string
  signature2?: string; // Second signature or stamp (Base64 image string)
  businessRegisterInfo?: string; // e.g. "OR: oddiel Sro, vložka 1929/B"
  email?: string;
  phone?: string;
  website?: string;
}

export type InvoiceFontSize = 'small' | 'medium' | 'large';
export type InvoiceFontFamily = 'Inter' | 'Outfit';
export type InvoiceLayoutPreset = 'modern' | 'minimal' | 'classic';

export interface InvoiceSettings {
  fontSize: InvoiceFontSize;
  fontFamily: InvoiceFontFamily;
  layoutPreset: InvoiceLayoutPreset;
  logoSize: number; // in pixels
  headerFontSize: number; // in pixels
  primaryColor: string; // hex color
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Unpaid' | 'Overdue' | 'Complete';
export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted';

export interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  vatRate: number;
  unit: string;
  sku?: string;
}

export interface Quote {
  id: string;
  number: string;
  supplier: Supplier;
  customer: Customer;
  issueDate: string;
  validUntil: string;
  items: LineItem[];
  notes: string;
  status: QuoteStatus;
  totalAmount: number; // Calculated helper
}

export interface Invoice {
  id: string;
  number: string;
  relatedQuoteId?: string; // Link to quote
  supplier: Supplier;
  customer: Customer;
  shippingAddress?: { // Snapshot for invoice
    addressLine1: string;
    addressLine2?: string;
    city: string;
    zip: string;
    country: string;
  };
  issueDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paymentMethod: string; // e.g., 'Bank Transfer'
  variableSymbol: string;
  constantSymbol: string;
  specificSymbol: string;
  items: LineItem[];
  notes: string;
  status: InvoiceStatus;
  recurringFrequency?: 'monthly' | 'quarterly' | 'none';
  lastGenerated?: string; // YYYY-MM-DD
  referenceNumber?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  vendor?: string;
  taxDeductible: boolean;
  vatRate: number; // e.g. 20
}

export type UserRole = 'admin' | 'user' | 'accountant';