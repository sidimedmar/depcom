
import React, { useState, useRef } from 'react';
import { MinistryContact, Language, AssetDeclaration, User, WorkGroup } from '../types';
import { TEXTS } from '../constants';
import { exportContactsToCSV, parseCSV } from '../services/sheetService';
import { MessageCircle, Mail, Search, Clock, CheckCircle, AlertCircle, UserCheck, Smartphone, FileSpreadsheet, Upload, DollarSign, X, Plus, Copy, CheckSquare, Square, Users, Layers, Bookmark, List, ArrowRight, Trash2, Save } from 'lucide-react';
import { generateCommunication } from '../services/geminiService';

interface Props {
  contacts: MinistryContact[];
  assets: AssetDeclaration[];
  lang: Language;
  currentUser?: User;
  onAdd?: (contacts: MinistryContact[]) => void;
  onUpdate?: (contact: MinistryContact) => void;
  onDelete?: (id: string) => void;
  groups?: WorkGroup[];
  onCreateGroup?: (name: string, ids: string[]) => void;
  onDeleteGroup?: (id: string) => void;
  onMessageGroup?: (group: WorkGroup) => void;
}

const ContactDirectory: React.FC<Props> = ({ 
    contacts, assets, lang, currentUser, 
    onAdd, onUpdate, onDelete, // onDelete is used in delete button
    groups = [], onCreateGroup, onDeleteGroup, onMessageGroup
}) => {
  const isRTL = lang === 'ar';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [viewMode, setViewMode] = useState<'contacts' | 'groups'>('contacts');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // CRUD State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MinistryContact>>({});
  
  // Group Creation State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleWhatsApp = (phone: string, message?: string) => {
    if (!phone) {
        alert(lang === 'fr' ? 'Numéro de téléphone manquant' : 'رقم الهاتف مفقود');
        return;
    }
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 8) {
        cleanPhone = '222' + cleanPhone;
    }
    const url = `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    window.open(url, '_blank');
  };

  const filteredContacts = contacts.filter(c => 
    c.name[lang].toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department[lang].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredContacts.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredContacts.map(c => c.id)));
      }
  };

  const handleBulkCopy = (type: 'email' | 'phone', specificIds?: string[]) => {
      const idsToUse = specificIds || Array.from(selectedIds);
      const items = contacts
          .filter(c => idsToUse.includes(c.id))
          .map(c => type === 'email' ? c.email : c.phone)
          .filter(Boolean);
      
      if (items.length === 0) return;
      
      const text = items.join(type === 'email' ? '; ' : ', ');
      navigator.clipboard.writeText(text);
      alert(lang === 'fr' 
        ? `${items.length} éléments copiés ! Prêt à coller.` 
        : `تم نسخ ${items.length} عنصر! جاهز للصق.`);
  };

  const handleBulkEmail = (specificIds?: string[]) => {
    const idsToUse = specificIds || Array.from(selectedIds);
    const emails = contacts
      .filter(c => idsToUse.includes(c.id))
      .map(c => c.email)
      .filter(Boolean);

    if (emails.length === 0) return;

    const bcc = emails.join(';');
    window.open(`mailto:?bcc=${bcc}`, '_blank');
  };

  const saveGroup = () => {
      if (!newGroupName.trim() || !onCreateGroup) return;
      onCreateGroup(newGroupName.trim(), Array.from(selectedIds));
      setIsCreatingGroup(false);
      setNewGroupName('');
      setViewMode('groups');
      alert(lang === 'fr' ? 'Groupe créé avec succès' : 'تم إنشاء المجموعة بنجاح');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && onAdd) {
          try {
             const data = await parseCSV(e.target.files[0]);
             const newContacts: MinistryContact[] = data.map((row, idx) => ({
                 id: `imported-${Date.now()}-${idx}`,
                 name: { fr: row.NameFR || 'Nom', ar: row.NameAR || 'اسم' },
                 department: { fr: row.DepartmentFR || 'Direction', ar: row.DepartmentAR || 'إدارة' },
                 representative: row.Representative || '',
                 role: { fr: row.RoleFR || 'Point Focal', ar: row.RoleAR || 'نقطة اتصال' },
                 phone: row.Phone || '',
                 email: row.Email || '',
                 complianceStatus: 'pending'
             }));
             onAdd(newContacts);
             alert(lang === 'fr' ? 'Import réussi' : 'تم الاستيراد بنجاح');
          } catch (err) {
              alert("Erreur import CSV");
          }
      }
  };

  const openEditModal = (contact?: MinistryContact) => {
      if (contact) {
          setEditForm(contact);
      } else {
          setEditForm({
              name: { fr: '', ar: '' },
              department: { fr: '', ar: '' },
              representative: '',
              role: { fr: '', ar: '' },
              phone: '',
              email: '',
              complianceStatus: 'pending'
          });
      }
      setIsEditing(true);
  };

  const saveContact = () => {
      if (!editForm.name?.fr || !editForm.representative) return;
      
      const contactToSave: MinistryContact = {
          id: editForm.id || `min-${Date.now()}`,
          name: editForm.name! as { fr: string, ar: string },
          department: editForm.department! as { fr: string, ar: string },
          representative: editForm.representative!,
          role: editForm.role! as { fr: string, ar: string },
          phone: editForm.phone || '',
          email: editForm.email || '',
          complianceStatus: editForm.complianceStatus || 'pending',
          lastSubmission: editForm.lastSubmission
      };

      if (editForm.id && onUpdate) {
          onUpdate(contactToSave);
      } else if (onAdd) {
          onAdd([contactToSave]);
      }
      setIsEditing(false);
  };

  const calculateStatus = (ministryAssets: AssetDeclaration[]) => {
      if (ministryAssets.length === 0) return { status: 'overdue', lastDate: null };
      const dates = ministryAssets.map(a => new Date(a.acquisitionDate).getTime());
      const maxDate = Math.max(...dates);
      const lastDateObj = new Date(maxDate);
      const now = new Date();
      const diffDays = Math.ceil(Math.abs(now.getTime() - maxDate) / (1000 * 60 * 60 * 24));
      let status = 'compliant';
      if (diffDays > 180) status = 'overdue';
      else if (diffDays > 90) status = 'pending';
      return { status, lastDate: lastDateObj.toISOString().split('T')[0] };
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'compliant': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'compliant': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
     switch(status) {
       case 'compliant': return TEXTS.statusCompliant[lang];
       case 'pending': return TEXTS.statusPending[lang];
       case 'overdue': return TEXTS.statusOverdue[lang];
       default: return status;
     }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat(lang === 'fr' ? 'fr-MR' : 'ar-MR').format(val);

  return (
    <div className="space-y-8">
      {/* Edit/Create Modal */}
      {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gov-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg">{editForm.id ? (lang === 'fr' ? 'Modifier Ministère' : 'تعديل الوزارة') : (lang === 'fr' ? 'Ajouter Ministère' : 'إضافة وزارة')}</h3>
                      <button onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4">
                      {/* Form Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500">Nom (FR)</label>
                              <input className="w-full border rounded p-2" value={editForm.name?.fr || ''} onChange={e => setEditForm({...editForm, name: {...editForm.name!, fr: e.target.value}})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500">Nom (AR)</label>
                              <input className="w-full border rounded p-2 text-right" dir="rtl" value={editForm.name?.ar || ''} onChange={e => setEditForm({...editForm, name: {...editForm.name!, ar: e.target.value}})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500">Département (FR)</label>
                              <input className="w-full border rounded p-2" value={editForm.department?.fr || ''} onChange={e => setEditForm({...editForm, department: {...editForm.department!, fr: e.target.value}})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500">Département (AR)</label>
                              <input className="w-full border rounded p-2 text-right" dir="rtl" value={editForm.department?.ar || ''} onChange={e => setEditForm({...editForm, department: {...editForm.department!, ar: e.target.value}})} />
                          </div>
                      </div>
                      <hr />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500">Représentant</label>
                              <input className="w-full border rounded p-2" value={editForm.representative || ''} onChange={e => setEditForm({...editForm, representative: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500">Téléphone</label>
                              <input 
                                type="tel" 
                                dir="ltr"
                                className="w-full border rounded p-2" 
                                value={editForm.phone || ''} 
                                onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                                placeholder="Ex: 45001234"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500">Email</label>
                              <input 
                                type="email" 
                                dir="ltr"
                                className="w-full border rounded p-2" 
                                value={editForm.email || ''} 
                                onChange={e => setEditForm({...editForm, email: e.target.value})} 
                              />
                          </div>
                          <div>
                               <label className="text-xs font-bold text-gray-500">Rôle (FR)</label>
                               <input className="w-full border rounded p-2" value={editForm.role?.fr || ''} onChange={e => setEditForm({...editForm, role: {...editForm.role!, fr: e.target.value}})} />
                          </div>
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 font-medium">{TEXTS.cancel[lang]}</button>
                      <button onClick={saveContact} className="px-4 py-2 bg-gov-600 text-white rounded font-medium flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {TEXTS.submit[lang]}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex justify-center mb-6">
          <div className="bg-gray-200 p-1 rounded-lg flex gap-1 shadow-inner">
              <button 
                onClick={() => setViewMode('contacts')}
                className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium text-sm transition-all ${viewMode === 'contacts' ? 'bg-white text-gov-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <List className="w-4 h-4" />
                  {TEXTS.viewContacts[lang]}
              </button>
              <button 
                onClick={() => setViewMode('groups')}
                className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium text-sm transition-all ${viewMode === 'groups' ? 'bg-white text-gov-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Users className="w-4 h-4" />
                  {TEXTS.viewGroups[lang]}
              </button>
          </div>
      </div>

      {/* ==================== VIEW MODE: CONTACTS ==================== */}
      {viewMode === 'contacts' && (
      <>
      {/* Directory Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-center sticky top-0 z-20">
        <div>
           <h2 className="text-2xl font-bold text-gov-900">{TEXTS.directory[lang]}</h2>
           <p className="text-gray-500 text-sm mt-1">
             {lang === 'fr' ? 'Liste complète des points focaux' : 'القائمة الكاملة لنقاط الاتصال'}
           </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            {isSuperAdmin && (
                <button 
                    onClick={() => openEditModal()}
                    className="flex items-center justify-center gap-2 bg-gov-600 hover:bg-gov-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm font-bold"
                >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'fr' ? 'Ajouter' : 'إضافة'}</span>
                </button>
            )}

            <div className="relative flex-1 md:w-64 w-full">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`} />
                <input 
                    type="text" 
                    placeholder={TEXTS.searchPlaceholder[lang]}
                    className={`w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gov-500 outline-none text-sm ${isRTL ? 'text-right pl-10 pr-4' : ''}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    dir={isRTL ? 'rtl' : 'ltr'}
                />
            </div>
            
             <button 
                onClick={handleSelectAll}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedIds.size === filteredContacts.length && filteredContacts.length > 0 ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                title={TEXTS.selectAll[lang]}
            >
                {selectedIds.size === filteredContacts.length && filteredContacts.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>

            <div className="flex gap-2 w-full md:w-auto">
                 <button 
                    onClick={() => exportContactsToCSV(contacts)}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg text-sm transition-colors flex-1"
                    title={TEXTS.exportSheets[lang]}
                  >
                     <FileSpreadsheet className="w-4 h-4" />
                     <span className="md:hidden lg:inline">{lang === 'fr' ? 'Export' : 'تصدير'}</span>
                 </button>
                 <button 
                    onClick={() => importInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg text-sm transition-colors flex-1"
                    title={TEXTS.importSheets[lang]}
                  >
                     <Upload className="w-4 h-4" />
                     <span className="md:hidden lg:inline">{lang === 'fr' ? 'Import' : 'استيراد'}</span>
                     <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImport} />
                 </button>
            </div>
        </div>
      </div>

      {/* BULK ACTION TOOLBAR */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col animate-fade-in shadow-sm sticky top-24 z-10 gap-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow">
                        {selectedIds.size}
                    </div>
                    <div className="text-indigo-900 font-bold">
                        {TEXTS.bulkActions[lang]}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => handleBulkEmail()}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
                    >
                        <Mail className="w-4 h-4" />
                        {TEXTS.sendGroupEmail[lang]}
                    </button>
                    <button 
                        onClick={() => handleBulkCopy('email')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 font-medium transition-colors shadow-sm"
                    >
                        <Copy className="w-4 h-4" />
                        {TEXTS.copyEmails[lang]}
                    </button>
                    <button 
                        onClick={() => handleBulkCopy('phone')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 font-medium transition-colors shadow-sm"
                    >
                        <Smartphone className="w-4 h-4" />
                        {TEXTS.copyPhones[lang]}
                    </button>
                     <button 
                        onClick={() => setIsCreatingGroup(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Bookmark className="w-4 h-4" />
                        {TEXTS.createGroup[lang]}
                    </button>
                    <button 
                        onClick={() => setSelectedIds(new Set())}
                        className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-2 rounded-lg transition-colors"
                        title={TEXTS.deselectAll[lang]}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Create Group Inline Form */}
            {isCreatingGroup && (
                <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-100 flex gap-2 items-center animate-fade-in">
                    <input 
                        type="text" 
                        placeholder={TEXTS.groupNamePlaceholder[lang]}
                        className="flex-1 border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        autoFocus
                    />
                    <button 
                        onClick={saveGroup}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold"
                    >
                        {TEXTS.submit[lang]}
                    </button>
                    <button 
                        onClick={() => setIsCreatingGroup(false)}
                        className="text-gray-500 hover:text-gray-700 px-2"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      )}

      {/* Cards Grid (Contacts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => {
          const ministryAssets = assets.filter(a => a.ministryId === contact.id);
          const totalValue = ministryAssets.reduce((sum, a) => sum + (a.currentValue || a.value), 0);
          const { status } = calculateStatus(ministryAssets);
          const isSelected = selectedIds.has(contact.id);

          return (
            <div 
                key={contact.id} 
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all flex flex-col relative group ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/10' : 'border-gray-200'}`}
            >
              <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
                  <div 
                    onClick={() => toggleSelect(contact.id)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors shadow-sm
                        ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 hover:border-indigo-400'}`}
                  >
                      {isSelected && <CheckSquare className="w-4 h-4" />}
                  </div>
              </div>

              <div className="p-5 border-b border-gray-100 flex justify-between items-start pl-12">
                <div className="pr-2">
                  <h3 className="font-bold text-lg text-gov-900 leading-snug mb-1">{contact.name[lang]}</h3>
                  <p className="text-sm text-gov-600 font-medium">{contact.department[lang]}</p>
                </div>
                <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                  {getStatusLabel(status)}
                </div>
              </div>

              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {lang === 'fr' ? 'Patrimoine Déclaré' : 'الأصول المصرح بها'}
                      </span>
                      <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {ministryAssets.length} {lang === 'fr' ? 'Biens' : 'أصول'}
                          </span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-green-700 text-lg font-mono">
                          {formatCurrency(totalValue)} <span className="text-xs text-gray-500">MRU</span>
                      </span>
                  </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                <div className="flex items-start gap-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <UserCheck className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{contact.representative}</p>
                    <p className="text-xs text-gray-500">{contact.role[lang]}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white px-5 py-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                <button
                    onClick={() => handleWhatsApp(contact.phone)}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  {lang === 'fr' ? 'Chat' : 'دردشة'}
                </button>
                <button
                      onClick={() => window.location.href = `mailto:${contact.email}`}
                      className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    {lang === 'fr' ? 'Email' : 'بريد'}
                  </button>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* ==================== VIEW MODE: GROUPS ==================== */}
      {viewMode === 'groups' && (
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Layers className="w-6 h-6 text-indigo-600" />
                      {TEXTS.workGroups[lang]}
                  </h2>
                  <button 
                    onClick={() => { setViewMode('contacts'); alert(lang === 'fr' ? "Sélectionnez des contacts dans la liste et cliquez sur 'Créer un groupe'" : "حدد جهات الاتصال من القائمة وانقر على 'إنشاء مجموعة'"); }}
                    className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
                  >
                      <Plus className="w-4 h-4" />
                      {TEXTS.createGroup[lang]}
                  </button>
              </div>

              {groups.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">{TEXTS.noGroups[lang]}</p>
                      <button 
                        onClick={() => setViewMode('contacts')}
                        className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                      >
                          {lang === 'fr' ? 'Aller à la liste pour créer un groupe' : 'اذهب إلى القائمة لإنشاء مجموعة'}
                      </button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groups.map(group => {
                          const members = contacts.filter(c => group.contactIds.includes(c.id));
                          
                          return (
                              <div key={group.id} className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                                  <div className="bg-gradient-to-r from-indigo-50 to-white p-5 border-b border-indigo-50 flex justify-between items-start">
                                      <div>
                                          <h3 className="text-lg font-bold text-indigo-900">{group.name}</h3>
                                          <p className="text-xs text-indigo-600 font-medium mt-1">
                                              {members.length} {TEXTS.groupMembers[lang]}
                                          </p>
                                      </div>
                                      <div className="p-2 bg-white rounded-full shadow-sm">
                                          <Users className="w-5 h-5 text-indigo-500" />
                                      </div>
                                  </div>

                                  <div className="p-5 flex-1">
                                      <div className="flex -space-x-2 mb-6 overflow-hidden py-1">
                                          {members.slice(0, 5).map(m => (
                                              <div key={m.id} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm" title={m.name[lang]}>
                                                  {m.name[lang].charAt(0)}
                                              </div>
                                          ))}
                                          {members.length > 5 && (
                                              <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                  +{members.length - 5}
                                              </div>
                                          )}
                                      </div>

                                      <div className="space-y-3">
                                          <button 
                                            onClick={() => onMessageGroup && onMessageGroup(group)}
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold transition-colors text-sm shadow-sm"
                                          >
                                              <MessageCircle className="w-4 h-4" />
                                              {lang === 'fr' ? 'Message Groupe' : 'مراسلة المجموعة'}
                                              <ArrowRight className="w-3 h-3" />
                                          </button>
                                          
                                          <div className="flex gap-2">
                                              <button 
                                                onClick={() => handleBulkCopy('phone', group.contactIds)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-3 rounded-lg font-bold transition-colors text-sm border border-green-200"
                                                title={TEXTS.copyAllNumbers[lang]}
                                              >
                                                  <Copy className="w-4 h-4" />
                                                  {lang === 'fr' ? 'Numéros' : 'الأرقام'}
                                              </button>
                                              <button 
                                                onClick={() => handleBulkCopy('email', group.contactIds)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-lg font-bold transition-colors text-sm border border-blue-200"
                                                title={TEXTS.copyEmails[lang]}
                                              >
                                                  <Copy className="w-4 h-4" />
                                                  Emails
                                              </button>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="bg-gray-50 p-3 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100">
                                      <span>ID: {group.id.substr(0, 8)}</span>
                                      {onDeleteGroup && (
                                          <button 
                                            onClick={() => { if(confirm(TEXTS.deleteGroupConfirm[lang])) onDeleteGroup(group.id); }}
                                            className="text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
                                          >
                                              <Trash2 className="w-3 h-3" />
                                              {lang === 'fr' ? 'Supprimer' : 'حذف'}
                                          </button>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

    </div>
  );
};

export default ContactDirectory;
