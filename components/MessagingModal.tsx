
import React, { useState } from 'react';
import { WorkGroup, MinistryContact, Language } from '../types';
import { generateCommunication } from '../services/geminiService';
import { Layers, X, MessageCircle, Mail, Sparkles, Bot, CheckCircle, Send, Info } from 'lucide-react';
import { TEXTS } from '../constants';

interface Props {
  group: WorkGroup;
  contacts: MinistryContact[];
  lang: Language;
  onClose: () => void;
}

const MessagingModal: React.FC<Props> = ({ group, contacts, lang, onClose }) => {
  const isRTL = lang === 'ar';
  const [messageTab, setMessageTab] = useState<'whatsapp' | 'email'>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [sentTracker, setSentTracker] = useState<Set<string>>(new Set());
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleWhatsApp = (phone: string, message?: string) => {
    if (!phone) return;
    
    // Auto-fix for Mauritania (8 digits -> add 222)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 8) {
        cleanPhone = '222' + cleanPhone;
    }
    
    const url = `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    window.open(url, '_blank');
  };

  const handleGenerateMessage = async () => {
      setIsGeneratingAI(true);
      const members = contacts.filter(c => group.contactIds.includes(c.id)).map(c => c.representative).join(', ');
      const context = `Writing a group message for: ${group.name}. Members involved: ${members}. Goal: Professional communication about state assets or meetings.`;
      
      const prompt = messageTab === 'whatsapp' 
        ? "Draft a short, professional group WhatsApp message (max 50 words) inviting members to update their inventory."
        : "Draft a formal email subject and body inviting members to a coordination meeting regarding asset declaration.";
      
      try {
          const result = await generateCommunication(prompt, lang, context);
          
          if (messageTab === 'email') {
              const parts = result.split('\n');
              if (parts.length > 0 && parts[0].toLowerCase().includes('subject')) {
                  setMsgSubject(parts[0].replace(/subject:/i, '').trim());
                  setMessageText(result.substring(parts[0].length).trim());
              } else {
                  setMessageText(result);
              }
          } else {
              setMessageText(result);
          }
      } catch (e) {
          console.error(e);
      }
      setIsGeneratingAI(false);
  };

  const sendSingleWhatsApp = (contact: MinistryContact) => {
      handleWhatsApp(contact.phone, messageText);
      const newSet = new Set(sentTracker);
      newSet.add(contact.id);
      setSentTracker(newSet);
  };

  const sendGroupEmail = () => {
      const emails = contacts
        .filter(c => group.contactIds.includes(c.id))
        .map(c => c.email)
        .filter(Boolean);
      
      if (emails.length === 0) {
          alert("No emails found");
          return;
      }
      
      const bcc = emails.join(';');
      const subject = encodeURIComponent(msgSubject);
      const body = encodeURIComponent(messageText);
      window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, '_blank');
  };

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5" />
                      <div>
                          <h3 className="font-bold text-lg">{group.name}</h3>
                          <p className="text-xs text-indigo-200">{group.contactIds.length} {TEXTS.groupMembers[lang]}</p>
                      </div>
                  </div>
                  <button onClick={onClose} className="hover:bg-indigo-800 p-1 rounded"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-0 flex flex-col h-full overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                      <button 
                        onClick={() => setMessageTab('whatsapp')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${messageTab === 'whatsapp' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                      </button>
                      <button 
                        onClick={() => setMessageTab('email')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${messageTab === 'email' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                          <Mail className="w-4 h-4" />
                          Email
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                      {/* AI Generator */}
                      <div className="mb-6">
                          <button 
                            onClick={handleGenerateMessage}
                            disabled={isGeneratingAI}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-lg shadow-sm flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-700 transition-all font-medium"
                          >
                              {isGeneratingAI ? <Sparkles className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                              {lang === 'fr' ? "Générer un message avec l'IA" : "إنشاء رسالة باستخدام الذكاء الاصطناعي"}
                          </button>
                      </div>

                      {/* Content Inputs */}
                      <div className="space-y-4 mb-6">
                          {messageTab === 'email' && (
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 mb-1">{lang === 'fr' ? 'Sujet' : 'الموضوع'}</label>
                                  <input 
                                    className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500" 
                                    placeholder="..." 
                                    value={msgSubject}
                                    onChange={e => setMsgSubject(e.target.value)}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  />
                              </div>
                          )}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">{lang === 'fr' ? 'Message' : 'الرسالة'}</label>
                              <textarea 
                                className="w-full border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder={lang === 'fr' ? "Rédigez votre message ici..." : "اكتب رسالتك هنا..."}
                                value={messageText}
                                onChange={e => setMessageText(e.target.value)}
                                dir={isRTL ? 'rtl' : 'ltr'}
                              />
                          </div>
                      </div>

                      {/* Member List for WhatsApp sending */}
                      {messageTab === 'whatsapp' && (
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                                  <span className="text-xs font-bold text-gray-500 uppercase">{lang === 'fr' ? 'Destinataires' : 'المستلمون'}</span>
                                  <span className="text-xs text-green-600 font-bold">{sentTracker.size} / {group.contactIds.length} {lang === 'fr' ? 'Envoyés' : 'تم الإرسال'}</span>
                              </div>
                              <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                                  {contacts.filter(c => group.contactIds.includes(c.id)).map(member => (
                                      <div key={member.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${sentTracker.has(member.id) ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                  {sentTracker.has(member.id) ? <CheckCircle className="w-4 h-4" /> : member.name[lang].charAt(0)}
                                              </div>
                                              <div>
                                                  <p className={`text-sm font-medium ${sentTracker.has(member.id) ? 'text-green-800 line-through opacity-70' : 'text-gray-800'}`}>{member.name[lang]}</p>
                                                  <p className="text-xs text-gray-500 font-mono">{member.phone}</p>
                                              </div>
                                          </div>
                                          <button 
                                            onClick={() => sendSingleWhatsApp(member)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${sentTracker.has(member.id) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                          >
                                              {sentTracker.has(member.id) ? (lang === 'fr' ? 'Envoyé' : 'تم') : (
                                                  <>
                                                      <Send className="w-3 h-3" />
                                                      {lang === 'fr' ? 'Envoyer' : 'إرسال'}
                                                  </>
                                              )}
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {messageTab === 'email' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                              <p className="text-sm text-blue-800">
                                  {lang === 'fr' 
                                    ? "En cliquant sur 'Envoyer Email Groupé', votre application de messagerie s'ouvrira avec tous les destinataires en Cci (Copie cachée) pour protéger leur confidentialité." 
                                    : "بالنقر على 'إرسال بريد جماعي'، سيتم فتح تطبيق البريد الخاص بك مع جميع المستلمين في نسخة مخفية (Bcc) لحماية خصوصيتهم."}
                              </p>
                          </div>
                      )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
                       {messageTab === 'email' && (
                           <button 
                            onClick={sendGroupEmail}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                           >
                               <Mail className="w-4 h-4" />
                               {lang === 'fr' ? 'Ouvrir Mail & Envoyer' : 'فتح البريد والإرسال'}
                           </button>
                       )}
                       {messageTab === 'whatsapp' && (
                           <button 
                            onClick={onClose}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-bold"
                           >
                               {lang === 'fr' ? 'Fermer' : 'إغلاق'}
                           </button>
                       )}
                  </div>
              </div>
          </div>
      </div>
  );
};

export default MessagingModal;
