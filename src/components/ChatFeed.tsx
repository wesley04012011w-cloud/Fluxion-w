import { memo, useEffect, useRef } from 'react';
import { Cpu, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import { Message } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatFeedProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatFeed = memo(({ messages, isLoading }: ChatFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div 
      ref={scrollRef}
      className="w-full flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-8 scroll-smooth"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
          <div className="w-20 h-20 rounded-2xl bg-purple-600/10 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden mb-6 flex items-center justify-center">
            <img src="/file_00000000129871fb94548eab962afb1b.png" alt="Fluxion Logo" className="w-full h-full object-cover grayscale brightness-50" referrerPolicy="no-referrer" />
          </div>
          <div className="text-center">
            <p className="text-[12px] font-mono tracking-[0.3em] uppercase text-zinc-400">Waiting for terminal input</p>
            <div className="mt-2 flex justify-center gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 bg-zinc-700 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {messages.map((msg, i) => (
        <motion.div
          key={msg.id || i}
          initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "flex flex-col w-full",
            msg.role === 'user' ? "items-end" : "items-start"
          )}
        >
          <div className={cn(
            "max-w-[85%] md:max-w-[80%] group",
            msg.role === 'user' ? "ml-auto" : "w-full"
          )}>
            <div className={cn(
              "flex items-center gap-3 mb-2 opacity-50 group-hover:opacity-100 transition-opacity",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center border overflow-hidden",
                msg.role === 'user' ? "bg-zinc-800 border-zinc-700" : "bg-purple-600/10 border-purple-500/20"
              )}>
                {msg.role === 'user' ? (
                  <Zap size={12} className="text-zinc-400" />
                ) : (
                  <img src="/file_00000000129871fb94548eab962afb1b.png" alt="AI" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                )}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-zinc-500">
                {msg.role === 'user' ? 'Local Terminal' : 'Fluxion Core'}
              </span>
              <div className="h-px w-10 bg-zinc-800" />
            </div>

            <div className={cn(
              "text-[14px] leading-relaxed relative",
              msg.role === 'user' 
                ? "bg-white/[0.02] text-zinc-100 rounded-2xl rounded-tr-sm px-5 py-3 border border-white/5 shadow-sm hover:border-white/10 transition-colors" 
                : "w-full text-zinc-300 pl-2 lg:pl-0"
            )}>
              {msg.role === 'assistant' && (
                <div className="absolute left-[-12px] top-4 w-1 h-8 bg-blue-500 rounded-full blur-[2px] opacity-20" />
              )}
            {msg.images && msg.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {msg.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt="attachment" 
                    className="max-w-[200px] max-h-[200px] rounded-lg border border-zinc-700/50 cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            )}
            {msg.role === 'assistant' ? (
              <div className="prose prose-invert prose-sm max-w-none text-[13px] text-zinc-400">
                <Markdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <CodeBlock language={match[1]}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      ) : (
                        <code {...props} className="bg-zinc-800/60 px-1 py-0.5 rounded text-blue-400 font-mono italic">
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {msg.content}
                </Markdown>
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      </motion.div>
    ))}
      
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-2 px-2"
        >
          <div className="flex items-center gap-2 opacity-40">
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Neural Processing</span>
            <div className="h-px w-8 bg-zinc-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div 
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] animate-pulse italic">Thinking...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
});

ChatFeed.displayName = 'ChatFeed';
