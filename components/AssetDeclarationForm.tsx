
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AssetDeclaration, Language, MinistryContact, AssetStatus, Wilaya, AssetType, User, AssetDocument } from '../types';
import { TEXTS, WILAYAS, MINISTRY_STRUCTURES, ASSET_CATEGORIES } from '../constants';
import { parseCSV, exportToCSV, syncAssetToSheet } from '../services/sheetService';
import { Save, CheckCircle, MapPin, Calculator, Upload, ChevronRight, ChevronLeft, Building, Car, Laptop, Armchair, Hammer, Camera, X, Building2, FileText, Eye, AlertTriangle, Crosshair, Network, Plus, Download, Search, Filter, Edit2, Trash2, CheckSquare, Square, ArrowLeft, FileSpreadsheet, PlusCircle, Map } from 'lucide-react';

declare const L: any;

interface Props {
  lang: Language;
  contacts: MinistryContact[];
  currentUser: User;
  onSaveAsset: (asset: AssetDeclaration) => void;
  onAddContacts?: (contacts: MinistryContact[]) => void;
  editingAsset?: AssetDeclaration | null;
  onCancelEdit: () => void;
  // New props for List View
  assets?: AssetDeclaration[]; 
  onDeleteAsset?: (id: string) => void;
}

const ICON_MAP = {
  RealEstate: Building,
  Vehicle: Car,
  IT: Laptop,
  Furniture: Armchair,
  Equipment: Hammer
};

