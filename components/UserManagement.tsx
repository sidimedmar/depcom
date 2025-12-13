
import React, { useState, useEffect } from 'react';
import { User, Language, UserRole, MinistryContact, Tab } from '../types';
import { TEXTS } from '../constants';
import { getUsers, saveUser, deleteUser, getDefaultTabsForRole } from '../services/authService';
import { Plus, Trash2, Shield, User as UserIcon, CheckSquare, Square, Edit2, PlusCircle } from 'lucide-react';

interface Props {
  lang: Language;
  contacts: MinistryContact[];
  onRegisterNewMinistry?: (contacts: MinistryContact[]) => void;
}

const UserManagement: React.FC<Props> = ({ lang, contacts, onRegisterNewMinistry }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const isRTL = lang === 'ar';

  const [formData, setFormData] = useState<Partial<User>>({
    role: 'VIEWER',
    username: '',
    password: '',
    fullName: '',
    ministryId: '',
    allowedTabs: getDefaultTabsForRole('VIEWER')
  });

  // Custom Ministry State
  const [customMinistry, setCustomMinistry] = useState({ fr: '', ar: '' });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    refreshUsers();
  }, []);

  const refreshUsers = () => {
    setUsers(getUsers());
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({
        ...formData,
        role,
        allowedTabs: getDefaultTabsForRole(role) // Reset tabs when role changes for convenience
    });
  };

  const toggleTab = (tab: Tab) => {
    const currentTabs = formData.allowedTabs || [];
    if (currentTabs.includes(tab)) {
        setFormData({ ...formData, allowedTabs: currentTabs.filter(t => t !== tab) });
    } else {
        setFormData({ ...formData, allowedTabs: [...currentTabs, tab] });
    }
  };

  const handleEdit = (user: User) => {
      setFormData({
          username: user.username,
          password: user.password,
          fullName: user.fullName,
          role: user.role,
          ministryId: user.ministryId || '',
          allowedTabs: user.allowedTabs
      });
      setCustomMinistry({ fr: '', ar: '' }); // Reset custom fields
      setEditingUserId(user.id);
      setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName) return;

    let finalMinistryId = formData.ministryId;

    // Handle NEW Ministry creation
    if (formData.ministryId === 'NEW') {
         if (!customMinistry.fr.trim() || !customMinistry.ar.trim()) {
             alert(lang === 'fr' ? 'Veuillez saisir le nom du ministère (FR et AR).' : 'يرجى إدخال اسم الوزارة (بالفرنسية والعربية).');
             return;
         }

         if (onRegisterNewMinistry) {
             const newMinistry: MinistryContact = {
                 id: `manual-${Date.now()}`,
                 name: { fr: customMinistry.fr, ar: customMinistry.ar },
                 department: { fr: 'Direction Générale', ar: 'الإدارة العامة' }, // Default
                 representative: formData.fullName || 'Admin',
                 role: { fr: 'Administrateur', ar: 'مدير' },
                 phone: '',
                 email: '',
                 complianceStatus: 'pending'
             };
             // Add to global state
             onRegisterNewMinistry([newMinistry]);
             finalMinistryId = newMinistry.id;
         }
    }

    // Role validation
    if ((formData.role === 'MINISTRY_ADMIN' || formData.role === 'EDITOR') && !finalMinistryId) {
        alert(lang === 'fr' ? 'Veuillez sélectionner un ministère.' : 'يرجى اختيار الوزارة.');
        return;
    }

    const userToSave: User = {
        id: editingUserId || Math.random().toString(36).substr(2, 9),
        username: formData.username!.trim().toLowerCase(),
        password: formData.password!.trim(),
        fullName: formData.fullName!.trim(),
        role: formData.role as UserRole,
        ministryId: finalMinistryId === '' || finalMinistryId === 'NEW' ? undefined : finalMinistryId,
        allowedTabs: formData.allowedTabs
    };

    saveUser(userToSave);
    refreshUsers();
    
    // Reset state
    setIsAdding(false);
    setEditingUserId(null);
    setCustomMinistry({ fr: '', ar: '' });
    setFormData({ 
        role: 'VIEWER', 
        username: '', 
        password: '', 
        fullName: '', 
        ministryId: '',
        allowedTabs: getDefaultTabsForRole('VIEWER')
    });
  };

  const handleCancel = () => {
      setIsAdding(false);
      setEditingUserId(null);
      setCustomMinistry({ fr: '', ar: '' });
      setFormData({ 
        role: 'VIEWER', 
        username: '', 
        password: '', 
        fullName: '', 
        ministryId: '',
        allowedTabs: getDefaultTabsForRole('VIEWER')
    });
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === 'fr' ? 'Supprimer cet utilisateur ?' : 'حذف هذا المستخدم؟')) {
        deleteUser(id);
        refreshUsers();
    }
  };

  const getRoleLabel = (role: UserRole) => {
      switch(role) {
          case 'SUPER_ADMIN': return TEXTS.roleSuperAdmin[lang];
          case 'DEPUTY_ADMIN': return TEXTS.roleDeputyAdmin[lang];
          case 'MINISTRY_ADMIN': return TEXTS.roleMinistryAdmin[lang];
          case 'EDITOR': return TEXTS.roleEditor[lang];
          default: return TEXTS.roleViewer[lang];
      }
  };

  const getTabLabel = (tab: Tab) => {
      return TEXTS[tab] ? TEXTS[tab][lang] : tab;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gov-900">{TEXTS.users[lang]}</h2>
            <p className="text-gray-500 text-sm">{lang === 'fr' ? 'Gérer les accès et les permissions' : 'إدارة الوصول والأذونات'}</p>
        </div>
        {!isAdding && (
            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-gov-700 text-white px-4 py-2 rounded-lg hover:bg-gov-800 transition-colors"
            >
                <Plus className="w-4 h-4" />
                {TEXTS.addUser[lang]}
            </button>
        )}
      </div>

      {isAdding && (
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl animate-fade-in shadow-md">
              <h3 className="font-bold text-lg mb-4 text-gray-800">
                  {editingUserId ? (lang === 'fr' ? 'Modifier Utilisateur' : 'تعديل المستخدم') : (lang === 'fr' ? 'Ajouter Utilisateur' : 'إضافة مستخدم')}
              </h3>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-1 space-y-4">
                      <h4 className="font-bold text-gray-700 border-b pb-2 mb-4">{lang === 'fr' ? 'Informations' : 'معلومات'}</h4>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.fullName[lang]}</label>
                          <input 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-gov-500"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.username[lang]}</label>
                          <input 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-gov-500"
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            required
                            disabled={editingUserId === 'superadmin'} // Cannot change superadmin username ID
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.password[lang]}</label>
                          <input 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-gov-500"
                            type="text" 
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required
                          />
                      </div>
                  </div>

                  <div className="md:col-span-1 space-y-4">
                      <h4 className="font-bold text-gray-700 border-b pb-2 mb-4">{lang === 'fr' ? 'Rôle & Permissions' : 'الدور والأذونات'}</h4>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.role[lang]}</label>
                          <select 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-gov-500 bg-white"
                            value={formData.role}
                            onChange={e => handleRoleChange(e.target.value as UserRole)}
                            disabled={editingUserId === 'superadmin'} // Cannot demote superadmin
                          >
                              <option value="SUPER_ADMIN">{TEXTS.roleSuperAdmin[lang]}</option>
                              <option value="DEPUTY_ADMIN">{TEXTS.roleDeputyAdmin[lang]}</option>
                              <option value="MINISTRY_ADMIN">{TEXTS.roleMinistryAdmin[lang]}</option>
                              <option value="EDITOR">{TEXTS.roleEditor[lang]}</option>
                              <option value="VIEWER">{TEXTS.roleViewer[lang]}</option>
                          </select>
                      </div>
                      
                      {(formData.role === 'MINISTRY_ADMIN' || formData.role === 'EDITOR' || formData.role === 'VIEWER') && (
                          <div className="animate-fade-in">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.ministry[lang]}</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-gov-500 bg-white"
                                value={formData.ministryId}
                                onChange={e => setFormData({...formData, ministryId: e.target.value})}
                                required={formData.role !== 'VIEWER'}
                            >
                                <option value="">-- {TEXTS.ministry[lang]} --</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name[lang]}</option>
                                ))}
                                <option value="NEW" className="font-bold text-gov-600 bg-gray-50">
                                    + {lang === 'fr' ? 'Autre (Ajouter manuellement)' : 'آخر (إضافة يدويا)'}
                                </option>
                            </select>
                          </div>
                      )}

                      {/* Manual Ministry Input */}
                      {formData.ministryId === 'NEW' && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2 animate-fade-in">
                              <p className="text-xs text-gov-600 font-bold flex items-center gap-1">
                                  <PlusCircle className="w-3 h-3" />
                                  {lang === 'fr' ? 'Nouveau Ministère / Structure' : 'وزارة / هيكل جديد'}
                              </p>
                              <input 
                                  type="text"
                                  placeholder="Nom (Français)"
                                  className="w-full border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-gov-500"
                                  value={customMinistry.fr}
                                  onChange={(e) => setCustomMinistry({...customMinistry, fr: e.target.value})}
                              />
                              <input 
                                  type="text"
                                  placeholder="الاسم (العربية)"
                                  className="w-full border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-gov-500 text-right"
                                  dir="rtl"
                                  value={customMinistry.ar}
                                  onChange={(e) => setCustomMinistry({...customMinistry, ar: e.target.value})}
                              />
                          </div>
                      )}

                      <div className="pt-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-2">{lang === 'fr' ? 'Onglets Autorisés' : 'التبويبات المسموحة'}</label>
                          <div className="grid grid-cols-2 gap-2">
                              {Object.values(Tab).filter(t => t !== Tab.USERS && t !== Tab.SETTINGS).map(tab => (
                                  <div 
                                    key={tab} 
                                    onClick={() => toggleTab(tab)}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer border text-sm transition-colors ${formData.allowedTabs?.includes(tab) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-500'}`}
                                  >
                                      {formData.allowedTabs?.includes(tab) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                      <span>{getTabLabel(tab)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-600 font-medium">{TEXTS.cancel[lang]}</button>
                      <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700">
                          {editingUserId ? TEXTS.update[lang] : TEXTS.submit[lang]}
                      </button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
              <div key={user.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col relative group hover:shadow-md transition-shadow">
                  
                  {/* Action Buttons for Super Admin */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Allow Editing for everyone, including SuperAdmin himself */}
                      <button onClick={() => handleEdit(user)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded" title={lang === 'fr' ? "Modifier" : "تعديل"}>
                          <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {/* Only allow deleting if NOT superadmin */}
                      {user.id !== 'superadmin' && (
                        <button onClick={() => handleDelete(user.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title={lang === 'fr' ? "Supprimer" : "حذف"}>
                            <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                  </div>

                  <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600' : user.role === 'DEPUTY_ADMIN' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                              {user.role === 'SUPER_ADMIN' || user.role === 'DEPUTY_ADMIN' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                          </div>
                          <div>
                              <h3 className="font-bold text-gray-900">{user.fullName}</h3>
                              <p className="text-xs text-gray-500 font-mono">@{user.username}</p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="mt-auto space-y-2">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">{TEXTS.role[lang]}</span>
                          <span className="font-medium bg-gray-50 px-2 py-0.5 rounded text-gov-700 text-xs uppercase tracking-wide">{getRoleLabel(user.role)}</span>
                      </div>
                      {user.ministryId && (
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">{TEXTS.ministry[lang]}</span>
                              <span className="font-medium text-xs truncate max-w-[150px] text-gray-700">
                                  {contacts.find(c => c.id === user.ministryId)?.name[lang]}
                              </span>
                          </div>
                      )}

                       <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50">
                          {user.allowedTabs?.map(tab => (
                              <span key={tab} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {getTabLabel(tab)}
                              </span>
                          ))}
                      </div>
                      
                      {/* Password Display for Admin Debugging */}
                      <div className="text-xs text-gray-400 pt-1 mt-1 flex justify-between items-center">
                          <span>Pwd:</span>
                          <code className="bg-gray-50 px-2 py-0.5 rounded font-mono text-gray-600">{user.password}</code>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default UserManagement;