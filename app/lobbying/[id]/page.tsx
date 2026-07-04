'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';

export default function LobbyingGroupProfile({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  notFound();
}
