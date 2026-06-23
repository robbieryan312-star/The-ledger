'use client';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useUserProfile } from '@/lib/hooks/useUserProfile';

interface Props {
  politicianId: string;
  size?: 'sm' | 'md';
}

export default function TrackButton({ politicianId, size = 'md' }: Props) {
  const { isTracked, trackPolitician, untrackPolitician, hydrated } = useUserProfile();

  if (!hydrated) return null;

  const tracked = isTracked(politicianId);
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const btnClass = size === 'sm'
    ? 'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all'
    : 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        tracked ? untrackPolitician(politicianId) : trackPolitician(politicianId);
      }}
      className={`${btnClass} ${
        tracked
          ? 'bg-[#c8a951]/20 text-[#c8a951] border border-[#c8a951]/40 hover:bg-[#c8a951]/10'
          : 'bg-white/[0.05] text-white/50 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80'
      }`}
      title={tracked ? 'Remove from My Ledger' : 'Track in My Ledger'}
    >
      {tracked ? <BookmarkCheck className={iconClass} /> : <Bookmark className={iconClass} />}
      {size === 'md' && <span>{tracked ? 'Tracked' : 'Track'}</span>}
    </button>
  );
}
