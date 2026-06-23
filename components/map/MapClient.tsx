'use client';

import dynamic from 'next/dynamic';

const USAMap = dynamic(() => import('./USAMap'), { ssr: false });

export default function MapClient() {
  return <USAMap />;
}
