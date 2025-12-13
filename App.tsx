

import React, { useState, useEffect } from 'react';
import { Tab, Language, AssetDeclaration, User, MinistryContact, Translation, WorkGroup } from './types';
import { TEXTS as DEFAULT_TEXTS, INITIAL_CONTACTS, INITIAL_ASSETS } from './constants';
import { hasPermission, canAccessTab } from './services/authService';
import { getAppTexts } from './services/settingsService';
import Dashboard from './components/Dashboard';
import ContactDirectory from './components/ContactDirectory';
import AssetDeclarationForm from './components/AssetDeclarationForm';
import AIAssistant from './components/AIAssistant';
import AssetMap from './components/AssetMap';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import MessagingModal from './components/MessagingModal';
import { LayoutDashboard, Users, FilePlus, Bot, Globe, Menu, X, Map as MapIcon, LogOut, Shield, Settings as SettingsIcon } from 'lucide-react';

const ASSETS_KEY = 'app_assets_v1';
const CONTACTS_KEY = 'app_contacts_v1';
const GROUPS_KEY = 'app_groups_v1';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('fr');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appTexts, setAppTexts] = useState<Translation>(DEFAULT_TEXTS);
  
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Initialize Contacts from LocalStorage or Constants
  const [contacts, setContacts] = useState<MinistryContact[]>(() => {
    const saved = localStorage.getItem(CONTACTS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  // Initialize Assets from LocalStorage or Constants
  const [assets, setAssets] = useState<AssetDeclaration[]>(() => {
    const saved = localStorage.getItem(ASSETS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  // Initialize Work Groups
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>(() => {
    const saved = localStorage.getItem(GROUPS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [editingAsset, setEditingAsset] = useState<AssetDeclaration | null>(null);
  const [messagingGroup, setMessagingGroup] = useState<WorkGroup | null>(null);

  // Persist Contacts whenever they change
  useEffect(() => {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts]);

  // Persist Assets whenever they change
  useEffect(() => {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  }, [assets]);

  // Persist Groups whenever they change
  useEffect(() => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(workGroups));
  }, [workGroups]);

  // Load custom texts on mount
  useEffect(() => {
    setAppTexts(getAppTexts());
  }, []);

  // Set HTML dir attribute based on language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => prev === 'fr' ? 'ar' : 'fr');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Reset to Dashboard on login to avoid stuck states
    setActiveTab(Tab.DASHBOARD);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleTextsUpdate = (newTexts: Translation) => {
    setAppTexts(newTexts);
  };

  // --- ASSET CRUD ---
  const handleSaveAsset = (savedAsset: AssetDeclaration) => {
    if (editingAsset) {
      // Update existing
      setAssets(prev => prev.map(a => a.id === savedAsset.id ? savedAsset : a));
      setEditingAsset(null);
    } else {
      // Create new
      setAssets(prev => [savedAsset, ...prev]);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm(lang === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce bien ?' : 'هل أنت متأكد من حذف هذا الأصل؟')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleEditAsset = (asset: AssetDeclaration) => {
    setEditingAsset(asset);
    setActiveTab(Tab.DECLARATION);
  };

  // --- MINISTRY CONTACT CRUD ---
  const handleAddContacts = (newContacts: MinistryContact[]) => {
      setContacts(prev => [...prev, ...newContacts]);
  };

  const handleUpdateContact = (updatedContact: MinistryContact) => {
      setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };

  const handleDeleteContact = (id: string) => {
      if (confirm(lang === 'fr' ? 'Supprimer ce ministère et tous ses biens associés ?' : 'حذف هذه الوزارة وجميع ممتلكاتها المرتبطة؟')) {
          setContacts(prev => prev.filter(c => c.id !== id));
          // Optionally delete assets associated with this ministry to maintain consistency
          setAssets(prev => prev.filter(a => a.ministryId !== id));
      }
  };

  // --- GROUP CRUD ---
  const handleCreateGroup = (name: string, contactIds: string[]) => {
      const newGroup: WorkGroup = {
          id: `grp-${Date.now()}`,
          name,
          contactIds
      };
      setWorkGroups(prev => [...prev, newGroup]);
  };

  const handleDeleteGroup = (id: string) => {
      setWorkGroups(prev => prev.filter(g => g.id !== id));
  };

  const isRTL = lang === 'ar';

  if (!currentUser) {
    return (
      <Login 
        lang={lang} 
        onLogin={handleLogin} 
        appTexts={appTexts} 
        contacts={contacts}
        onRegisterNewMinistry={handleAddContacts}
      />
    );
  }

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => {
    if (!canAccessTab(currentUser, tab)) return null;

    return (
      <button
        onClick={() => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
          if (tab === Tab.DECLARATION && !editingAsset) {
            setEditingAsset(null); 
          }
        }}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${
          activeTab === tab 
          ? 'bg-gov-700 text-white shadow-md' 
          : 'text-gray-300 hover:bg-gov-800 hover:text-white'
        }`}
      >
        <Icon className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex ${isRTL ? 'font-arabic' : 'font-sans'}`}>
      
      {/* Global Messaging Modal */}
      {messagingGroup && (
        <MessagingModal 
          group={messagingGroup} 
          contacts={contacts} 
          lang={lang} 
          onClose={() => setMessagingGroup(null)} 
        />
      )}

      {/* Sidebar (Desktop) */}
      <aside className={`hidden md:flex flex-col w-64 bg-gov-900 text-white fixed h-full z-10 ${isRTL ? 'right-0' : 'left-0'}`}>
        <div className="p-6 border-b border-gov-700">
          <h1 className="text-xl font-bold leading-tight">{appTexts.appTitle[lang]}</h1>
          <div className="flex items-center gap-2 mt-4 text-xs bg-gov-800 p-2 rounded text-gov-200">
             <div className="w-2 h-2 rounded-full bg-green-400"></div>
             <span className="truncate max-w-[140px]">{currentUser.fullName}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} label={appTexts.dashboard ? appTexts.dashboard[lang] : DEFAULT_TEXTS.dashboard[lang]} />
          <NavItem tab={Tab.DIRECTORY} icon={Users} label={appTexts.directory ? appTexts.directory[lang] : DEFAULT_TEXTS.directory[lang]} />
          <NavItem tab={Tab.MAP} icon={MapIcon} label={appTexts.map ? appTexts.map[lang] : DEFAULT_TEXTS.map[lang]} />
          <NavItem tab={Tab.DECLARATION} icon={FilePlus} label={appTexts.declaration ? appTexts.declaration[lang] : DEFAULT_TEXTS.declaration[lang]} />
          <NavItem tab={Tab.ASSISTANT} icon={Bot} label={appTexts.assistant ? appTexts.assistant[lang] : DEFAULT_TEXTS.assistant[lang]} />
          
          {hasPermission(currentUser, 'view_users') && (
            <>
              <div className="h-px bg-gov-700 my-2"></div>
              <NavItem tab={Tab.USERS} icon={Shield} label={appTexts.users ? appTexts.users[lang] : DEFAULT_TEXTS.users[lang]} />
            </>
          )}

          {currentUser.role === 'SUPER_ADMIN' && (
             <NavItem tab={Tab.SETTINGS} icon={SettingsIcon} label={appTexts.settings ? appTexts.settings[lang] : DEFAULT_TEXTS.settings[lang]} />
          )}
        </nav>

        <div className="p-4 border-t border-gov-700 space-y-3">
          <button 
            onClick={toggleLang}
            className="flex items-center justify-center gap-2 w-full bg-gov-800 hover:bg-gov-700 py-2 rounded-lg transition-colors border border-gov-600 text-sm"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'fr' ? 'العربية' : 'Français'}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full text-red-300 hover:bg-red-900/30 py-2 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{DEFAULT_TEXTS.logout[lang]}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isRTL ? 'md:mr-64' : 'md:ml-64'}`}>
        
        {/* Mobile Header */}
        <header className="md:hidden bg-gov-900 text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
           <h1 className="font-bold truncate max-w-[200px]">{appTexts.appTitle[lang]}</h1>
           <div className="flex items-center gap-4">
             <button onClick={toggleLang} className="text-sm font-medium bg-gov-800 px-2 py-1 rounded">
                {lang === 'fr' ? 'AR' : 'FR'}
             </button>
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X /> : <Menu />}
             </button>
           </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gov-900 text-white p-4 space-y-2 fixed w-full z-10 shadow-xl border-t border-gov-700">
            <NavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} label={appTexts.dashboard[lang]} />
            <NavItem tab={Tab.DIRECTORY} icon={Users} label={appTexts.directory[lang]} />
            <NavItem tab={Tab.MAP} icon={MapIcon} label={appTexts.map[lang]} />
            <NavItem tab={Tab.DECLARATION} icon={FilePlus} label={appTexts.declaration[lang]} />
            <NavItem tab={Tab.ASSISTANT} icon={Bot} label={appTexts.assistant[lang]} />
            {hasPermission(currentUser, 'view_users') && (
                <NavItem tab={Tab.USERS} icon={Shield} label={appTexts.users[lang]} />
            )}
             {currentUser.role === 'SUPER_ADMIN' && (
                <NavItem tab={Tab.SETTINGS} icon={SettingsIcon} label={appTexts.settings ? appTexts.settings[lang] : DEFAULT_TEXTS.settings[lang]} />
            )}
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-red-300 hover:bg-red-900/30">
                <LogOut className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {DEFAULT_TEXTS.logout[lang]}
            </button>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* View Routing with Permission Checks */}
          <div className="animate-fade-in-up h-full">
            {activeTab === Tab.DASHBOARD && canAccessTab(currentUser, Tab.DASHBOARD) && (
              <Dashboard 
                assets={assets} 
                contacts={contacts} 
                groups={workGroups}
                lang={lang} 
                currentUser={currentUser}
                onEdit={handleEditAsset} 
                onDelete={handleDeleteAsset} 
                onMessageGroup={(g) => setMessagingGroup(g)}
              />
            )}
            {activeTab === Tab.DIRECTORY && canAccessTab(currentUser, Tab.DIRECTORY) && (
              <ContactDirectory 
                contacts={contacts} 
                lang={lang} 
                assets={assets} 
                currentUser={currentUser}
                onAdd={handleAddContacts}
                onUpdate={handleUpdateContact}
                onDelete={handleDeleteContact}
                groups={workGroups}
                onCreateGroup={handleCreateGroup}
                onDeleteGroup={handleDeleteGroup}
                onMessageGroup={(g) => setMessagingGroup(g)}
              />
            )}
            {activeTab === Tab.MAP && canAccessTab(currentUser, Tab.MAP) && (
              <AssetMap assets={assets} lang={lang} />
            )}
            {activeTab === Tab.DECLARATION && canAccessTab(currentUser, Tab.DECLARATION) && (
              <AssetDeclarationForm 
                lang={lang} 
                contacts={contacts} 
                onSaveAsset={handleSaveAsset} 
                onAddContacts={handleAddContacts}
                editingAsset={editingAsset}
                currentUser={currentUser}
                onCancelEdit={() => {
                   setEditingAsset(null);
                }}
                assets={assets}
                onDeleteAsset={handleDeleteAsset}
              />
            )}
            {activeTab === Tab.ASSISTANT && canAccessTab(currentUser, Tab.ASSISTANT) && (
              <AIAssistant lang={lang} />
            )}
            {activeTab === Tab.USERS && hasPermission(currentUser, 'view_users') && (
              <UserManagement 
                lang={lang} 
                contacts={contacts} 
                onRegisterNewMinistry={handleAddContacts}
              />
            )}
            {activeTab === Tab.SETTINGS && currentUser.role === 'SUPER_ADMIN' && (
              <Settings lang={lang} onUpdate={handleTextsUpdate} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;