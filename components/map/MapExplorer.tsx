'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Scale } from 'lucide-react';

const USAMap = dynamic(() => import('./USAMap'), { ssr: false });

export default function MapExplorer() {
  return (
    <div className="relative w-full h-full min-h-[620px] sm:min-h-[720px] overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 45%, #0c2340 0%, #06101e 45%, #030810 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #c8a951 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Map */}
      <div className="absolute inset-0">
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#c8a951] border-t-transparent rounded-full animate-spin" /></div>}>
          <USAMap />
        </Suspense>
      </div>

      {/* Bottom legend */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex flex-col gap-1.5 bg-[#08152a]/90 backdrop-blur-md border border-white/[0.08] rounded-xl px-3 py-2.5 text-[10px]">
        <div className="flex items-center gap-2 text-white/50">
          <div className="w-3 h-3 rounded-sm bg-[#1e3a5f] border border-[#4a7ab5]/60" />
          State / county
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <div className="w-3 h-3 rounded-sm bg-[#1a3555] border border-[#c8a951]/40" />
          Has local data
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <div className="w-3 h-3 rounded-sm bg-[#c8a951] border border-[#c8a951]" />
          Selected
        </div>
      </div>

      {/* Brand watermark */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-2 text-white/20 pointer-events-none">
        <Scale className="h-4 w-4" />
        <span className="text-xs font-medium tracking-wider">THE LEDGER</span>
      </div>
    </div>
  );
}
