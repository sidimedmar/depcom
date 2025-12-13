
import React, { useState, useRef, useEffect } from 'react';
import { Language, Translation } from '../types';
import { Save, RotateCcw, Type, Download, Upload, Database, AlertTriangle, Monitor, LogIn, Menu as MenuIcon, Table, Link } from 'lucide-react';
import { getAppTexts, saveAppTexts, resetAppTexts, createFullBackup, restoreFullBackup, getGoogleSheetUrl, saveGoogleSheetUrl } from '../services/settingsService';

interface Props {
  lang: Language;
  onUpdate: (newTexts: Translation) => void;
}

const Settings: React.FC<Props> = ({ lang, onUpdate }) => {
  const [texts, setTexts] = useState<Translation>(getAppTexts());
  const [sheetUrl, setSheetUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
      setSheetUrl(getGoogleSheetUrl());
  }, []);

  // Categorized keys for better UI organization
  const GROUPS = [
      {
          id: 'general',
          icon: Monitor,
          title: lang === 'fr' ? 'Général' : 'عام',
          keys: ['appTitle']
      },
      {
          id: 'login',
          icon: LogIn,
          title: lang === 'fr' ? 'Page de Connexion' : 'صفحة الدخول',
          keys: ['loginTitle', 'username', 'password', 'loginButton']
      },
      {
          id: 'menu',
          icon: MenuIcon,
          title: lang === 'fr' ? 'Menus de Navigation' : 'قوائم التصفح',
          keys: ['dashboard', 'directory', 'map', 'declaration', 'assistant', 'users', 'settings']
      }
  ];

  const handleChange = (key: string, subKey: 'fr' | 'ar', value: string) => {
    setTexts(prev => {
        const currentKeyObj = prev[key] || { fr: '', ar: '' };
        return {
          ...prev,
          [key]: {
            ...currentKeyObj,
            [subKey]: value
          }
        };
    });
  };

  const handleSave = () => {
    saveAppTexts(texts);
    saveGoogleSheetUrl(sheetUrl);
    onUpdate(texts);
    alert(lang === 'fr' ? "Modifications enregistrées !" : "تم حفظ التغييرات!");
  };

  const handleSaveUrlOnly = () => {
      saveGoogleSheetUrl(sheetUrl);
      alert(lang === 'fr' ? "URL Google Sheets sauvegardée avec succès !" : "تم حفظ رابط Google Sheets بنجاح!");
  };

  const handleReset = () => {
    if (confirm(lang === 'fr' ? "Réinitialiser tous les textes par défaut ?" : "إعادة تعيين جميع النصوص إلى الافتراضي؟")) {
      const defaults = resetAppTexts();
      setTexts(defaults);
      onUpdate(defaults);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          if (confirm(lang === 'fr' ? "Attention: Cela remplacera toutes les données actuelles (Utilisateurs, Biens, Textes). Continuer ?" : "تحذير: سيؤدي هذا إلى استبدال كافة البيانات الحالية. متابعة؟")) {
              try {
                  await restoreFullBackup(e.target.files[0]);
                  alert(lang === 'fr' ? "Restauration réussie ! La page va se recharger." : "تمت الاستعادة بنجاح! سيتم إعادة تحميل الصفحة.");
                  window.location.reload();
              } catch (err) {
                  alert("Erreur fichier invalide");
              }
          }
      }
  };

  const getLabel = (key: string) => {
      switch(key) {
          case 'appTitle': return 'Titre Principal / العنوان الرئيسي';
          
          case 'loginTitle': return 'Titre (Carte Login) / عنوان البطاقة';
          case 'username': return 'Label "Utilisateur" / تسمية المستخدم';
          case 'password': return 'Label "Mot de passe" / تسمية كلمة المرور';
          case 'loginButton': return 'Bouton de connexion / زر الدخول';

          case 'dashboard': return 'Tableau de bord / لوحة القيادة';
          case 'directory': return 'Annuaire / الدليل';
          case 'map': return 'Cartographie / الخريطة';
          case 'declaration': return 'Gestion Biens / إدارة الممتلكات';
          case 'assistant': return 'Assistant IA / المساعد الذكي';
          case 'users': return 'Utilisateurs / المستخدمين';
          case 'settings': return 'Paramètres / الإعدادات';
          default: return key;
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center sticky top-0 z-10">
        <div>
            <h2 className="text-2xl font-bold text-gov-900">
                {lang === 'fr' ? 'Paramètres Globaux' : 'الإعدادات العامة'}
            </h2>
            <p className="text-gray-500 text-sm">
                {lang === 'fr' ? 'Personnalisation des textes et Sauvegarde des données' : 'تخصيص النصوص ونسخ البيانات احتياطيًا'}
            </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-red-600 text-xs px-3 py-2 rounded-lg transition-colors font-medium"
            >
                <RotateCcw className="w-4 h-4" />
                {lang === 'fr' ? 'Réinitialiser Textes' : 'إعادة تعيين النصوص'}
            </button>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-gov-600 hover:bg-gov-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-transform active:scale-95"
            >
                <Save className="w-4 h-4" />
                {lang === 'fr' ? 'Tout Enregistrer' : 'حفظ الكل'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Text Editors */}
          <div className="lg:col-span-2 space-y-6">
              {/* GOOGLE SHEETS INTEGRATION */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-green-50 border-b border-green-100 flex items-center gap-2 font-bold text-green-800">
                      <Table className="w-5 h-5" />
                      {lang === 'fr' ? 'Synchronisation Google Sheets' : 'مزامنة جوجل شيت'}
                  </div>
                  <div className="p-6 space-y-3">
                      <p className="text-xs text-gray-600">
                          {lang === 'fr' 
                            ? "Entrez l'URL de votre script Google Apps (déployé en tant qu'application Web) pour recevoir automatiquement chaque nouvelle déclaration."
                            : "أدخل رابط سكريبت جوجل (المنشور كتطبيق ويب) لاستلام كل تصريح جديد تلقائيًا."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                              <Link className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                              <input 
                                  type="text" 
                                  placeholder="https://script.google.com/macros/s/..."
                                  className="w-full border-gray-300 rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-green-500"
                                  value={sheetUrl}
                                  onChange={(e) => setSheetUrl(e.target.value)}
                              />
                          </div>
                          <button 
                              onClick={handleSaveUrlOnly}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 justify-center whitespace-nowrap"
                          >
                              <Save className="w-4 h-4" />
                              {lang === 'fr' ? 'Sauvegarder URL' : 'حفظ الرابط'}
                          </button>
                      </div>
                  </div>
              </div>

              {GROUPS.map((group) => (
                  <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2 font-bold text-gov-800">
                          <group.icon className="w-5 h-5" />
                          {group.title}
                      </div>
                      <div className="p-6 grid gap-6">
                          {group.keys.map(key => (
                              <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-white border border-gray-100 hover:border-gov-200 transition-colors shadow-sm">
                                  <div className="md:col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                      <Type className="w-3 h-3" />
                                      {getLabel(key)}
                                  </div>
                                  
                                  {/* French Input */}
                                  <div>
                                      <label className="block text-[10px] text-blue-600 mb-1 font-bold">FRANÇAIS</label>
                                      <input 
                                          type="text" 
                                          className="w-full border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500 bg-gray-50 focus:bg-white"
                                          value={texts[key]?.fr || ''}
                                          onChange={(e) => handleChange(key, 'fr', e.target.value)}
                                      />
                                  </div>

                                  {/* Arabic Input */}
                                  <div dir="rtl">
                                      <label className="block text-[10px] text-green-600 mb-1 font-bold">العربية</label>
                                      <input 
                                          type="text" 
                                          className="w-full border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500 bg-gray-50 focus:bg-white"
                                          value={texts[key]?.ar || ''}
                                          onChange={(e) => handleChange(key, 'ar', e.target.value)}
                                      />
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>

          {/* RIGHT COLUMN: Backup & Info */}
          <div className="space-y-6">
               {/* Backup Section */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                   <div className="p-4 bg-gradient-to-r from-blue-600 to-gov-700 text-white flex items-center gap-2 font-bold">
                      <Database className="w-5 h-5" />
                      {lang === 'fr' ? 'Base de Données' : 'قاعدة البيانات'}
                   </div>
                   
                   <div className="p-6">
                       <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 flex gap-3">
                           <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                           <div className="text-xs text-yellow-800 leading-relaxed">
                               {lang === 'fr' 
                               ? "Les modifications de texte et les données sont locales. Pensez à exporter régulièrement." 
                               : "تعديلات النصوص والبيانات محلية. تذكر التصدير بانتظام."}
                           </div>
                       </div>

                       <div className="space-y-4">
                           {/* Export */}
                           <button 
                               onClick={createFullBackup}
                               className="w-full border border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 flex items-center gap-4 transition-all group text-left"
                           >
                               <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                   <Download className="w-5 h-5" />
                               </div>
                               <div>
                                   <h3 className="font-bold text-gray-800 text-sm">{lang === 'fr' ? 'Sauvegarder (Export)' : 'حفظ (تصدير)'}</h3>
                                   <p className="text-[10px] text-gray-500">JSON format</p>
                               </div>
                           </button>

                           {/* Import */}
                           <div 
                               onClick={() => fileInputRef.current?.click()}
                               className="w-full border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 flex items-center gap-4 transition-all group text-left cursor-pointer"
                           >
                               <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                   <Upload className="w-5 h-5" />
                               </div>
                               <div>
                                   <h3 className="font-bold text-gray-800 text-sm">{lang === 'fr' ? 'Restaurer (Import)' : 'استعادة (استيراد)'}</h3>
                                   <p className="text-[10px] text-gray-500">.json file</p>
                               </div>
                               <input 
                                   type="file" 
                                   ref={fileInputRef} 
                                   accept=".json" 
                                   className="hidden" 
                                   onChange={handleRestore}
                               />
                           </div>
                       </div>
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;
