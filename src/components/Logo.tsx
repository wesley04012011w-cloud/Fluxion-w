import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  const logoSrc = "https://i.ibb.co/CspCLMvX/IMG-20260509-WA0001.jpg";

  return (
    <div 
      className={twMerge("relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-zinc-900/50", className)}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-purple-500 blur-[20px] opacity-10" />
      <img 
        src={logoSrc} 
        alt="Fluxion Logo" 
        className="relative z-10 w-full h-full object-cover"
        onError={(e) => {
          // Fallback caso o link não seja direto
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
};
