import { notFound } from 'next/navigation';

export default async function LobbyingGroupProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  notFound();
}
