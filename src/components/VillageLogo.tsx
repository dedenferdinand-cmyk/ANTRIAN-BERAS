import React from 'react';

export default function VillageLogo({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield outline representing administrative authority */}
        <path
          d="M50 8C72 8 84 18 84 40C84 65 50 88 50 88C50 88 16 65 16 40C16 18 28 8 50 8Z"
          fill="#10B981"
          stroke="#065F46"
          strokeWidth="4"
        />
        
        {/* Inner white background card */}
        <path
          d="M50 14C68 14 78 22 78 40C78 60 50 81 50 81C50 81 22 60 22 40C22 22 32 14 50 14Z"
          fill="#FFFFFF"
        />

        {/* Mountain (Arjasari mountain setting) in Bandung, West Java */}
        <path
          d="M25 60L50 35L75 60H25Z"
          fill="#34D399"
          stroke="#059669"
          strokeWidth="1"
        />
        <path
          d="M38 60L50 48L62 60H38Z"
          fill="#059669"
        />

        {/* Rice stalk (Beras) & Cotton for welfare */}
        <circle cx="50" cy="50" r="10" fill="#FBBF24" opacity="0.15" />
        <path
          d="M50 30V65"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Banner with local province identification */}
        <path
          d="M10 70H90V80H10V70Z"
          fill="#EF4444"
          opacity="0"
        />
        <text
          x="50"
          y="78"
          fill="#065F46"
          fontFamily="sans-serif"
          fontSize="7"
          fontWeight="800"
          textAnchor="middle"
        >
          WARGALUYU
        </text>
      </svg>
      <div>
        <h4 className="font-sans font-extrabold text-[#065F46] tracking-tight text-sm md:text-base leading-none">
          DESA WARGALUYU
        </h4>
        <p className="text-[10px] text-emerald-600 font-mono tracking-wider font-semibold">
          KEC. ARJASARI • KAB. BANDUNG
        </p>
      </div>
    </div>
  );
}
