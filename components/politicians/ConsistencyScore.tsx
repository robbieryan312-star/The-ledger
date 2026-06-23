'use client';

import { ConsistencyData, CampaignPromise } from '@/lib/types';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const statusConfig = {
  Kept: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30', label: 'Aligns with record' },
  Broken: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30', label: 'Differs from record' },
  Compromised: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', label: 'Partial record' },
  'In Progress': { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30', label: 'In progress' },
  Stalled: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30', label: 'Stalled' },
};

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171';

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e3a5f" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        className="rotate-90" style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        fill={color} fontSize={size > 60 ? 18 : 14} fontWeight="bold"
      >
        {score}
      </text>
    </svg>
  );
}

function PromiseDiff({ promise }: { promise: CampaignPromise }) {
  const said = promise.said ?? {
    summary: promise.statement,
    date: undefined,
    source: promise.evidenceSource,
  };
  const did = promise.did ?? (promise.evidence
    ? { summary: promise.evidence, date: undefined, source: promise.evidenceSource }
    : undefined);

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-lg border border-purple-400/20 p-3" style={{ background: 'rgba(147,51,234,0.05)' }}>
        <div className="text-[10px] uppercase tracking-wide text-purple-300/80 font-semibold mb-1.5">Said</div>
        <p className="text-gray-300 text-xs leading-relaxed">{said.summary}</p>
        {said.date && <div className="text-gray-500 text-[11px] mt-1">{said.date}</div>}
        {said.source && (
          <div className="mt-2">
            <SourceProvenance source={said.source} recordDate={said.date} size="xs" />
          </div>
        )}
      </div>
      <div className="rounded-lg border border-blue-400/20 p-3" style={{ background: 'rgba(59,130,246,0.05)' }}>
        <div className="text-[10px] uppercase tracking-wide text-blue-300/80 font-semibold mb-1.5">Did</div>
        {did ? (
          <>
            <p className="text-gray-300 text-xs leading-relaxed">{did.summary}</p>
            {did.date && <div className="text-gray-500 text-[11px] mt-1">{did.date}</div>}
            {did.source && (
              <div className="mt-2">
                <SourceProvenance source={did.source} recordDate={did.date} size="xs" />
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-xs italic">No verified official action on record for this promise.</p>
        )}
      </div>
    </div>
  );
}

export default function ConsistencyScore({ data, name }: { data: ConsistencyData; name: string }) {
  const chartData = data.termConsistency.map((t) => ({ year: t.year, score: t.score }));

  return (
    <div className="space-y-6">
      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            <ScoreRing score={data.overallScore} size={72} />
            <div>
              <div className="text-white font-semibold text-sm">Consistency Score</div>
              <div className="text-xs text-gray-400">Statement-to-action alignment for {name.split(' ').pop()}</div>
            </div>
          </div>
          <div className="hidden sm:block w-px h-14 bg-[#1e3a5f] flex-shrink-0" />
          <div className="flex flex-1 gap-6 sm:gap-8">
            <div>
              <div className="text-2xl font-bold text-blue-400">{data.partyLineVotePercentage}%</div>
              <div className="text-xs text-gray-400">Party-Line Vote Rate</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${data.lobbyistAlignmentPercentage > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                {data.lobbyistAlignmentPercentage}%
              </div>
              <div className="text-xs text-gray-400">Lobbyist Alignment</div>
            </div>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <h3 className="text-white font-semibold mb-3 text-sm">Consistency Over Time</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#c8a951' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="score" stroke="#c8a951" strokeWidth={2} dot={{ fill: '#c8a951', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h3 className="text-white font-semibold mb-1">Promise vs. Official Record</h3>
        <p className="text-gray-500 text-xs mb-3">
          Public statements paired with votes, filings, or actions — sourced dates and tiers shown; you draw conclusions.
        </p>
        <div className="space-y-3">
          {data.campaignPromises.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] p-6 text-center text-gray-500 text-sm">
              No verified campaign-promise records integrated for this profile yet.
            </div>
          ) : (
            data.campaignPromises.map((promise) => {
              const config = statusConfig[promise.status];
              const Icon = config.icon;
              return (
                <div key={promise.id} className={`rounded-xl p-4 border ${config.bg}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{promise.issue}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-500 px-2 py-0.5 bg-[#1e3a5f] rounded-full">{promise.category}</span>
                      </div>
                      <PromiseDiff promise={promise} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {data.campaignPromises.length > 0 && (
        <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
          <h3 className="text-white font-semibold mb-2 text-sm">Record Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(
              data.campaignPromises.reduce((acc, p) => {
                acc[p.status] = (acc[p.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>),
            ).map(([status, count]) => {
              const config = statusConfig[status as keyof typeof statusConfig];
              if (!config) return null;
              return (
                <div key={status} className="text-center">
                  <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
                  <div className="text-xs text-gray-400">{config.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
