import { X, Palette, Type, Sliders, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
}

export interface AppConfig {
  primaryColor: string;
  secondaryColor: string;
  theme: 'dark' | 'midnight' | 'matrix';
  fontFamily: 'sans' | 'mono' | 'serif';
  glowIntensity: number;
}

const colors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
];

export const ConfigModal = ({ isOpen, onClose, config, updateConfig }: ConfigModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-blue-500" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Preferences Manager</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Preferências</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl"
                id="close-config"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-10 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Color Selection */}
              <section className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-500 rounded-full" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] font-bold text-zinc-400">Atmosphere Tone</span>
                </div>
                <div className="grid grid-cols-6 gap-4">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateConfig({ primaryColor: color.value })}
                      className="group relative w-full aspect-square rounded-xl transition-all hover:translate-y-[-2px]"
                      style={{ backgroundColor: color.value }}
                      id={`color-${color.name.toLowerCase()}`}
                    >
                      <div className={cn(
                        "absolute inset-0 rounded-xl border-2 border-white transition-opacity",
                        config.primaryColor === color.value ? "opacity-30 scale-110" : "opacity-0"
                      )} />
                      {config.primaryColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                          <Check size={20} strokeWidth={3} className="drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Theme Selection */}
              <section className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-500 rounded-full" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] font-bold text-zinc-400">Environment Protocol</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'dark', name: 'Original', desc: 'Space Abyss' },
                    { id: 'midnight', name: 'Zero', desc: 'True Black' },
                    { id: 'matrix', name: 'Neural', desc: 'Digital Grid' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateConfig({ theme: t.id as any })}
                      className={cn(
                        "text-left p-4 rounded-xl border transition-all relative overflow-hidden group",
                        config.theme === t.id 
                          ? 'bg-blue-600/10 border-blue-500/30' 
                          : 'border-white/5 bg-white/2 hover:border-white/10'
                      )}
                      id={`theme-${t.id}`}
                    >
                      {config.theme === t.id && (
                        <div className="absolute top-0 right-0 p-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        </div>
                      )}
                      <p className="text-sm font-bold text-white group-hover:translate-x-0.5 transition-transform">{t.name}</p>
                      <p className="text-[10px] text-zinc-600 font-mono tracking-wider">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Font Selection */}
              <section className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-500 rounded-full" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] font-bold text-zinc-400">Data Visualization</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'sans', name: 'Inter', desc: 'Default' },
                    { id: 'mono', name: 'Mono', desc: 'System' },
                    { id: 'serif', name: 'Outfit', desc: 'Bold' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => updateConfig({ fontFamily: f.id as any })}
                      className={cn(
                        "text-left p-4 rounded-xl border transition-all group",
                        config.fontFamily === f.id 
                          ? 'bg-blue-600/10 border-blue-500/30' 
                          : 'border-white/5 bg-white/2 hover:border-white/10'
                      )}
                      id={`font-${f.id}`}
                    >
                      <p className={cn(
                        "text-sm font-bold text-white group-hover:translate-x-0.5 transition-transform",
                        f.id === 'mono' ? 'font-mono' : f.id === 'serif' ? 'font-serif' : 'font-sans'
                      )}>{f.name}</p>
                      <p className="text-[10px] text-zinc-600 font-mono tracking-wider">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/2">
              <button
                onClick={onClose}
                className="cyber-button w-full px-8 py-3 bg-white text-black text-sm font-extrabold rounded-xl hover:bg-zinc-200 transition-all shadow-lg"
                id="save-config"
              >
                APLICAR PROTOCOLOS
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