const AssetDeclarationForm: React.FC<Props> = ({ 
    lang, contacts, currentUser, onSaveAsset, onAddContacts, 
    editingAsset, onCancelEdit, assets = [], onDeleteAsset 
}) => {
  const isRTL = lang === 'ar';
  const isGlobalAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEPUTY_ADMIN';

  // --- VIEW MODE STATE (List vs Form) ---
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // --- FORM STATE ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AssetDeclaration>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [depreciatedValue, setDepreciatedValue] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AssetDocument | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isCustomSubEntity, setIsCustomSubEntity] = useState(false);
  const [isCustomMinistry, setIsCustomMinistry] = useState(false);
  const [customMinistryName, setCustomMinistryName] = useState({ fr: '', ar: '' });
  
  // --- LIST VIEW STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterMinistry, setFilterMinistry] = useState<string>(''); // For SuperAdmin
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const importMinistryRef = useRef<HTMLInputElement>(null);

  // Initialize Form or Switch View based on editingAsset prop change
  useEffect(() => {
    if (editingAsset) {
        initForm(editingAsset);
        setViewMode('form');
    } else {
        // If not editing, and we are just landing here, default to List
        if (viewMode === 'form' && !submitted) {
            // Keep current view if user is interacting
        }
    }
  }, [editingAsset]);

  const initForm = (asset?: AssetDeclaration) => {
      setStep(1);
      setErrors({});
      if (asset) {
          setFormData(asset);
          if (asset.ministryId && asset.subEntity) {
            const predefined = MINISTRY_STRUCTURES[asset.ministryId]?.map(e => e[lang]);
            if (predefined && !predefined.includes(asset.subEntity)) {
                setIsCustomSubEntity(true);
            }
          }
      } else {
          setFormData({
            type: 'RealEstate',
            condition: 'Good',
            reference: '',
            description: '',
            value: 0,
            wilaya: 'Nouakchott Ouest',
            locationDetails: '',
            ministryId: currentUser.ministryId || '',
            subEntity: '',
            acquisitionDate: new Date().toISOString().split('T')[0],
            coordinates: { lat: 18.0735, lng: -15.9582 },
            specificDetails: {},
            documents: []
          });
          setIsCustomSubEntity(false);
      }
  };

  const switchToCreate = () => {
      onCancelEdit(); // clear editing asset if any
      initForm();
      setViewMode('form');
  };

  const switchToList = () => {
      onCancelEdit();
      setViewMode('list');
      setSelectedIds(new Set());
  };

  // --- CALCULATIONS ---
  useEffect(() => {
    if (formData.value && formData.acquisitionDate) {
      const years = (new Date().getTime() - new Date(formData.acquisitionDate).getTime()) / (1000 * 3600 * 24 * 365);
      const rate = formData.type === 'Vehicle' || formData.type === 'IT' ? 0.20 : 0.05; 
      const val = Math.max(0, formData.value * (1 - (rate * years)));
      setDepreciatedValue(Math.round(val));
    }
  }, [formData.value, formData.acquisitionDate, formData.type]);

  const updateSpecific = (key: string, value: string) => {
      setFormData(prev => ({
          ...prev,
          specificDetails: { ...prev.specificDetails, [key]: value }
      }));
  };

  // --- LIST VIEW LOGIC ---
  const filteredAssets = useMemo(() => {
      let data = assets;
      // 1. Permission Filter
      if (!isGlobalAdmin) {
          data = data.filter(a => a.ministryId === currentUser.ministryId);
      } else if (filterMinistry) {
          // Admin specific filter
          data = data.filter(a => a.ministryId === filterMinistry);
      }

      // 2. Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(a => 
              a.reference.toLowerCase().includes(lower) || 
              a.description.toLowerCase().includes(lower) ||
              a.locationDetails.toLowerCase().includes(lower)
          );
      }
      // 3. Type Filter
      if (filterType) {
          data = data.filter(a => a.type === filterType);
      }
      return data;
  }, [assets, currentUser, searchTerm, filterType, filterMinistry, isGlobalAdmin]);

  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredAssets.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(filteredAssets.map(a => a.id)));
  };

  const handleBulkDelete = () => {
      if (!onDeleteAsset) return;
      if (confirm(lang === 'fr' 
          ? `Supprimer définitivement ${selectedIds.size} éléments ?` 
          : `حذف ${selectedIds.size} عنصر بشكل دائم؟`)) {
          selectedIds.forEach(id => onDeleteAsset(id));
          setSelectedIds(new Set());
      }
  };

  const handleBulkExport = () => {
      const selectedAssets = assets.filter(a => selectedIds.has(a.id));
      exportToCSV(selectedAssets);
  };

  // --- FORM LOGIC ---
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Géolocalisation non supportée / الموقع الجغرافي غير مدعوم");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          coordinates: { lat: parseFloat(position.coords.latitude.toFixed(6)), lng: parseFloat(position.coords.longitude.toFixed(6)) }
        }));
        setIsLocating(false);
      },
      () => { alert("Erreur GPS / خطأ GPS"); setIsLocating(false); }
    );
  };

  const handleMinistryImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && onAddContacts) {
          try {
             const data = await parseCSV(e.target.files[0]);
             const newMinistries: MinistryContact[] = data.map((row, idx) => ({
                 id: `imported-${Date.now()}-${idx}`,
                 name: { fr: row.NameFR || row.Nom || 'Unknown', ar: row.NameAR || row.NomAR || 'Unknown' },
                 department: { fr: row.Department || 'Direction', ar: row.DepartmentAR || 'Direction' },
                 representative: row.Representative || 'Unknown',
                 role: { fr: 'Point Focal', ar: 'نقطة اتصال' },
                 phone: row.Phone || '',
                 email: row.Email || '',
                 complianceStatus: 'pending'
             }));
             onAddContacts(newMinistries);
             alert(lang === 'fr' ? `${newMinistries.length} ministères ajoutés !` : `تمت إضافة ${newMinistries.length} وزارة!`);
          } catch (err) { alert("Erreur import CSV"); }
      }
  };

  const processFiles = (files: File[]) => {
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  const newDoc: AssetDocument = {
                      id: Math.random().toString(36).substr(2, 9),
                      name: file.name.split('.')[0] || 'Photo',
                      type: file.type.startsWith('image/') ? 'Photo' : 'Other',
                      url: event.target.result as string
                  };
                  setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), newDoc] }));
              }
          };
          reader.readAsDataURL(file);
      });
  };

  const validateStep = (currentStep: number): boolean => {
      const newErrors: Record<string, boolean> = {};
      let isValid = true;
      if (currentStep === 1) {
          if (!formData.reference?.trim()) { newErrors.reference = true; isValid = false; }
          if (!formData.acquisitionDate) { newErrors.acquisitionDate = true; isValid = false; }
          if (isGlobalAdmin) {
             if (isCustomMinistry) {
                 if(!customMinistryName.fr && !customMinistryName.ar) { newErrors.ministryId = true; isValid = false; }
             } else if (!formData.ministryId) { 
                 newErrors.ministryId = true; isValid = false; 
             }
          }
      }
      if (currentStep === 2) {
          if (!formData.value || formData.value <= 0) { newErrors.value = true; isValid = false; }
          if (!formData.locationDetails?.trim()) { newErrors.locationDetails = true; isValid = false; }
      }
      setErrors(newErrors);
      return isValid;
  };

  const handleNext = () => {
      if (validateStep(step)) {
          setStep(prev => prev + 1);
          setErrors({});
          window.scrollTo(0, 0);
      }
  };

  const handleFinalSubmit = () => {
    if (!validateStep(step)) return;
    let finalMinistryId = formData.ministryId;
    let finalMinistryName = null;

    if (isGlobalAdmin && isCustomMinistry && onAddContacts) {
        const newMinistry: MinistryContact = {
            id: `manual-${Date.now()}`,
            name: { fr: customMinistryName.fr || 'Nouveau Ministère', ar: customMinistryName.ar || 'وزارة جديدة' },
            department: { fr: 'Direction Générale', ar: 'الإدارة العامة' },
            representative: 'Admin',
            role: { fr: 'Responsable', ar: 'مسؤول' },
            phone: '',
            email: '',
            complianceStatus: 'pending'
        };
        onAddContacts([newMinistry]);
        finalMinistryId = newMinistry.id;
        finalMinistryName = newMinistry.name;
    } else {
        // Find name for existing ministry
        const contact = contacts.find(c => c.id === (finalMinistryId || currentUser.ministryId));
        if (contact) finalMinistryName = contact.name;
    }

    const assetToSave: AssetDeclaration = {
      id: editingAsset ? editingAsset.id : Math.random().toString(36).substr(2, 9),
      ministryId: finalMinistryId || currentUser.ministryId || contacts[0].id,
      subEntity: formData.subEntity || '',
      reference: formData.reference || `REF-${Math.floor(Math.random() * 10000)}`,
      type: formData.type as any,
      condition: formData.condition as AssetStatus,
      description: formData.description || '',
      value: formData.value || 0,
      currentValue: depreciatedValue,
      wilaya: formData.wilaya as Wilaya,
      locationDetails: formData.locationDetails || '',
      acquisitionDate: formData.acquisitionDate || new Date().toISOString().split('T')[0],
      coordinates: formData.coordinates || { lat: 18.0735, lng: -15.9582 },
      specificDetails: formData.specificDetails || {},
      documents: formData.documents || []
    };
    
    // 1. Save locally
    onSaveAsset(assetToSave);

    // 2. Sync to Google Sheets if URL is configured
    if (finalMinistryName) {
        syncAssetToSheet(assetToSave, finalMinistryName);
    }
    
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      switchToList(); // Return to list after save
    }, 1500);
  };

  // --- RENDER HELPERS ---
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'NeedsRepair': return 'bg-yellow-100 text-yellow-800';
      case 'Damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- RENDER LIST VIEW ---
  const renderList = () => (
      <div className="space-y-6 animate-fade-in relative pb-24">
          {/* List Header */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-gov-900">{TEXTS.myAssets[lang]}</h2>
                  <p className="text-gray-500 text-sm">
                      {isGlobalAdmin 
                        ? (lang === 'fr' ? 'Vue globale du patrimoine de l\'État par Ministère' : 'نظرة شاملة على ممتلكات الدولة حسب الوزارة')
                        : (lang === 'fr' ? `Gestion du patrimoine : ${contacts.find(c => c.id === currentUser.ministryId)?.name[lang] || ''}` : `إدارة الممتلكات`)}
                  </p>
              </div>
              <button 
                onClick={switchToCreate}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-md font-bold flex items-center gap-2 transition-transform active:scale-95"
              >
                  <PlusCircle className="w-5 h-5" />
                  <span className="uppercase tracking-wide text-sm">{TEXTS.newAsset[lang]}</span>
              </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                  <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`} />
                  <input 
                    type="text" 
                    placeholder={TEXTS.searchPlaceholder[lang]}
                    className={`w-full border-gray-200 rounded-lg py-2.5 pl-4 focus:ring-2 focus:ring-gov-500 text-sm ${isRTL ? 'text-right pl-10 pr-4' : 'pr-10'}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                  {/* Super Admin & Deputy Admin Ministry Filter */}
                  {isGlobalAdmin && (
                      <div className="relative w-full md:w-64">
                           <Building2 className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`} />
                           <select 
                              className={`w-full border-gray-200 rounded-lg py-2.5 pl-4 appearance-none bg-white text-sm font-medium text-gray-700 ${isRTL ? 'text-right pl-10 pr-4' : 'pr-10'}`}
                              value={filterMinistry}
                              onChange={(e) => setFilterMinistry(e.target.value)}
                           >
                               <option value="">{lang === 'fr' ? 'Tous les Ministères' : 'جميع الوزارات'}</option>
                               {contacts.map(c => (
                                   <option key={c.id} value={c.id}>{c.name[lang]}</option>
                               ))}
                           </select>
                      </div>
                  )}

                  <div className="relative w-full md:w-48">
                       <Filter className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`} />
                       <select 
                          className={`w-full border-gray-200 rounded-lg py-2.5 pl-4 appearance-none bg-white text-sm ${isRTL ? 'text-right pl-10 pr-4' : 'pr-10'}`}
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                       >
                           <option value="">{lang === 'fr' ? 'Tous les types' : 'جميع الأنواع'}</option>
                           {ASSET_CATEGORIES.map(c => (
                               <option key={c.id} value={c.id}>{c.label[lang]}</option>
                           ))}
                       </select>
                  </div>
              </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
             <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex items-center justify-between animate-fade-in shadow-sm">
                 <div className="flex items-center gap-2 text-indigo-800 font-bold px-2">
                     <span className="bg-indigo-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                         {selectedIds.size}
                     </span>
                     <span className="text-sm">{TEXTS.bulkActions[lang]}</span>
                 </div>
                 <div className="flex gap-2">
                      <button 
                        onClick={handleBulkExport}
                        className="bg-white text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-50 flex items-center gap-2"
                      >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span className="hidden md:inline">Export CSV</span>
                      </button>
                      <button 
                        onClick={handleBulkDelete}
                        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                      >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden md:inline">{TEXTS.delete[lang]}</span>
                      </button>
                      <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-gray-600 px-2">
                          <X className="w-5 h-5" />
                      </button>
                 </div>
             </div>
          )}

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      {lang === 'fr' ? "Aucun bien trouvé pour cette sélection." : "لم يتم العثور على أي أصول لهذا الاختيار."}
                  </div>
              ) : (
                  filteredAssets.map(asset => {
                      const ministryName = contacts.find(c => c.id === asset.ministryId)?.name[lang];
                      return (
                      <div 
                        key={asset.id} 
                        className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all group relative ${selectedIds.has(asset.id) ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/10' : 'border-gray-200'}`}
                      >
                           {/* Selection Checkbox */}
                           <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={() => toggleSelect(asset.id)}
                                    className={`w-6 h-6 rounded border bg-white flex items-center justify-center transition-colors ${selectedIds.has(asset.id) ? 'border-indigo-600 text-indigo-600' : 'border-gray-300 text-transparent hover:border-indigo-400'}`}
                                >
                                    <CheckSquare className="w-4 h-4" />
                                </button>
                           </div>

                           {/* Card Actions */}
                           <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-gray-100">
                               <button 
                                    onClick={() => { initForm(asset); setViewMode('form'); }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                   <Edit2 className="w-4 h-4" />
                               </button>
                               {onDeleteAsset && (
                                   <button 
                                        onClick={() => { if(confirm(TEXTS.deleteConfirm[lang])) onDeleteAsset(asset.id); }}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                   >
                                       <Trash2 className="w-4 h-4" />
                                   </button>
                               )}
                           </div>

                           <div className="p-5 pl-12">
                               {isGlobalAdmin && (
                                   <div className="mb-2 inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                                       <Building2 className="w-3 h-3" />
                                       <span className="truncate max-w-[200px]">{ministryName}</span>
                                   </div>
                               )}
                               <div className="flex justify-between items-start mb-2">
                                   <div>
                                       <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{ASSET_CATEGORIES.find(c => c.id === asset.type)?.label[lang]}</span>
                                       <h3 className="font-bold text-gray-900 text-lg leading-tight">{asset.reference}</h3>
                                   </div>
                               </div>
                               <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">{asset.description || (lang === 'fr' ? 'Pas de description' : 'لا يوجد وصف')}</p>
                               
                               <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                                   <span className={`px-2 py-1 rounded ${getStatusColor(asset.condition)}`}>
                                       {TEXTS[`status${asset.condition}` as keyof typeof TEXTS]?.[lang]}
                                   </span>
                                   <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono">
                                       {new Intl.NumberFormat(lang === 'fr' ? 'fr-MR' : 'ar-MR').format(asset.value)} MRU
                                   </span>
                               </div>
                           </div>
                           <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                               <div className="flex items-center gap-1">
                                   <MapPin className="w-3 h-3" />
                                   <span className="truncate max-w-[120px]">{asset.wilaya}</span>
                               </div>
                               <div>{asset.acquisitionDate}</div>
                           </div>
                      </div>
                  )})
              )}
          </div>

          {/* Floating Action Button (FAB) for Mobile/Ease of use */}
          <button 
            onClick={switchToCreate}
            className="fixed bottom-8 right-8 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-50 md:hidden"
            title={TEXTS.newAsset[lang]}
          >
              <Plus className="w-8 h-8" />
          </button>
      </div>
  );

  // --- RENDER FORM VIEW ---
  const renderForm = () => (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0">
      {/* Preview Modal for Images */}
      {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewDoc(null)}>
              <div className="relative bg-white rounded-lg p-2 max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPreviewDoc(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full z-10 hover:bg-red-600 transition-colors">
                      <X className="w-5 h-5" />
                  </button>
                  <img src={previewDoc.url} alt="Preview" className="w-full h-auto rounded" />
                  <div className="mt-2 text-center font-bold text-gray-800">{previewDoc.name} ({previewDoc.type})</div>
              </div>
          </div>
      )}

      {/* Map Picker Modal */}
      {showMapPicker && (
        <LocationPickerModal 
            lang={lang}
            initialLat={formData.coordinates?.lat || 18.0735}
            initialLng={formData.coordinates?.lng || -15.9582}
            onConfirm={(lat: number, lng: number) => {
                setFormData(prev => ({ ...prev, coordinates: { lat, lng } }));
                setShowMapPicker(false);
            }}
            onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={switchToList}
            className="p-2 rounded-full hover:bg-white hover:shadow-sm text-gray-500 transition-all"
            title={TEXTS.backToList[lang]}
          >
              <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
              {editingAsset 
                ? (lang === 'fr' ? `Modification: ${editingAsset.reference}` : `تعديل: ${editingAsset.reference}`) 
                : TEXTS.newAsset[lang]}
          </h2>
      </div>

      {/* Stepper Header */}
      <div className="bg-white p-6 rounded-t-xl shadow-sm border-b border-gray-100 mb-6 sticky top-0 z-10">
        <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <StepIndicator num={1} label={TEXTS.step1[lang]} step={step} />
          <div className={`h-1 flex-1 mx-4 rounded ${step > 1 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
          <StepIndicator num={2} label={TEXTS.step2[lang]} step={step} />
          <div className={`h-1 flex-1 mx-4 rounded ${step > 2 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
          <StepIndicator num={3} label={TEXTS.step3[lang]} step={step} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 min-h-[500px]">
        {submitted ? (
           <div className="text-center py-20 animate-fade-in">
             <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
               <CheckCircle className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'fr' ? 'Enregistré avec succès' : 'تم الحفظ بنجاح'}</h3>
             <p className="text-gray-500">{lang === 'fr' ? 'Retour à la liste...' : 'العودة إلى القائمة...'}</p>
           </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="h-full flex flex-col justify-between">
            
            {/* STEP 1: IDENTIFICATION */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* 1.1 Context Banner */}
                {!isGlobalAdmin && currentUser.ministryId && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 flex items-center gap-3">
                         <div className="bg-blue-200 p-2 rounded text-blue-700"><Building2 className="w-5 h-5" /></div>
                         <div>
                             <p className="text-xs font-bold text-blue-600 uppercase">{lang === 'fr' ? 'Déclaration pour le compte de :' : 'تصريح لحساب:'}</p>
                             <h3 className="font-bold text-blue-900">{contacts.find(c => c.id === currentUser.ministryId)?.name[lang]}</h3>
                         </div>
                    </div>
                )}

                {/* 1.2 Ministry Selection (Super Admin & Deputy Admin) */}
                {isGlobalAdmin && (
                    <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-bold text-purple-900 flex items-center gap-2"><Building2 className="w-4 h-4" />{TEXTS.ministry[lang]} <span className="text-red-500">*</span></label>
                             <div className="flex gap-2">
                                 <button type="button" onClick={() => importMinistryRef.current?.click()} className="text-xs bg-white hover:bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 flex items-center gap-1">
                                     <Download className="w-3 h-3" /> {lang === 'fr' ? 'Importer Liste' : 'استيراد قائمة'}
                                     <input type="file" ref={importMinistryRef} className="hidden" accept=".csv" onChange={handleMinistryImport} />
                                 </button>
                             </div>
                        </div>
                        {!isCustomMinistry ? (
                            <>
                                <select 
                                    className={`w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-purple-500 bg-white ${errors.ministryId ? 'border-red-500' : ''}`}
                                    value={formData.ministryId}
                                    onChange={(e) => { setFormData({ ...formData, ministryId: e.target.value, subEntity: '' }); setIsCustomSubEntity(false); }}
                                >
                                    <option value="">-- {lang === 'fr' ? 'Sélectionner le propriétaire' : 'اختر المالك'} --</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
                                </select>
                                <button type="button" onClick={() => setIsCustomMinistry(true)} className="text-xs text-purple-600 hover:text-purple-800 text-start underline mt-2 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> {lang === 'fr' ? "Mon Ministère n'est pas dans la liste ? Saisir manuellement" : "وزارتي غير موجودة في القائمة؟ أدخل يدويًا"}
                                </button>
                            </>
                        ) : (
                             <div className="space-y-3 bg-white p-3 rounded border border-purple-200">
                                 <div className="flex justify-between"><p className="text-xs font-bold text-purple-800 uppercase">{lang === 'fr' ? 'Nouveau Ministère' : 'وزارة جديدة'}</p><button type="button" onClick={() => setIsCustomMinistry(false)}><X className="w-3 h-3" /></button></div>
                                 <input type="text" placeholder="Nom (Français)" className="w-full border-gray-300 rounded p-2 text-sm" value={customMinistryName.fr} onChange={e => setCustomMinistryName({...customMinistryName, fr: e.target.value})} />
                                 <input type="text" placeholder="الاسم (عربي)" className="w-full border-gray-300 rounded p-2 text-sm text-right" dir="rtl" value={customMinistryName.ar} onChange={e => setCustomMinistryName({...customMinistryName, ar: e.target.value})} />
                             </div>
                        )}
                    </div>
                )}

                {/* 1.3 Sub-Entity Selection */}
                {(formData.ministryId || isCustomMinistry) && (
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><Network className="w-4 h-4" />{TEXTS.subEntity[lang]}</label>
                        {!isCustomSubEntity ? (
                            <div className="flex flex-col gap-2">
                                <select 
                                    className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500 bg-white"
                                    value={formData.subEntity}
                                    onChange={(e) => setFormData({ ...formData, subEntity: e.target.value })}
                                    disabled={isCustomMinistry}
                                >
                                    <option value="">{TEXTS.selectSubEntity[lang]}</option>
                                    {!isCustomMinistry && MINISTRY_STRUCTURES[formData.ministryId!]?.map((entity, idx) => (
                                        <option key={idx} value={entity[lang]}>{entity[lang]}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => { setIsCustomSubEntity(true); setFormData({...formData, subEntity: ''}); }} className="text-xs text-gov-600 hover:text-gov-800 text-start underline mt-1">
                                    {lang === 'fr' ? "Ma direction n'est pas dans la liste ? Saisir manuellement" : "إدارتي غير موجودة في القائمة؟ أدخل يدويًا"}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <input type="text" className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500" placeholder={lang === 'fr' ? "Nom de la direction ou établissement..." : "اسم المديرية أو المؤسسة..."} value={formData.subEntity} onChange={(e) => setFormData({ ...formData, subEntity: e.target.value })} />
                                <button type="button" onClick={() => { setIsCustomSubEntity(false); setFormData({...formData, subEntity: ''}); }} className="text-xs text-gray-500 hover:text-gray-700 text-start underline mt-1">
                                    {lang === 'fr' ? "Retour à la liste" : "العودة إلى القائمة"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Asset Type */}
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-3">{TEXTS.assetType[lang]}</label>
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                     {ASSET_CATEGORIES.map((cat) => {
                       const Icon = ICON_MAP[cat.id as keyof typeof ICON_MAP] || Building;
                       return (
                       <div key={cat.id} onClick={() => setFormData({ ...formData, type: cat.id as any, specificDetails: {} })}
                        className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all ${formData.type === cat.id ? 'border-gov-500 bg-gov-50 text-gov-700 ring-2 ring-gov-500 shadow-sm' : 'border-gray-200 hover:border-gov-300 hover:bg-gray-50'}`}
                       >
                         <Icon className="w-6 h-6" />
                         <span className="text-xs font-medium text-center">{cat.label[lang]}</span>
                       </div>
                     )})}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{TEXTS.reference[lang]} <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Ex: V-2024-DGB-001" className={`w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500 ${errors.reference ? 'border-red-500 bg-red-50' : ''}`} value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{TEXTS.acquisitionDate[lang]} <span className="text-red-500">*</span></label>
                    <input type="date" className={`w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500 ${errors.acquisitionDate ? 'border-red-500' : ''}`} value={formData.acquisitionDate} onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })} />
                  </div>
                </div>
                
                {/* Specifics Rendering Wrapper */}
                <RenderSpecificFields formData={formData} lang={lang} updateSpecific={updateSpecific} />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{lang === 'fr' ? 'Description Générale' : 'الوصف العام'}</label>
                  <textarea rows={3} className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
              </div>
            )}

            {/* STEP 2: VALUATION & LOCATION */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 flex gap-4 items-start shadow-sm">
                   <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Calculator className="w-6 h-6" /></div>
                   <div>
                     <h4 className="font-bold text-blue-900 text-sm">{lang === 'fr' ? 'Estimation Automatique' : 'تقدير تلقائي'}</h4>
                     <p className="text-xs text-blue-700 mt-1 leading-relaxed">{lang === 'fr' ? 'La valeur amortie est calculée automatiquement.' : 'يتم حساب القيمة المستهلكة تلقائيًا.'}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{TEXTS.initialValue[lang]} <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type="number" className={`w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500 pl-4 ${errors.value ? 'border-red-500' : ''} ${isRTL ? 'text-left' : ''}`} value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })} />
                        <span className={`absolute top-3 text-gray-400 text-sm font-bold ${isRTL ? 'left-3' : 'right-3'}`}>MRU</span>
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{TEXTS.currentValue[lang]}</label>
                      <div className="w-full bg-gray-100 rounded-lg p-3 border border-gray-200 text-gray-600 font-mono font-bold flex justify-between items-center">
                        <span>{new Intl.NumberFormat('fr-MR').format(depreciatedValue)}</span><span className="text-xs text-gray-400">MRU</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{TEXTS.wilaya[lang]}</label>
                    <select className="w-full border-gray-300 rounded-lg p-3 border focus:ring-2 focus:ring-gov-500 bg-white" value={formData.wilaya} onChange={(e) => setFormData({ ...formData, wilaya: e.target.value as any })} dir="ltr">
                      {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{TEXTS.details[lang]} <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <MapPin className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                      <input type="text" className={`w-full border-gray-300 rounded-lg p-3 pl-10 border focus:ring-2 focus:ring-gov-500 ${errors.locationDetails ? 'border-red-500' : ''}`} placeholder="Quartier, Rue..." value={formData.locationDetails} onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })} dir={isRTL ? 'rtl' : 'ltr'} />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                         <div className="text-sm font-bold text-gray-700 flex items-center gap-2"><Crosshair className="w-4 h-4 text-gov-600" />{TEXTS.gps[lang]}</div>
                         <div className="flex gap-2">
                             <button type="button" onClick={() => setShowMapPicker(true)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors border border-indigo-200 font-medium">
                                <Map className="w-3 h-3" />
                                {lang === 'fr' ? 'Choisir sur carte' : 'اختر على الخريطة'}
                             </button>
                             <button type="button" onClick={handleGetLocation} disabled={isLocating} className="text-xs bg-gov-600 hover:bg-gov-700 text-white px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors disabled:opacity-50">
                                {isLocating ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span> : <MapPin className="w-3 h-3" />}
                                {lang === 'fr' ? 'Ma Position' : 'موقعي'}
                             </button>
                         </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500 mb-1">Latitude</label><input type="number" className="w-full border-gray-300 rounded-lg p-2 border text-sm font-mono" value={formData.coordinates?.lat} onChange={(e) => setFormData({ ...formData, coordinates: { lat: parseFloat(e.target.value), lng: formData.coordinates?.lng || 0 } })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Longitude</label><input type="number" className="w-full border-gray-300 rounded-lg p-2 border text-sm font-mono" value={formData.coordinates?.lng} onChange={(e) => setFormData({ ...formData, coordinates: { lat: formData.coordinates?.lat || 0, lng: parseFloat(e.target.value) } })} /></div>
                    </div>
                </div>
              </div>
            )}

            {/* STEP 3: EVIDENCE & PHOTOS */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{lang === 'fr' ? 'État Technique' : 'الحالة الفنية'}</label>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {['New', 'Good', 'NeedsRepair', 'Damaged', 'Obsolete'].map((status) => (
                      <label key={status} className={`flex-shrink-0 cursor-pointer border rounded-xl px-4 py-3 flex items-center gap-2 transition-all ${formData.condition === status ? 'bg-gov-50 border-gov-500 text-gov-700 shadow-sm ring-1 ring-gov-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="condition" value={status} checked={formData.condition === status} onChange={() => setFormData({...formData, condition: status as any})} className="text-gov-600 focus:ring-gov-500 w-4 h-4" />
                        <span className="text-sm font-medium">{TEXTS[`status${status}` as keyof typeof TEXTS]?.[lang] || status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg"><div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><FileText className="w-5 h-5" /></div>{TEXTS.upload[lang]}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-3">
                          <div className="flex gap-2">
                              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 bg-gov-600 hover:bg-gov-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm active:scale-95">
                                  <Camera className="w-5 h-5" /> {lang === 'fr' ? 'Photo' : 'صورة'}
                              </button>
                              <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => { if(e.target.files) processFiles(Array.from(e.target.files)); }} />
                          </div>
                          <div 
                              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group ${dragActive ? 'border-gov-500 bg-gov-50 scale-[1.01]' : 'border-gray-300 hover:border-gov-400 hover:bg-gray-50'}`}
                              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                              onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files)); }}
                              onClick={() => fileInputRef.current?.click()}
                          >
                              <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform"><Upload className={`w-8 h-8 ${dragActive ? 'text-gov-600' : 'text-gray-400'}`} /></div>
                              <p className="text-gray-700 font-semibold text-center">{TEXTS.dropzone[lang]}</p>
                              <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={(e) => { if(e.target.files) processFiles(Array.from(e.target.files)); }} />
                          </div>
                      </div>
                      
                      {/* File List */}
                      {formData.documents && formData.documents.length > 0 && (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                              {formData.documents.map((doc, index) => (
                                  <div key={index} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                      <div className="w-14 h-14 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative group" onClick={() => setPreviewDoc(doc)}>
                                          {doc.type === 'Photo' ? <img src={doc.url} className="w-full h-full object-cover" /> : <div className="flex justify-center items-center h-full"><FileText className="w-6 h-6 text-gray-400"/></div>}
                                      </div>
                                      <div className="flex-1">
                                          <input type="text" className="text-sm border-gray-200 rounded-md px-2 py-1.5 w-full mb-1" value={doc.name} onChange={(e) => { const newDocs = [...(formData.documents || [])]; newDocs[index].name = e.target.value; setFormData({...formData, documents: newDocs}); }} />
                                          <select className="text-xs border-gray-200 rounded-md px-2 py-1 bg-gray-50 w-full" value={doc.type} onChange={(e) => { const newDocs = [...(formData.documents || [])]; newDocs[index].type = e.target.value as any; setFormData({...formData, documents: newDocs}); }}>
                                              <option value="Photo">{TEXTS.docTypePhoto[lang]}</option>
                                              <option value="Invoice">{TEXTS.docTypeInvoice[lang]}</option>
                                          </select>
                                      </div>
                                      <button type="button" onClick={() => setFormData(p => ({...p, documents: p.documents?.filter((_, i) => i !== index)}))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className={`mt-8 pt-6 border-t border-gray-100 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> {TEXTS.prev[lang]}
                </button>
              ) : <div></div>}
              {step < 3 ? (
                <button type="button" onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gov-700 text-white font-medium hover:bg-gov-800 transition-colors shadow-sm">
                  {TEXTS.next[lang]} <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={handleFinalSubmit} className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 shadow-md transform active:scale-95 transition-all">
                  <Save className="w-4 h-4" /> {editingAsset ? TEXTS.update[lang] : TEXTS.submit[lang]}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return viewMode === 'list' ? renderList() : renderForm();
};

const LocationPickerModal = ({ lang, initialLat, initialLng, onConfirm, onClose }: any) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);
    const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });

    useEffect(() => {
        if (!mapRef.current) return;
        
        // Init map
        if(!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance.current);

            // Add initial marker
            markerInstance.current = L.marker([initialLat, initialLng]).addTo(mapInstance.current);

            // Click event
            mapInstance.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                const fixedLat = parseFloat(lat.toFixed(6));
                const fixedLng = parseFloat(lng.toFixed(6));
                setCoords({ lat: fixedLat, lng: fixedLng });
                markerInstance.current.setLatLng([fixedLat, fixedLng]);
            });
        }
        
        // Invalidate size to ensure tiles load correctly if modal animation affects layout
        setTimeout(() => {
            mapInstance.current?.invalidateSize();
        }, 100);

    }, []); // Run once on mount

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">
                        {lang === 'fr' ? 'Sélectionner un emplacement' : 'تحديد موقع'}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="relative w-full h-[500px]">
                    <div ref={mapRef} className="w-full h-full z-0" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg text-sm font-mono font-bold z-[1000] border border-gray-200">
                        {coords.lat}, {coords.lng}
                    </div>
                </div>
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">
                        {TEXTS.cancel[lang]}
                    </button>
                    <button 
                        onClick={() => onConfirm(coords.lat, coords.lng)}
                        className="px-6 py-2 bg-gov-600 text-white font-bold rounded-lg hover:bg-gov-700 flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {lang === 'fr' ? 'Confirmer' : 'تأكيد'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Component defined OUTSIDE to prevent re-mounting focus loss issues
const InputGroup = ({ label, value, field, updateSpecific }: { label: string, value: string, field: string, updateSpecific: (k: string, v: string) => void }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
        <input 
            type="text" 
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500" 
            value={value || ''} 
            onChange={e => updateSpecific(field, e.target.value)} 
        />
    </div>
);

// Sub-component for specific fields to keep main component cleaner
const RenderSpecificFields = ({ formData, lang, updateSpecific }: { formData: Partial<AssetDeclaration>, lang: Language, updateSpecific: (k: string, v: string) => void }) => {
    const details = formData.specificDetails || {};
    const type = formData.type as AssetType;

    if (type === 'Vehicle') return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 animate-fade-in">
            <div className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2"><Car className="w-5 h-5" /> {TEXTS.assetType[lang]}: {TEXTS.brand[lang]} & {TEXTS.model[lang]}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputGroup label={TEXTS.brand[lang]} value={details.brand as string} field="brand" updateSpecific={updateSpecific} />
                <InputGroup label={TEXTS.model[lang]} value={details.model as string} field="model" updateSpecific={updateSpecific} />
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.plateNumber[lang]}</label>
                    <input type="text" className="w-full border rounded-lg p-2 font-mono uppercase bg-white text-sm" value={details.plateNumber || ''} onChange={e => updateSpecific('plateNumber', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.chassisNumber[lang]}</label>
                    <input type="text" className="w-full border rounded-lg p-2 font-mono uppercase bg-white text-sm" value={details.chassisNumber || ''} onChange={e => updateSpecific('chassisNumber', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.mileage[lang]}</label>
                    <input type="number" className="w-full border rounded-lg p-2 text-sm" value={details.mileage || ''} onChange={e => updateSpecific('mileage', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.fuelType[lang]}</label>
                    <select className="w-full border rounded-lg p-2 bg-white text-sm" value={details.fuel || ''} onChange={e => updateSpecific('fuel', e.target.value)}>
                        <option value="">-</option>
                        <option value="Diesel">{TEXTS.fuelDiesel[lang]}</option>
                        <option value="Petrol">{TEXTS.fuelPetrol[lang]}</option>
                        <option value="Hybrid">{TEXTS.fuelHybrid[lang]}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.transmission[lang]}</label>
                    <select className="w-full border rounded-lg p-2 bg-white text-sm" value={details.transmission || ''} onChange={e => updateSpecific('transmission', e.target.value)}>
                        <option value="">-</option>
                        <option value="Manual">{TEXTS.transManual[lang]}</option>
                        <option value="Auto">{TEXTS.transAuto[lang]}</option>
                    </select>
                </div>
                <InputGroup label={TEXTS.powerCV[lang]} value={details.powerCV as string} field="powerCV" updateSpecific={updateSpecific} />
            </div>
        </div>
    );

    if (type === 'RealEstate') return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 animate-fade-in">
             <div className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2"><Building className="w-5 h-5" /> {TEXTS.assetType[lang]}: {lang === 'fr' ? 'Détails Foncier' : 'تفاصيل العقار'}</div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.surfaceArea[lang]}</label><input type="number" className="w-full border rounded-lg p-2 text-sm" value={details.surfaceArea || ''} onChange={e => updateSpecific('surfaceArea', e.target.value)} /></div>
                 <InputGroup label={TEXTS.landTitle[lang]} value={details.landTitle as string} field="landTitle" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.cadastralRef[lang]} value={details.cadastralRef as string} field="cadastralRef" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.usage[lang]} value={details.usage as string} field="usage" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.floors[lang]} value={details.floors as string} field="floors" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.constructionYear[lang]} value={details.constructionYear as string} field="constructionYear" updateSpecific={updateSpecific} />
             </div>
        </div>
    );

    if (type === 'IT') return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 animate-fade-in">
             <div className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2"><Laptop className="w-5 h-5" /> {TEXTS.assetType[lang]}: {TEXTS.deviceType[lang]}</div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.deviceType[lang]}</label>
                    <select className="w-full border rounded-lg p-2 bg-white text-sm" value={details.deviceType || ''} onChange={e => updateSpecific('deviceType', e.target.value)}>
                        <option value="">-</option>
                        <option value="Laptop">PC Portable</option>
                        <option value="Desktop">PC Bureau</option>
                        <option value="Server">Serveur</option>
                        <option value="Printer">Imprimante</option>
                    </select>
                 </div>
                 <InputGroup label={TEXTS.brand[lang]} value={details.brand as string} field="brand" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.model[lang]} value={details.model as string} field="model" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.specs[lang]} value={details.specs as string} field="specs" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.ram[lang]} value={details.ram as string} field="ram" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.storage[lang]} value={details.storage as string} field="storage" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.serialNumber[lang]} value={details.serialNumber as string} field="serialNumber" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.os[lang]} value={details.os as string} field="os" updateSpecific={updateSpecific} />
             </div>
        </div>
    );

    if (type === 'Furniture') return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 animate-fade-in">
             <div className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2"><Armchair className="w-5 h-5" /> {TEXTS.assetType[lang]}: {TEXTS.category[lang]}</div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <InputGroup label={TEXTS.category[lang]} value={details.category as string} field="category" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.material[lang]} value={details.material as string} field="material" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.color[lang]} value={details.color as string} field="color" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.dimensions[lang]} value={details.dimensions as string} field="dimensions" updateSpecific={updateSpecific} />
                 <div><label className="block text-xs font-semibold text-gray-500 mb-1">{TEXTS.quantity[lang]}</label><input type="number" className="w-full border rounded-lg p-2 text-sm" value={details.quantity || ''} onChange={e => updateSpecific('quantity', e.target.value)} /></div>
             </div>
        </div>
    );

    if (type === 'Equipment') return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 animate-fade-in">
             <div className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2"><Hammer className="w-5 h-5" /> {TEXTS.assetType[lang]}: {TEXTS.details[lang]}</div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <InputGroup label={TEXTS.manufacturer[lang]} value={details.manufacturer as string} field="manufacturer" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.model[lang]} value={details.model as string} field="model" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.modelNumber[lang]} value={details.modelNumber as string} field="modelNumber" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.powerSupply[lang]} value={details.powerSupply as string} field="powerSupply" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.maintenanceFreq[lang]} value={details.maintenanceFreq as string} field="maintenanceFreq" updateSpecific={updateSpecific} />
                 <InputGroup label={TEXTS.warranty[lang]} value={details.warranty as string} field="warranty" updateSpecific={updateSpecific} />
             </div>
        </div>
    );

    return null;
};

const StepIndicator = ({ num, label, step }: { num: number, label: string, step: number }) => (
    <div className={`flex items-center ${step === num ? 'text-gov-700 font-bold' : 'text-gray-400'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 transition-colors ${step === num ? 'border-gov-700 bg-gov-50' : step > num ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200'}`}>
        {step > num ? <CheckCircle className="w-5 h-5" /> : num}
      </div>
      <span className="hidden md:inline text-sm">{label}</span>
    </div>
);

export default AssetDeclarationForm;
