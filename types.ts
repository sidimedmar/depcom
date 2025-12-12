
export type Language = 'fr' | 'ar';

export interface Translation {
  [key: string]: {
    fr: string;
    ar: string;
  };
}

export type UserRole = 'SUPER_ADMIN' | 'MINISTRY_ADMIN' | 'EDITOR' | 'VIEWER';

export enum Tab {
  DASHBOARD = 'dashboard',
  DIRECTORY = 'directory',
  DECLARATION = 'declaration',
  MAP = 'map',
  ASSISTANT = 'assistant',
  USERS = 'users',
  SETTINGS = 'settings'
}

export interface User {
  id: string;
  username: string;
  password?: string; // In real app, this should be hashed. Here for demo.
  fullName: string;
  role: UserRole;
  ministryId?: string; // If null, global access (or super admin)
  allowedTabs?: Tab[]; // Explicit list of allowed tabs
}

export interface MinistryContact {
  id: string;
  name: { fr: string; ar: string };
  representative: string;
  role: { fr: string; ar: string }; // e.g., Directeur, Point Focal
  phone: string;
  email: string;
  department: { fr: string; ar: string };
  complianceStatus: 'compliant' | 'pending' | 'overdue'; // Tracking submission status
  lastSubmission?: string;
}

export interface WorkGroup {
  id: string;
  name: string;
  contactIds: string[];
}

export type AssetType = 'RealEstate' | 'Vehicle' | 'Equipment' | 'Furniture' | 'IT';
export type AssetStatus = 'New' | 'Good' | 'NeedsRepair' | 'Damaged' | 'Obsolete';

export type Wilaya = 
  | 'Adrar' | 'Assaba' | 'Brakna' | 'Dakhlet Nouadhibou' | 'Gorgol' 
  | 'Guidimaka' | 'Hodh Ech Chargui' | 'Hodh El Gharbi' | 'Inchiri' 
  | 'Nouakchott Nord' | 'Nouakchott Ouest' | 'Nouakchott Sud' 
  | 'Tagant' | 'Tiris Zemmour' | 'Trarza';

export interface AssetDocument {
  id: string;
  name: string;
  type: 'Photo' | 'Invoice' | 'Legal' | 'Other';
  url: string; // Base64 or URL
}

export interface AssetDeclaration {
  id: string;
  reference: string;
  ministryId: string;
  subEntity?: string; // New field for Direction/Establishment
  type: AssetType;
  condition: AssetStatus;
  description: string;
  acquisitionDate: string; // Changed from simple 'date' for depreciation logic
  value: number; // Initial value
  currentValue?: number; // Depreciated value
  wilaya: Wilaya;
  coordinates?: { lat: number; lng: number }; // GPS Points
  locationDetails: string;
  documents?: AssetDocument[]; // Structured documents
  // Flexible container for category-specific fields
  specificDetails?: Record<string, string | number>;
}