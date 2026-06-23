'use client';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ledger_user_profile_v1';

export interface UserProfile {
  stateCode: string;
  stateName: string;
  zipCode: string;
  trackedPoliticianIds: string[];
}

const DEFAULT: UserProfile = {
  stateCode: '',
  stateName: '',
  zipCode: '',
  trackedPoliticianIds: [],
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: UserProfile) => {
    setProfile(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const setLocation = useCallback((stateCode: string, stateName: string, zipCode = '') => {
    persist({ ...profile, stateCode, stateName, zipCode });
  }, [profile, persist]);

  const clearLocation = useCallback(() => {
    persist({ ...profile, stateCode: '', stateName: '', zipCode: '' });
  }, [profile, persist]);

  const trackPolitician = useCallback((id: string) => {
    if (profile.trackedPoliticianIds.includes(id)) return;
    persist({ ...profile, trackedPoliticianIds: [...profile.trackedPoliticianIds, id] });
  }, [profile, persist]);

  const untrackPolitician = useCallback((id: string) => {
    persist({ ...profile, trackedPoliticianIds: profile.trackedPoliticianIds.filter((x) => x !== id) });
  }, [profile, persist]);

  const isTracked = useCallback((id: string) => profile.trackedPoliticianIds.includes(id), [profile]);

  return { profile, hydrated, setLocation, clearLocation, trackPolitician, untrackPolitician, isTracked };
}
