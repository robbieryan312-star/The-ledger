import Link from 'next/link';
import { Calendar, ExternalLink } from 'lucide-react';

export default function ElectionsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Elections</h1>
        <p className="text-gray-400">Upcoming races with candidate positions, funding signals, and links to full official records.</p>
      </div>

      <div className="text-center py-16">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <p className="text-lg text-white/60 font-medium">No verified data yet</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Election data will be populated when real pipelines are integrated from official sources.
          In the meantime, verify elections at the sources below.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-6 text-sm">
          <a href="https://www.ballotpedia.org" target="_blank" rel="noopener noreferrer"
             className="text-[#c8a951] hover:text-white flex items-center gap-1 transition-colors">
            Ballotpedia.org <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href="https://www.vote.gov" target="_blank" rel="noopener noreferrer"
             className="text-[#c8a951] hover:text-white flex items-center gap-1 transition-colors">
            vote.gov <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href="https://www.realclearpolitics.com" target="_blank" rel="noopener noreferrer"
             className="text-[#c8a951] hover:text-white flex items-center gap-1 transition-colors">
            RealClearPolitics <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <Link href="/" className="inline-block mt-6 text-sm text-gray-500 hover:text-white transition-colors">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
