'use client';

import { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react';

export interface MapNavTarget {
  stateCode: string;
  countyFips?: string;
  zip?: string;
}

type NavigateFn = (target: MapNavTarget) => void;

interface MapNavigationContextValue {
  navigateTo: (target: MapNavTarget) => void;
  registerNavigator: (fn: NavigateFn) => void;
  lastNav: MapNavTarget | null;
}

const MapNavigationContext = createContext<MapNavigationContextValue | null>(null);

export function MapNavigationProvider({ children }: { children: ReactNode }) {
  const navigatorRef = useRef<NavigateFn | null>(null);
  const [lastNav, setLastNav] = useState<MapNavTarget | null>(null);

  const registerNavigator = useCallback((fn: NavigateFn) => {
    navigatorRef.current = fn;
  }, []);

  const navigateTo = useCallback((target: MapNavTarget) => {
    setLastNav(target);
    navigatorRef.current?.(target);
  }, []);

  return (
    <MapNavigationContext.Provider value={{ navigateTo, registerNavigator, lastNav }}>
      {children}
    </MapNavigationContext.Provider>
  );
}

export function useMapNavigation() {
  const ctx = useContext(MapNavigationContext);
  if (!ctx) throw new Error('useMapNavigation must be used within MapNavigationProvider');
  return ctx;
}

export function useMapNavigationOptional() {
  return useContext(MapNavigationContext);
}
