import { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight, ShieldAlert, Image as ImageIcon, X, Paperclip, Zap, BookOpen, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Model } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatInputProps {
  isLoading: boolean;
  onSend: (message: string, images?: string[]) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  chatMode: string;
  setChatMode: (mode: string) => void;
  models: Model[];
  modes: { id: string, name: string, desc: string, icon: string }[];
  credits: number | null;
}

export const ChatInput = ({ 
  isLoading, 
  onSend, 
  selectedModel, 
  setSelectedModel, 
  chatMode, 
  setChatMode,
  models,
  modes,
  credits
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const getModeIcon = (id: string, size = 10) => {
    switch (id) {
      case 'brute': return <ShieldAlert size={size} />;
      case 'learn': return <BookOpen size={size} />;
      case 'aesthetic': return <Layout size={size} />;
      default: return <Zap size={size} />;
    }
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if ((!input.trim() && images.length === 0) || isLoading) return;
    onSend(input.trim(), images);
    setInput('');
    setImages([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setImages(prev => [...prev, base64].slice(0, 5)); // Limit to 5 images
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Aggressive mobile/touch detection
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || 
                         window.matchMedia("(any-pointer: coarse)").matches ||
                         'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0;
    
    const isMobileUA = /iPhone|iPad|iPod|Android|Mobi/i.test(navigator.userAgent);
    const isMobile = isTouchDevice || isMobileUA;
    
    // Only auto-submit on non-touch desktop devices when pressing Enter alone
    // If it's mobile, we do NOTHING and let the native textarea handle the newline
    if (e.key === 'Enter') {
      if (!e.shiftKey && !isMobile) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-2xl px-4 pb-6 md:pb-8 bg-gradient-to-t from-[#020203] via-[#020203] to-transparent z-10">
      <div className="flex items-end justify-between mb-4 px-2">
        <div className="flex gap-4">
          {/* Custom Model Dropdown */}
          <div className="relative">
            <label className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] mb-1.5 block opacity-50">Inteligência</label>
            <div 
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 text-[10px] font-mono cursor-pointer transition-all border rounded-lg px-3 py-1.5 bg-white/5"
              style={{ 
                color: models.find(m => m.id === selectedModel)?.color || '#3b82f6',
                borderColor: `${models.find(m => m.id === selectedModel)?.color || '#3b82f6'}40`
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">{models.find(m => m.id === selectedModel)?.name}</span>
                <span className="text-[9px] opacity-40 px-1 border border-white/10 rounded uppercase" style={{ borderColor: `${models.find(m => m.id === selectedModel)?.color || '#3b82f6'}30` }}>{models.find(m => m.id === selectedModel)?.cost} pts</span>
              </div>
              <ChevronRight size={10} className={cn("transition-transform opacity-40", isModelDropdownOpen ? "rotate-90" : "rotate-0")} />
            </div>
            
            <AnimatePresence>
              {isModelDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute bottom-full left-0 mb-3 w-64 bg-[#0c0c0e] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 p-1"
                >
                  <div className="px-2 py-1.5 mb-1 border-b border-white/5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Selecionar Modelo</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          // Block Pro models for now
                          if (m.id === 'gemini-3.1-pro-preview' || m.id.includes('pro')) {
                            return;
                          }
                          setSelectedModel(m.id);
                          setIsModelDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1 mb-0.5",
                          selectedModel === m.id 
                            ? "bg-white/5 font-medium border border-white/10" 
                            : "hover:bg-white/5 text-zinc-500 hover:text-zinc-300 border border-transparent",
                          (m.id === 'gemini-3.1-pro-preview' || m.id.includes('pro')) && "opacity-50 cursor-not-allowed"
                        )}
                        style={{ color: selectedModel === m.id ? m.color : undefined }}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono tracking-tight" style={{ color: m.color }}>{m.name}</span>
                            {(m.id === 'gemini-3.1-pro-preview' || m.id.includes('pro')) && (
                              <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-black">VIP REQUIRED</span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono font-bold opacity-30">{m.cost} PTS</span>
                        </div>
                        <span className="text-[10px] opacity-60 leading-tight block truncate pr-4">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mode Dropdown */}
          <div className="relative">
            <label className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] mb-1.5 block opacity-50">Modo</label>
            <div 
              onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
              className={cn(
                "flex items-center gap-2 text-[10px] font-mono cursor-pointer transition-all border rounded-lg px-3 py-1.5 hover:border-white/10",
                chatMode === 'brute' 
                  ? "border-red-500/30 text-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.05)]" 
                  : (chatMode === 'learn' ? "border-green-500/30 text-green-400 bg-green-500/5" : (chatMode === 'aesthetic' ? "border-purple-500/30 text-purple-400 bg-purple-500/5" : (chatMode === 'experimental' ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/5" : "text-zinc-400 bg-white/5 border-white/5")))
              )}
            >
              <div className={cn(chatMode === 'brute' ? "animate-pulse" : (chatMode === 'aesthetic' ? "animate-bounce" : ""))}>
                {getModeIcon(chatMode, 12)}
              </div>
              <span className="uppercase tracking-wider">{modes.find(m => m.id === chatMode)?.name}</span>
              <ChevronRight size={10} className={cn("transition-transform opacity-40", isModeDropdownOpen ? "rotate-90" : "rotate-0")} />
            </div>
            
            <AnimatePresence>
              {isModeDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute bottom-full left-0 mb-3 w-56 bg-[#0c0c0e] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 p-1"
                >
                  <div className="px-2 py-1.5 mb-1 border-b border-white/5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Modo de Operação</span>
                  </div>
                  {modes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setChatMode(m.id);
                        setIsModeDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1 mb-0.5",
                        chatMode === m.id 
                          ? (m.id === 'brute' ? "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]" : (m.id === 'learn' ? "bg-green-500/10 text-green-400 border border-green-500/20" : (m.id === 'aesthetic' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : (m.id === 'experimental' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-purple-600/10 text-purple-400 border border-purple-500/20")))) 
                          : "hover:bg-white/5 text-zinc-500 hover:text-zinc-300 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {getModeIcon(m.id, 12)}
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{m.name}</span>
                      </div>
                      <span className="text-[10px] opacity-60 leading-tight block">{m.desc}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Credits Display */}
        {credits !== null && (
          <div className="relative flex flex-col items-end opacity-60 hover:opacity-100 transition-opacity">
            <label className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] mb-1.5 block">Saldo</label>
            <div className="flex items-center gap-2 text-[10px] font-mono border border-purple-500/20 rounded-lg px-3 py-1.5 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
              <span className="font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent tracking-widest">{credits}</span>
              <span className="opacity-20 text-zinc-500">/</span>
              <span className="font-bold text-zinc-500">30</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Image Previews */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-3 px-2"
            >
              {images.map((img, idx) => (
                <div key={idx} className="relative group overflow-hidden rounded-xl w-20 h-20 border border-white/5 bg-zinc-900 shadow-lg">
                  <img src={img} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 bg-black/80 rounded-full p-1 text-white hover:bg-red-500 transition-all scale-0 group-hover:scale-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-center group">
          <input 
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="absolute left-3 p-2 text-zinc-600 hover:text-blue-400 transition-all disabled:opacity-30 group-focus-within:text-zinc-500"
          >
            <Paperclip size={20} />
          </button>
          <textarea 
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enviar mensagem..."
            disabled={isLoading}
            rows={1}
            enterKeyHint="enter"
            className="w-full bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-[14px] text-zinc-200 placeholder:text-zinc-800 outline-none transition-all resize-none min-h-[56px] leading-relaxed shadow-lg group-focus-within:bg-[#0c0c0e]"
            style={{ 
              borderColor: input.trim() || images.length > 0 ? `${models.find(m => m.id === selectedModel)?.color || '#3b82f6'}30` : undefined,
              boxShadow: input.trim() || images.length > 0 ? `0 0 20px ${models.find(m => m.id === selectedModel)?.color || '#3b82f6'}10` : undefined
            }}
          />
          <button 
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || (!input.trim() && images.length === 0)}
            className="absolute right-3 p-2.5 rounded-xl bg-transparent transition-all disabled:opacity-30 flex items-center justify-center"
            style={{ 
              color: input.trim() || images.length > 0 ? models.find(m => m.id === selectedModel)?.color : '#3f3f46'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
