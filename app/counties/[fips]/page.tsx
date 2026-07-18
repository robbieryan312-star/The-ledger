import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';

export default async function CountyPage({ params }: { params: Promise<{ fips: string }> }) {
  const { fips } = await params;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#c8a951] transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="text-center py-16">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <p className="text-lg text-white/60 font-medium">No verified record available</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          County data (FIPS {fips}) will be populated when real local-government pipelines are integrated.
        </p>
      </div>
    </div>
  );
}
