import { useState } from 'react';
import { Terminal, Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  children: string;
  language?: string;
}

export const CodeBlock = ({ children, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = children.split('\n').length;

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-[#1f1f23]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-[#1f1f23]">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
            <Terminal size={12} />
            {language || 'luau'}
          </span>
          <span className="text-[9px] font-mono text-zinc-600 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800/50">
            {lineCount} LINES
          </span>
        </div>
        <button 
          onClick={copyToClipboard}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </button>
      </div>
      <pre className="p-3 bg-[#0c0c0e] text-[12px] font-mono overflow-auto max-h-[500px] text-blue-300 scrollbar-thin scrollbar-thumb-zinc-800">
        <code>{children}</code>
      </pre>
    </div>
  );
};
