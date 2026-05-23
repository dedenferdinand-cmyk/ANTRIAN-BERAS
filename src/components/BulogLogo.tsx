import React from 'react';

export default function BulogLogo({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer glowing shield/circle */}
        <circle cx="50" cy="50" r="46" stroke="#1E40AF" strokeWidth="6" fill="#EFF6FF" />
        {/* BULOG visual initials and modern logistics grain icon */}
        <path
          d="M30 35H45C52 35 52 45 45 45C52 45 52 55 45 55H30V35Z"
          fill="#1E40AF"
          stroke="#1E40AF"
          strokeWidth="2"
        />
        <path
          d="M36 41V49M41 41V49"
          stroke="#EFF6FF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Right side - Golden Wheat grain representing food logistics */}
        <path
          d="M60 30C60 30 63 35 60 40C57 45 61 50 63 55C65 60 62 65 62 65C62 65 57 60 59 55C61 50 57 45 57 40C57 35 60 30 60 30Z"
          fill="#F59E0B"
        />
        <path
          d="M65 35C65 35 68 40 65 45C62 50 66 55 68 60C70 65 67 70 67 70C67 70 62 65 64 60C66 55 62 50 62 45C62 40 65 35 65 35Z"
          fill="#D97706"
        />
        
        {/* Tiny branch stem */}
        <path d="M57 65L50 72M65 70L50 72" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" />
        
        {/* Text ribbon baseline */}
        <rect x="25" y="65" width="50" height="15" rx="3" fill="#1E40AF" />
        <text
          x="50"
          y="76"
          fill="#FFFFFF"
          fontFamily="sans-serif"
          fontSize="9"
          fontWeight="900"
          textAnchor="middle"
        >
          BULOG
        </text>
      </svg>
      <div>
        <h4 className="font-sans font-extrabold text-[#1E40AF] tracking-tight text-sm md:text-base leading-none">
          BULOG
        </h4>
        <p className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold">
          UNTUK NEGERI
        </p>
      </div>
    </div>
  );
}
