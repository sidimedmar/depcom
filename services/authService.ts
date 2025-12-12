
import { User, Tab, UserRole } from "../types";

const SUPER_ADMIN: User = {
  id: 'superadmin',
  username: 'superadmin',
  password: 'superadmin123',
  fullName: 'Administrateur Général',
  role: 'SUPER_ADMIN',
  allowedTabs: Object.values(Tab) // All tabs access
};

// Default Ministry Users for demonstration
const DEFAULT_MINISTRY_USERS: User[] = [
  {
    id: 'user-finance',
    username: 'finance',
    password: '123456',
    fullName: 'Ahmed O. (Dir. Patrimoine)',
    role: 'MINISTRY_ADMIN',
    ministryId: '1', // Matches INITIAL_CONTACTS id for Finances
    allowedTabs: [Tab.DASHBOARD, Tab.DIRECTORY, Tab.DECLARATION, Tab.MAP, Tab.ASSISTANT]
  },
  {
    id: 'user-sante',
    username: 'sante',
    password: '123456',
    fullName: 'Dr. Fatimetou Z. (Logistique)',
    role: 'MINISTRY_ADMIN',
    ministryId: '2', // Matches INITIAL_CONTACTS id for Santé
    allowedTabs: [Tab.DASHBOARD, Tab.DIRECTORY, Tab.DECLARATION, Tab.MAP, Tab.ASSISTANT]
  },
  {
    id: 'user-equipement',
    username: 'equipement',
    password: '123456',
    fullName: 'Ing. Brahim S. (Parc Mobile)',
    role: 'MINISTRY_ADMIN',
    ministryId: '3', // Matches INITIAL_CONTACTS id for Equipement
    allowedTabs: [Tab.DASHBOARD, Tab.DIRECTORY, Tab.DECLARATION, Tab.MAP, Tab.ASSISTANT]
  }
];

const STORAGE_KEY = 'app_users_v1';

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initialUsers = [SUPER_ADMIN, ...DEFAULT_MINISTRY_USERS];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(stored);
};

export const getDefaultTabsForRole = (role: UserRole): Tab[] => {
  switch (role) {
    case 'SUPER_ADMIN':
      return Object.values(Tab);
    case 'MINISTRY_ADMIN':
      return [Tab.DASHBOARD, Tab.DIRECTORY, Tab.DECLARATION, Tab.MAP, Tab.ASSISTANT];
    case 'EDITOR':
      return [Tab.DASHBOARD, Tab.DECLARATION, Tab.MAP];
    case 'VIEWER':
      return [Tab.DASHBOARD, Tab.MAP];
    default:
      return [Tab.DASHBOARD];
  }
};

export const registerUser = (userData: { fullName: string, username: string, password: string, ministryId: string }): User | null => {
    const users = getUsers();
    
    // Check if username exists
    if (users.some(u => u.username.toLowerCase() === userData.username.trim().toLowerCase())) {
        return null; // Error: Exists
    }

    const newUser: User = {
        id: `user-${Date.now()}`,
        username: userData.username.trim().toLowerCase(),
        password: userData.password.trim(),
        fullName: userData.fullName.trim(),
        ministryId: userData.ministryId,
        role: 'MINISTRY_ADMIN', 
        allowedTabs: [Tab.DASHBOARD, Tab.DECLARATION]
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return newUser;
};

export const saveUser = (user: User) => {
  const users = getUsers();
  
  // Normalize
  user.username = user.username.trim().toLowerCase();
  if (user.password) user.password = user.password.trim();

  // If allowedTabs is undefined (migrating old user), set defaults
  if (!user.allowedTabs || user.allowedTabs.length === 0) {
      user.allowedTabs = getDefaultTabsForRole(user.role);
  }

  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    const duplicateUser = users.find(u => u.username === user.username && u.id !== user.id);
    if (duplicateUser) {
        alert("Ce nom d'utilisateur existe déjà / اسم المستخدم هذا موجود بالفعل");
        return; 
    }
    users.push(user);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const deleteUser = (userId: string) => {
  if (userId === 'superadmin') return; 
  const users = getUsers();
  const newUsers = users.filter(u => u.id !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
};

export const authenticate = (username: string, password: string): User | null => {
  const users = getUsers();
  const targetUsername = username.trim().toLowerCase();
  const targetPassword = password.trim();

  const user = users.find(u => 
    u.username.toLowerCase() === targetUsername && 
    u.password === targetPassword
  );
  
  if (user && (!user.allowedTabs || user.allowedTabs.length === 0)) {
      // Fix on the fly if tabs are missing
      user.allowedTabs = getDefaultTabsForRole(user.role);
  }

  return user || null;
};

export const hasPermission = (user: User, action: 'edit' | 'delete' | 'view_users', assetMinistryId?: string): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  
  if (action === 'view_users') return false;

  if (user.role === 'MINISTRY_ADMIN') {
    // Can edit/delete ONLY their own ministry assets
    return assetMinistryId === user.ministryId;
  }
  
  if (user.role === 'EDITOR') {
     if (action === 'delete') return false;
     return assetMinistryId ? assetMinistryId === user.ministryId : false;
  }

  return false;
};

export const canAccessTab = (user: User, tab: Tab): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (tab === Tab.USERS) return false;
  return user.allowedTabs ? user.allowedTabs.includes(tab) : false;
};
