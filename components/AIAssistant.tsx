import React, { useState } from 'react';
import { Language } from '../types';
import { TEXTS } from '../constants';
import { generateCommunication } from '../services/geminiService';
import { Bot, Sparkles, Send, Copy, Loader2 } from 'lucide-react';

interface Props {
  lang: Language;
}

const AIAssistant: React.FC<Props> = ({ lang }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const isRTL = lang === 'ar';

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse('');
    const result = await generateCommunication(prompt, lang);
    setResponse(result);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    alert(lang === 'fr' ? "Copié!" : "تم النسخ!");
  };

  const handleWhatsAppRedirect = () => {
      // Encodes the response and opens a whatsapp generic link (user has to choose contact)
      const encodedText = encodeURIComponent(response);
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Input Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900">
                    {lang === 'fr' ? "Assistant de Collaboration" : "مساعد التعاون"}
                </h3>
                <p className="text-xs text-gray-500">Powered by Gemini 2.5</p>
            </div>
        </div>

        <div className="flex-1 space-y-4">
            <p className="text-sm text-gray-600">
                {lang === 'fr' 
                 ? "Utilisez cet outil pour rédiger des lettres administratives, des messages WhatsApp formels, ou expliquer la méthodologie de recensement." 
                 : "استخدم هذه الأداة لصياغة الرسائل الإدارية، رسائل واتساب الرسمية، أو شرح منهجية الإحصاء."}
            </p>
            
            <textarea
                className="w-full h-40 border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 resize-none"
                placeholder={TEXTS.aiPromptPlaceholder[lang]}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                dir={isRTL ? 'rtl' : 'ltr'}
            />

            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                {TEXTS.aiButton[lang]}
            </button>
        </div>
      </div>

      {/* Output Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileTextIcon /> 
            {lang === 'fr' ? "Résultat Généré" : "النتيجة المولدة"}
        </h3>
        
        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-y-auto min-h-[300px]">
            {response ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
                    {response}
                </pre>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <Bot className="w-12 h-12 mb-2" />
                    <p className="text-sm text-center">
                        {lang === 'fr' ? "Le contenu généré apparaîtra ici" : "سيظهر المحتوى المولد هنا"}
                    </p>
                </div>
            )}
        </div>

        {response && (
            <div className="mt-4 flex gap-3">
                 <button 
                    onClick={copyToClipboard}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium"
                 >
                    <Copy className="w-4 h-4" />
                    {lang === 'fr' ? "Copier" : "نسخ"}
                 </button>
                 <button 
                    onClick={handleWhatsAppRedirect}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 rounded-lg text-sm font-medium"
                 >
                    <Send className="w-4 h-4" />
                    {lang === 'fr' ? "Ouvrir dans WhatsApp" : "فتح في واتساب"}
                 </button>
            </div>
        )}
      </div>
    </div>
  );
};

// Simple Icon component used locally
const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);

export default AIAssistant;