import { notFound } from 'next/navigation';

export default async function OfficialProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  notFound();
}
