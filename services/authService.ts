
import { User, Tab, UserRole } from "../types";

const SUPER_ADMIN: User = {
  id: 'superadmin',
  username: 'superadmin',
  password: 'superadmin123',
  fullName: 'Administrateur Général',
  role: 'SUPER_ADMIN',
  allowedTabs: Object.values(Tab) // All tabs access including ASSISTANT
};

const DEPUTY_ADMIN_USER: User = {
  id: 'deputy-admin',
  username: 'admin',
  password: 'admin',
  fullName: 'Admin', // Changed from 'Admin Adjoint'
  role: 'DEPUTY_ADMIN',
  // Admin Adjoint keeps Directory and Map, but no Assistant
  allowedTabs: [Tab.DASHBOARD, Tab.DIRECTORY, Tab.DECLARATION, Tab.MAP]
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
    // Modified: Only Dashboard and Declaration
    allowedTabs: [Tab.DASHBOARD, Tab.DECLARATION]
  },
  {
    id: 'user-sante',
    username: 'sante',
    password: '123456',
    fullName: 'Dr. Fatimetou Z. (Logistique)',
    role: 'MINISTRY_ADMIN',
    ministryId: '2', // Matches INITIAL_CONTACTS id for Santé
    // Modified: Only Dashboard and Declaration
    allowedTabs: [Tab.DASHBOARD, Tab.DECLARATION]
  },
  {
    id: 'user-equipement',
    username: 'equipement',
    password: '123456',
    fullName: 'Ing. Brahim S. (Parc Mobile)',
    role: 'MINISTRY_ADMIN',
    ministryId: '3', // Matches INITIAL_CONTACTS id for Equipement
    // Modified: Only Dashboard and Declaration
    allowedTabs: [Tab.DASHBOARD, Tab.DECLARATION]
  }
];

const STORAGE_KEY = 'app_users_v1';

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  let users: User[] = [];
  
  if (!stored) {
    users = [SUPER_ADMIN, DEPUTY_ADMIN_USER, ...DEFAULT_MINISTRY_USERS];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } else {
    users = JSON.parse(stored);
    
    // Ensure default Deputy Admin exists
    if (!users.some(u => u.username === 'admin')) {
       users.push(DEPUTY_ADMIN_USER);
    }

    // RETROACTIVE FIX: 
    let updated = false;
    users = users.map(u => {
        // Fix Name for Admin (remove 'Adjoint')
        if (u.username === 'admin' && u.fullName !== 'Admin') {
            u.fullName = 'Admin';
            updated = true;
        }

        // Fix for Ministry Admins (Points Focaux) - Strict restriction
        if (u.role === 'MINISTRY_ADMIN') {
             const expectedTabs = [Tab.DASHBOARD, Tab.DECLARATION];
             // Check if tabs are different
             const currentTabs = u.allowedTabs || [];
             const isDifferent = currentTabs.length !== expectedTabs.length || !currentTabs.every(t => expectedTabs.includes(t));
             
             if (isDifferent) {
                 u.allowedTabs = expectedTabs;
                 updated = true;
             }
        } 
        // General clean up for Assistant on others (like Editor/Viewer/Deputy)
        else if (u.role !== 'SUPER_ADMIN' && u.allowedTabs && u.allowedTabs.includes(Tab.ASSISTANT)) {
            u.allowedTabs = u.allowedTabs.filter(t => t !== Tab.ASSISTANT);
            updated = true;
        }
        return u;
    });

    if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
  }
  
  return users;
};

export const getDefaultTabsForRole = (role: UserRole): Tab[] => {
  switch (role) {
    case 'SUPER_ADMIN':
      return Object.values(Tab);
    case 'DEPUTY_ADMIN':
      // Admin Adjoint: No ASSISTANT, No USERS, No SETTINGS
      return [Tab.DASHBOARD, Tab.DIRECTORY, Tab.DECLARATION, Tab.MAP];
    case 'MINISTRY_ADMIN':
      // Ministry Admin: Only Dashboard and Declaration
      return [Tab.DASHBOARD, Tab.DECLARATION];
    case 'EDITOR':
      return [Tab.DASHBOARD, Tab.DECLARATION];
    case 'VIEWER':
      return [Tab.DASHBOARD, Tab.MAP]; // Viewers might still need map? Adjusting Viewer to standard minimal if needed, but keeping as is based on prompt strictly for Ministry Admin.
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
        allowedTabs: [Tab.DASHBOARD, Tab.DECLARATION] // Default tabs: No Map, No Directory, No Assistant
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
  } else if (user.role !== 'SUPER_ADMIN') {
      // Security check: Ensure ASSISTANT isn't accidentally added
      user.allowedTabs = user.allowedTabs.filter(t => t !== Tab.ASSISTANT);
  }

  // Double check strict enforcement for Ministry Admin on save
  if (user.role === 'MINISTRY_ADMIN') {
      user.allowedTabs = [Tab.DASHBOARD, Tab.DECLARATION];
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
  
  if (user) {
      // Runtime check: if tabs missing, set defaults.
      if (!user.allowedTabs || user.allowedTabs.length === 0) {
          user.allowedTabs = getDefaultTabsForRole(user.role);
      }
      
      // Strict Enforcement for Ministry Admin
      if (user.role === 'MINISTRY_ADMIN') {
          user.allowedTabs = [Tab.DASHBOARD, Tab.DECLARATION];
      }

      // Runtime Security check: Strip ASSISTANT if not super admin
      if (user.role !== 'SUPER_ADMIN' && user.allowedTabs.includes(Tab.ASSISTANT)) {
          user.allowedTabs = user.allowedTabs.filter(t => t !== Tab.ASSISTANT);
      }
  }

  return user || null;
};

export const hasPermission = (user: User, action: 'edit' | 'delete' | 'view_users', assetMinistryId?: string): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  
  // Admin Adjoint: Full power but cannot view/manage users
  if (user.role === 'DEPUTY_ADMIN') {
      if (action === 'view_users') return false;
      return true; // Can edit/delete assets/groups globally
  }

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
  
  // Explicitly block users tab for everyone else (redundant but safe)
  if (tab === Tab.USERS) return false;

  // Explicitly block assistant for non-superadmin (redundant but safe)
  if (tab === Tab.ASSISTANT) return false;

  return user.allowedTabs ? user.allowedTabs.includes(tab) : false;
};
