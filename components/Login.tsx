
import React, { useState, useEffect } from 'react';
import { Language, Translation, User, MinistryContact } from '../types';
import { authenticate, getUsers, registerUser } from '../services/authService';
import { Lock, User as UserIcon, ChevronRight, Building2, UserPlus, ArrowLeft, PlusCircle } from 'lucide-react';

interface Props {
  lang: Language;
  onLogin: (user: User) => void;
  appTexts: Translation;
  contacts: MinistryContact[];
  onRegisterNewMinistry?: (contacts: MinistryContact[]) => void;
}

const Login: React.FC<Props> = ({ lang, onLogin, appTexts, contacts, onRegisterNewMinistry }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Registration State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMinistryId, setRegMinistryId] = useState('');
  const [regError, setRegError] = useState('');

  // Custom Ministry State
  const [customMinistry, setCustomMinistry] = useState({ fr: '', ar: '' });

  const isRTL = lang === 'ar';

  useEffect(() => {
    // Load users from storage to display available profiles
    const allUsers = getUsers();
    const publicUsers = allUsers.filter(u => u.role !== 'SUPER_ADMIN');
    setAvailableUsers(publicUsers);
  }, [isRegistering]); // Reload when switching modes or after registration

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = authenticate(username.trim(), password.trim());
    if (user) {
      onLogin(user);
    } else {
      setError(true);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setRegError('');

      let finalMinistryId = regMinistryId;

      // Handle custom ministry creation
      if (regMinistryId === 'NEW') {
          if (!customMinistry.fr.trim() || !customMinistry.ar.trim()) {
              setRegError(lang === 'fr' ? 'Veuillez saisir le nom du ministère (FR et AR).' : 'يرجى إدخال اسم الوزارة (بالفرنسية والعربية).');
              return;
          }

          if (onRegisterNewMinistry) {
              const newMinistry: MinistryContact = {
                  id: `manual-${Date.now()}`,
                  name: { fr: customMinistry.fr, ar: customMinistry.ar },
                  department: { fr: 'Direction Générale', ar: 'الإدارة العامة' }, // Default
                  representative: regFullName,
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

      if(!finalMinistryId) {
          setRegError(lang === 'fr' ? 'Veuillez sélectionner un ministère.' : 'يرجى اختيار الوزارة.');
          return;
      }

      const newUser = registerUser({
          fullName: regFullName,
          username: regUsername,
          password: regPassword,
          ministryId: finalMinistryId
      });

      if (newUser) {
          alert(lang === 'fr' ? 'Compte créé avec succès ! Connectez-vous maintenant.' : 'تم إنشاء الحساب بنجاح! قم بتسجيل الدخول الآن.');
          setIsRegistering(false);
          // Pre-fill login
          setUsername(regUsername);
          setPassword(regPassword);
          setRegMinistryId('');
          setCustomMinistry({ fr: '', ar: '' });
      } else {
          setRegError(lang === 'fr' ? 'Ce nom d\'utilisateur est déjà pris.' : 'اسم المستخدم هذا مأخوذ بالفعل.');
      }
  };

  const handleSelectProfile = (u: User) => {
      setUsername(u.username);
      const pwdInput = document.getElementById('password-input');
      if (pwdInput) pwdInput.focus();
  };

  const getMinistryName = (user: User) => {
      if (!user.ministryId) return null;
      const ministry = contacts.find(c => c.id === user.ministryId);
      return ministry ? ministry.name[lang] : null;
  };

  return (
    <div className="min-h-screen bg-gov-900 flex items-center justify-center p-4">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden min-h-[550px]">
        
        {/* Left Side: Forms */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center relative z-10 transition-all">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-16 mb-4 rounded shadow-sm overflow-hidden border border-gray-100">
                    <svg viewBox="0 0 900 600" className="w-full h-full object-cover">
                        {/* Green Background */}
                        <rect width="900" height="600" fill="#006233"/>
                        {/* Red Stripes */}
                        <rect width="900" height="90" fill="#D01C1F"/>
                        <rect y="510" width="900" height="90" fill="#D01C1F"/>
                        
                        {/* Crescent (Gold circle minus Green circle) */}
                        <circle cx="450" cy="320" r="150" fill="#FFC400"/>
                        <circle cx="450" cy="290" r="140" fill="#006233"/>
                        
                        {/* Star (Gold) */}
                        <polygon fill="#FFC400" points="450,190 468,245 526,245 479,279 497,334 450,300 403,334 421,279 374,245 432,245"/>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gov-900 mb-2">{appTexts.appTitle[lang]}</h2>
                <p className="text-gray-500 text-sm">
                    {isRegistering 
                        ? (lang === 'fr' ? "Création de profil Point Focal" : "إنشاء ملف تعريف نقطة الاتصال")
                        : appTexts.loginTitle[lang]
                    }
                </p>
            </div>

            {!isRegistering ? (
                // LOGIN FORM
                <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{appTexts.username[lang]}</label>
                        <div className="relative">
                            <UserIcon className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`} />
                            <input 
                                type="text" 
                                className={`w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-gov-500 pl-4 ${isRTL ? 'pl-10 text-right' : 'pr-10'}`}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{appTexts.password[lang]}</label>
                        <div className="relative">
                            <Lock className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`} />
                            <input 
                                id="password-input"
                                type="password" 
                                className={`w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-gov-500 pl-4 ${isRTL ? 'pl-10 text-right' : 'pr-10'}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="*******"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium border border-red-100 animate-pulse">
                            {appTexts.errorLogin[lang]}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-gov-700 hover:bg-gov-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl transform active:scale-95"
                    >
                        {appTexts.loginButton[lang]}
                    </button>

                    <div className="text-center mt-4">
                        <button 
                            type="button"
                            onClick={() => setIsRegistering(true)}
                            className="text-sm text-gov-600 hover:text-gov-800 underline font-medium"
                        >
                            {lang === 'fr' ? "Pas de compte ? Créer un profil" : "لا تملك حسابا؟ إنشاء ملف تعريف"}
                        </button>
                    </div>
                </form>
            ) : (
                // REGISTER FORM
                <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'fr' ? 'Nom Complet' : 'الاسم الكامل'}</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500"
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            placeholder={lang === 'fr' ? "Ex: Mohamed Ould..." : "مثال: محمد ولد..."}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{appTexts.ministry[lang]}</label>
                        <select 
                            required
                            className="w-full border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500 bg-white"
                            value={regMinistryId}
                            onChange={(e) => setRegMinistryId(e.target.value)}
                        >
                            <option value="">-- {lang === 'fr' ? 'Choisir votre département' : 'اختر إدارتك'} --</option>
                            {contacts.map(c => (
                                <option key={c.id} value={c.id}>{c.name[lang]}</option>
                            ))}
                            <option value="NEW" className="font-bold text-gov-600 bg-gray-50">
                                + {lang === 'fr' ? 'Autre (Ajouter manuellement)' : 'آخر (إضافة يدويا)'}
                            </option>
                        </select>
                    </div>

                    {/* Manual Ministry Input */}
                    {regMinistryId === 'NEW' && (
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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{appTexts.username[lang]}</label>
                            <input 
                                type="text" 
                                required
                                className="w-full border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500"
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{appTexts.password[lang]}</label>
                            <input 
                                type="password" 
                                required
                                className="w-full border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-gov-500"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {regError && (
                        <div className="p-2 bg-red-50 text-red-600 text-xs rounded text-center font-bold">
                            {regError}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        {lang === 'fr' ? "S'inscrire" : "تسجيل"}
                    </button>

                    <div className="text-center mt-2">
                        <button 
                            type="button"
                            onClick={() => setIsRegistering(false)}
                            className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            {lang === 'fr' ? "Retour connexion" : "عودة"}
                        </button>
                    </div>
                </form>
            )}
        </div>

        {/* Right Side: Available Profiles List */}
        <div className="w-full md:w-1/2 bg-gray-50 border-l border-gray-200 p-8 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                {lang === 'fr' ? 'Comptes Disponibles' : 'الحسابات المتاحة'}
            </h3>
            
            <div className="space-y-3">
                {availableUsers.map(u => {
                    const ministryName = getMinistryName(u);
                    return (
                        <div 
                            key={u.id}
                            onClick={() => {
                                setIsRegistering(false);
                                handleSelectProfile(u);
                            }}
                            className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-gov-500 hover:shadow-md transition-all group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center font-bold text-sm
                                    ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}
                                `}>
                                    {u.fullName.charAt(0)}
                                </div>
                                <div className="text-left w-full overflow-hidden">
                                    <p className="font-bold text-gray-800 text-sm truncate">{u.fullName}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        @{u.username}
                                    </p>
                                    {ministryName && (
                                        <div className="flex items-center gap-1 text-[10px] text-gov-600 mt-1 truncate font-medium">
                                            <Building2 className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{ministryName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-300 group-hover:text-gov-500 shrink-0 ${isRTL ? 'transform rotate-180' : ''}`} />
                        </div>
                    );
                })}

                {availableUsers.length === 0 && (
                    <div className="text-center py-10 text-gray-400 italic text-sm border border-dashed rounded-xl">
                        {lang === 'fr' 
                          ? "Aucun compte public." 
                          : "لا يوجد حساب عام."}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
