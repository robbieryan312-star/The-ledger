'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { mockStates } from '@/lib/data/mockPoliticians';
import { getPoliticiansForState, sortOfficialsForDisplay, resolveOffice } from '@/lib/data/allPoliticians';
import { GOVERNOR_MAP_FILLS, getGovernorPartyKey } from '@/lib/data/governorMapColors';
import { mockElections } from '@/lib/data/mockElections';
import { buildCompareUrl } from '@/lib/data/electionCompare';
import { countyByFips, countiesByState } from '@/lib/data/mockCounties';
import { useMapNavigation } from '@/lib/context/MapNavigationContext';
import OfficialCard from '@/components/counties/OfficialCard';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import { FloridaRecordPanel, FloridaStateEconomicPanel } from '@/components/records/FloridaRecordPanel';
import { getStateEconomicSlice } from '@/lib/data/slices/stateEconomic';
import { getJudiciaryCourtsSlice } from '@/lib/data/slices/judiciaryCourts';
import Link from 'next/link';
import {
  X, ChevronDown, ChevronRight, Calendar, Users, AlertTriangle, Vote,
  MapPin, Building2, ArrowLeft, ExternalLink, History,
} from 'lucide-react';
import { Politician, CountyData, CountyElection } from '@/lib/types';

const GEO_STATES   = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const GEO_COUNTIES = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

type MapLevel = 'national' | 'state';
interface MapPosition { center: [number, number]; zoom: number }

// ZoomableGroup zoom values: 1 = full US view; higher = more zoomed in
const STATE_CENTERS: Record<string, MapPosition> = {
  AL: { center: [-86.79, 32.78], zoom: 6 },
  AK: { center: [-153.37, 64.20], zoom: 3 },
  AZ: { center: [-111.09, 34.05], zoom: 5.5 },
  AR: { center: [-92.37, 34.80], zoom: 6.5 },
  CA: { center: [-119.68, 36.78], zoom: 5 },
  CO: { center: [-105.55, 39.06], zoom: 6 },
  CT: { center: [-72.73, 41.60], zoom: 12 },
  DE: { center: [-75.50, 39.16], zoom: 14 },
  FL: { center: [-81.52, 27.66], zoom: 5.5 },
  GA: { center: [-83.64, 32.97], zoom: 6 },
  HI: { center: [-155.90, 20.31], zoom: 7 },
  ID: { center: [-114.74, 44.24], zoom: 5.5 },
  IL: { center: [-89.20, 40.35], zoom: 5.5 },
  IN: { center: [-86.13, 40.27], zoom: 7 },
  IA: { center: [-93.10, 42.01], zoom: 6.5 },
  KS: { center: [-98.38, 38.52], zoom: 6.5 },
  KY: { center: [-84.27, 37.67], zoom: 7 },
  LA: { center: [-91.96, 31.17], zoom: 7 },
  ME: { center: [-69.38, 45.37], zoom: 7 },
  MD: { center: [-76.80, 39.05], zoom: 10 },
  MA: { center: [-71.53, 42.23], zoom: 11 },
  MI: { center: [-85.60, 44.35], zoom: 5.5 },
  MN: { center: [-94.30, 46.39], zoom: 5.5 },
  MS: { center: [-89.67, 32.74], zoom: 7 },
  MO: { center: [-92.29, 38.46], zoom: 6 },
  MT: { center: [-110.45, 46.88], zoom: 5.5 },
  NE: { center: [-99.90, 41.49], zoom: 6 },
  NV: { center: [-116.42, 38.80], zoom: 5.5 },
  NH: { center: [-71.58, 43.45], zoom: 10 },
  NJ: { center: [-74.52, 40.09], zoom: 11 },
  NM: { center: [-106.25, 34.52], zoom: 5.5 },
  NY: { center: [-75.22, 42.97], zoom: 6 },
  NC: { center: [-79.81, 35.63], zoom: 7 },
  ND: { center: [-100.47, 47.53], zoom: 7 },
  OH: { center: [-82.79, 40.39], zoom: 7 },
  OK: { center: [-97.49, 35.49], zoom: 7 },
  OR: { center: [-120.55, 44.57], zoom: 5.5 },
  PA: { center: [-77.19, 41.20], zoom: 7 },
  RI: { center: [-71.56, 41.68], zoom: 14 },
  SC: { center: [-80.95, 33.86], zoom: 8 },
  SD: { center: [-100.22, 44.44], zoom: 7 },
  TN: { center: [-86.34, 35.86], zoom: 7 },
  TX: { center: [-99.34, 31.05], zoom: 4.5 },
  UT: { center: [-111.09, 39.33], zoom: 6 },
  VT: { center: [-72.71, 44.05], zoom: 11 },
  VA: { center: [-78.66, 37.77], zoom: 7 },
  WA: { center: [-120.73, 47.38], zoom: 6.5 },
  WV: { center: [-80.45, 38.64], zoom: 8 },
  WI: { center: [-89.76, 44.27], zoom: 6.5 },
  WY: { center: [-107.55, 43.00], zoom: 6.5 },
  DC: { center: [-77.04, 38.91], zoom: 18 },
};

const STATE_FIPS: Record<string, string> = {
  AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',DC:'11',FL:'12',
  GA:'13',HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',
  MD:'24',MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',
  NJ:'34',NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',
  SC:'45',SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56',
};

const STATE_ABBR: Record<string, string> = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
  'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH',
  'New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC',
  'North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA',
  'Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN',
  'Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC',
};

const STATE_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  mockStates.map((s) => [s.code, s.name]),
);

const NATIONAL: MapPosition = { center: [-97, 38], zoom: 1 };
const DC_COORDS: [number, number] = [-77.04, 38.91];

function nationalStateStyle(
  stateCode: string,
  mapLevel: MapLevel,
  isSel: boolean,
  isHov: boolean,
  isDimmed: boolean,
) {
  if (!stateCode) {
    return {
      fill: '#1a3555',
      stroke: '#2a4a6e',
      strokeWidth: 0.22,
      fillOpacity: 1,
      outline: 'none' as const,
      cursor: 'default' as const,
    };
  }

  if (isDimmed) {
    return {
      fill: '#04080f',
      stroke: '#04080f',
      strokeWidth: 0,
      fillOpacity: 0.15,
      outline: 'none' as const,
      cursor: 'default' as const,
    };
  }

  const isDc = stateCode === 'DC';
  const palette = GOVERNOR_MAP_FILLS[getGovernorPartyKey(stateCode)];

  if (mapLevel === 'state' && isSel) {
    return {
      fill: 'transparent',
      stroke: '#e8c96a',
      strokeWidth: 0.35,
      fillOpacity: 1,
      outline: 'none' as const,
      cursor: 'pointer' as const,
    };
  }

  if (isSel) {
    return {
      fill: isHov ? '#d4b86a' : '#c8a951',
      stroke: '#e8c96a',
      strokeWidth: isDc ? 0.55 : 0.35,
      fillOpacity: 1,
      outline: 'none' as const,
      cursor: 'pointer' as const,
      filter: isHov ? 'drop-shadow(0 0 4px rgba(200, 169, 81, 0.55))' : undefined,
    };
  }

  return {
    fill: isHov ? palette.hover : palette.base,
    stroke: isHov ? palette.strokeHover : isDc ? '#c8a951' : palette.stroke,
    strokeWidth: isHov ? (isDc ? 0.55 : 0.35) : isDc ? 0.45 : 0.22,
    fillOpacity: 1,
    outline: 'none' as const,
    cursor: 'pointer' as const,
    transition: 'fill 0.2s ease, stroke 0.2s ease',
    filter: isHov ? 'drop-shadow(0 0 4px rgba(200, 169, 81, 0.45))' : undefined,
  };
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function CountyElectionRow({ election }: { election: CountyElection }) {
  return (
    <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-white text-xs font-medium">{election.title}</div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
          election.isUpcoming ? 'bg-[#c8a951]/20 text-[#c8a951]' : 'bg-gray-500/20 text-gray-400'
        }`}>
          {election.isUpcoming ? 'Upcoming' : 'Result'}
        </span>
      </div>
      <div className="text-[#c8a951] text-[10px] mb-2">
        {new Date(election.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div className="space-y-1">
        {election.candidates.slice(0, 3).map((c) => (
          <div key={c.name} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              {c.won && !election.isUpcoming && <span className="text-green-400">✓</span>}
              <span className={c.won ? 'text-white font-medium' : 'text-gray-400'}>{c.name}</span>
            </div>
            {!election.isUpcoming && c.percentage !== undefined && (
              <span className="text-gray-500">{c.percentage}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PoliticianRow ─────────────────────────────────────────────────────────────
function officialsSectionLabel(stateCode: string, count: number): string {
  if (stateCode === 'DC') return `U.S. House Delegate (${count})`;
  return `Governor, U.S. Senate & House (${count})`;
}

function PoliticianRow({ politician }: { politician: Politician }) {
  const [expanded, setExpanded] = useState(false);
  const finance = politician.campaignFinance;
  const lobbyOrgTotal = finance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
  const partyColor =
    politician.party === 'Democrat'   ? 'bg-blue-500/20 text-blue-400' :
    politician.party === 'Republican' ? 'bg-red-500/20 text-red-400' :
    'bg-gray-500/20 text-gray-300';

  return (
    <div className={`border border-[#1e3a5f] rounded-xl overflow-hidden transition-all ${expanded ? 'border-[#c8a951]/40 shadow-[0_0_12px_rgba(200,169,81,0.15)]' : 'hover:border-[#2d5a8e]/60'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-[#1e3a5f]/40 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.06]">
          <PoliticianAvatar
            name={politician.name}
            firstName={politician.firstName}
            lastName={politician.lastName}
            imageUrl={politician.imageUrl}
            textClassName="text-[#c8a951] text-xs font-bold"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">{politician.name}</div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-1.5 py-0 rounded ${partyColor}`}>{politician.party[0]}</span>
            <span className="text-gray-400 text-xs">{resolveOffice(politician).label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1e3a5f] bg-[#06101e]/60">
          <p className="text-gray-400 text-xs leading-relaxed mt-2.5 mb-2">
            {politician.bio.slice(0, 180)}{politician.bio.length > 180 ? '…' : ''}
          </p>
          {politician.recordType === 'lightweight' ? (
            <div className="mb-2.5 text-xs text-[#c8a951]/80 bg-[#c8a951]/5 border border-[#c8a951]/15 rounded-lg px-2.5 py-2 leading-relaxed">
              Real-sourced record — current office, term, party &amp; state verified.
              Votes, finance &amp; positions not yet integrated.
            </div>
          ) : (
            <>
              <div className="space-y-1.5 mb-2.5">
                {politician.topIssues.slice(0, 5).map(issue => (
                  <div key={issue.name} className="text-xs">
                    <span className="text-[#c8a951] font-medium">{issue.name}: </span>
                    <span className="text-gray-400">{issue.position}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="bg-[#0d1f35] rounded-lg p-2">
                  <div className="text-xs text-gray-500">Total raised</div>
                  <div className="text-sm font-bold text-[#c8a951]">{formatMoney(finance.totalRaised)}</div>
                </div>
                <div className="bg-[#0d1f35] rounded-lg p-2">
                  <div className="text-xs text-gray-500">Individual donors</div>
                  <div className="text-sm font-bold text-green-400">{formatMoney(finance.individualDonations)}</div>
                </div>
                <div className="bg-[#0d1f35] rounded-lg p-2">
                  <div className="text-xs text-gray-500">PAC contributions</div>
                  <div className="text-sm font-bold text-red-400">{formatMoney(finance.pacDonations)}</div>
                </div>
                <div className="bg-[#0d1f35] rounded-lg p-2">
                  <div className="text-xs text-gray-500">Lobbying orgs</div>
                  <div className={`text-sm font-bold ${lobbyOrgTotal > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {lobbyOrgTotal > 0 ? formatMoney(lobbyOrgTotal) : 'No record on file'}
                  </div>
                </div>
              </div>
              {politician.votingRecord.length > 0 && (
                <div className="mb-2.5 text-xs text-gray-500">
                  Recent vote: <span className="text-gray-300">{politician.votingRecord[0].billTitle}</span>
                  <span className={`ml-1 ${politician.votingRecord[0].vote === 'Yea' ? 'text-green-400' : 'text-red-400'}`}>
                    ({politician.votingRecord[0].vote})
                  </span>
                </div>
              )}
            </>
          )}
          <Link
            href={`/politicians/${politician.id}`}
            className="w-full flex items-center justify-center gap-1.5 bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white text-xs py-2 rounded-lg transition-colors font-medium"
          >
            Full Profile & Record <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function USAMap() {
  const searchParams = useSearchParams();
  const { registerNavigator } = useMapNavigation();
  const [mapLevel, setMapLevel]           = useState<MapLevel>('national');
  const [position, _setPosition]          = useState<MapPosition>(NATIONAL);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState]   = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedCountyName, setSelectedCountyName] = useState<string | null>(null);
  const [hoveredCounty, setHoveredCounty]   = useState<{ fips: string; name: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const posRef  = useRef<MapPosition>(NATIONAL);
  const animRef = useRef<number>(0);

  const setPosition = useCallback((p: MapPosition) => {
    posRef.current = p;
    _setPosition(p);
  }, []);

  const flyTo = useCallback((target: MapPosition) => {
    cancelAnimationFrame(animRef.current);
    const start = { ...posRef.current };
    const t0 = performance.now();
    const duration = 900;

    function frame(now: number) {
      const raw = Math.min((now - t0) / duration, 1);
      const e = easeInOutCubic(raw);
      setPosition({
        center: [
          start.center[0] + (target.center[0] - start.center[0]) * e,
          start.center[1] + (target.center[1] - start.center[1]) * e,
        ],
        zoom: start.zoom + (target.zoom - start.zoom) * e,
      });
      if (raw < 1) animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
  }, [setPosition]);

  const navigateToTarget = useCallback((stateCode: string, countyFips?: string) => {
    const stateInfo = STATE_CENTERS[stateCode];
    if (!stateInfo) return;

    setSelectedState(stateCode);
    setMapLevel('state');
    setPanelOpen(true);

    if (countyFips) {
      const county = countyByFips[countyFips];
      setSelectedCounty(countyFips);
      setSelectedCountyName(county?.name ?? null);
      const target = county?.mapCenter && county.mapZoom
        ? { center: county.mapCenter as [number, number], zoom: county.mapZoom }
        : { ...stateInfo, zoom: stateInfo.zoom + 2 };
      flyTo(target);
    } else {
      setSelectedCounty(null);
      setSelectedCountyName(null);
      flyTo(stateInfo);
    }
  }, [flyTo]);

  useEffect(() => {
    registerNavigator(({ stateCode, countyFips }) => {
      navigateToTarget(stateCode, countyFips);
    });
  }, [registerNavigator, navigateToTarget]);

  useEffect(() => {
    const state = searchParams.get('state');
    const county = searchParams.get('county');
    if (state) {
      navigateToTarget(state, county ?? undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const handleStateClick = (stateCode: string) => {
    if (!stateCode) return;
    if (mapLevel === 'state' && stateCode !== selectedState) return;
    if (mapLevel === 'national') {
      navigateToTarget(stateCode);
    } else if (stateCode === selectedState) {
      setSelectedCounty(null);
      setSelectedCountyName(null);
    }
  };

  const backToNational = () => {
    setMapLevel('national');
    setSelectedState(null);
    setSelectedCounty(null);
    setSelectedCountyName(null);
    flyTo(NATIONAL);
  };

  const handleCountyClick = (fips: string, name?: string) => {
    const county = countyByFips[fips];
    const nextSelected = fips === selectedCounty ? null : fips;
    setSelectedCounty(nextSelected);
    setSelectedCountyName(nextSelected ? (county?.name ?? name ?? fips) : null);
    if (nextSelected && county?.mapCenter && county.mapZoom) {
      flyTo({ center: county.mapCenter as [number, number], zoom: county.mapZoom });
    }
  };

  const selectedStateData = useMemo(
    () => (selectedState ? mockStates.find((s) => s.code === selectedState) ?? null : null),
    [selectedState],
  );
  const statePoliticians = useMemo(
    () => (selectedState ? sortOfficialsForDisplay(getPoliticiansForState(selectedState)) : []),
    [selectedState],
  );
  const MAP_SIDEBAR_OFFICIAL_LIMIT = 8;
  const stateElections = useMemo(
    () => (selectedState ? mockElections.filter((e) => e.stateCode === selectedState) : []),
    [selectedState],
  );
  const upcomingStateElections = useMemo(
    () => stateElections.filter((e) => e.isUpcoming),
    [stateElections],
  );
  const stateFips = selectedState ? STATE_FIPS[selectedState] ?? null : null;
  const stateCounties: CountyData[] = selectedState ? (countiesByState[selectedState] ?? []) : [];
  const selectedCountyData = selectedCounty ? countyByFips[selectedCounty] : null;
  const selectedCountyPending = selectedCounty && !selectedCountyData;
  const hoveredCountyData = hoveredCounty ? countyByFips[hoveredCounty.fips] : undefined;
  const hoveredStateSummary = useMemo(() => {
    if (!hoveredState || mapLevel !== 'national' || selectedState) return null;
    const officials = getPoliticiansForState(hoveredState);
    const governor = officials.find((p) => p.chamber === 'governor');
    const econSlice = hoveredState === 'FL' ? getStateEconomicSlice() : null;
    const medianIncome = econSlice?.indicators.find((i) => i.label === 'Median household income');
    const medianHomeValue = econSlice?.indicators.find((i) => i.label === 'Median home value');
    return {
      stateLabel: STATE_NAME_BY_CODE[hoveredState] ?? hoveredState,
      governorName: governor?.name,
      medianIncome: medianIncome?.value,
      medianHomeValue: medianHomeValue?.value,
      officialCount: officials.length,
    };
  }, [hoveredState, mapLevel, selectedState]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ── Map ── */}
      <ComposableMap
        projection="geoAlbersUsa"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.center}
          minZoom={0.5}
          maxZoom={20}
          onMoveEnd={({ coordinates, zoom }: { coordinates: [number, number]; zoom: number }) => {
            // sync after user manually pans/scrolls
            cancelAnimationFrame(animRef.current);
            setPosition({ center: coordinates, zoom });
          }}
        >
          {/* County boundaries — only when zoomed into a state */}
          {mapLevel === 'state' && stateFips && (
            <Geographies geography={GEO_COUNTIES}>
              {({ geographies }: { geographies: any[] }) =>
                geographies
                  .filter((geo: any) => String(geo.id).padStart(5, '0').slice(0, 2) === stateFips)
                  .map((geo: any) => {
                    const fips = String(geo.id).padStart(5, '0');
                    const hasData   = !!countyByFips[fips];
                    const isSelC    = selectedCounty === fips;
                    const isHovC    = hoveredCounty?.fips === fips;
                    return (
                      <Geography
                        key={`c-${geo.rsmKey}`}
                        geography={geo}
                        onMouseEnter={() => setHoveredCounty({ fips, name: geo.properties.name || fips })}
                        onMouseLeave={() => setHoveredCounty(null)}
                        onClick={() => handleCountyClick(fips, geo.properties.name || fips)}
                        style={{
                          default: {
                            fill: isSelC ? '#c8a951' : isHovC ? '#3d6a9e' : hasData ? '#1a3555' : '#122640',
                            stroke: isSelC ? '#e8c96a' : hasData ? '#5a8fc4' : '#2a4a6e',
                            strokeWidth: isSelC ? 0.4 : hasData ? 0.15 : 0.08,
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          hover:   { fill: '#3d6a9e', stroke: '#c8a951', strokeWidth: 0.25, outline: 'none', cursor: 'pointer' },
                          pressed: { fill: '#c8a951', stroke: '#e8c96a', strokeWidth: 0.4, outline: 'none' },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          )}

          {/* State boundaries */}
          <Geographies geography={GEO_STATES}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => {
                const stateName = geo.properties.name;
                const stateCode = STATE_ABBR[stateName];
                const isSel     = selectedState === stateCode;
                const isHov     = hoveredState === stateCode;
                const isDimmed  = mapLevel === 'state' && !isSel;
                const defaultStyle = nationalStateStyle(stateCode, mapLevel, isSel, isHov, isDimmed);
                const hoverStyle = nationalStateStyle(stateCode, mapLevel, isSel, true, isDimmed);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => !isDimmed && stateCode && setHoveredState(stateCode)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => !isDimmed && stateCode && handleStateClick(stateCode)}
                    style={{
                      default: defaultStyle,
                      hover: hoverStyle,
                      pressed: {
                        fill: '#c8a951',
                        stroke: '#e8c96a',
                        strokeWidth: stateCode === 'DC' ? 0.55 : 0.35,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* DC callout — visible clickable target when the district polygon is too small */}
          {mapLevel === 'national' && (
            <Marker coordinates={DC_COORDS}>
              <g
                role="button"
                tabIndex={0}
                aria-label="District of Columbia"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredState('DC')}
                onMouseLeave={() => setHoveredState(null)}
                onClick={() => handleStateClick('DC')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleStateClick('DC'); }}
              >
                <circle
                  r={selectedState === 'DC' ? 3.2 : hoveredState === 'DC' ? 3 : 2.6}
                  fill={selectedState === 'DC' ? '#c8a951' : hoveredState === 'DC' ? '#254a75' : '#1a3555'}
                  stroke="#c8a951"
                  strokeWidth={0.45}
                  style={{ filter: hoveredState === 'DC' ? 'drop-shadow(0 0 3px rgba(200,169,81,0.7))' : undefined }}
                />
                <rect
                  x={3.2}
                  y={-5}
                  width={10}
                  height={6}
                  rx={1.2}
                  fill="#08152a"
                  stroke="#c8a951"
                  strokeWidth={0.35}
                />
                <text
                  x={8.2}
                  y={-0.8}
                  textAnchor="middle"
                  style={{ fill: '#c8a951', fontSize: 3.2, fontWeight: 600, pointerEvents: 'none' }}
                >
                  DC
                </text>
              </g>
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {/* ── State hover tooltip ── */}
      {hoveredStateSummary && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-[#08152a]/95 backdrop-blur-md border border-[#c8a951]/30 rounded-xl px-4 py-2.5 shadow-xl min-w-[200px]">
              <div className="text-[#c8a951] font-semibold text-sm">
                {hoveredStateSummary.stateLabel}
              </div>
              {hoveredStateSummary.governorName && (
                <div className="text-gray-300 text-xs mt-0.5">
                  Gov. {hoveredStateSummary.governorName}
                </div>
              )}
              {hoveredStateSummary.medianIncome && (
                <div className="text-gray-400 text-xs mt-0.5">
                  Median income: {hoveredStateSummary.medianIncome}
                </div>
              )}
              {hoveredStateSummary.medianHomeValue && (
                <div className="text-gray-400 text-xs mt-0.5">
                  Median home value: {hoveredStateSummary.medianHomeValue}
                </div>
              )}
              <div className="text-gray-500 text-[11px] mt-1">
                {hoveredStateSummary.officialCount} official{hoveredStateSummary.officialCount !== 1 ? 's' : ''} — click to explore
              </div>
            </div>
          </div>
      )}

      {/* Governor party legend (national view) */}
      {mapLevel === 'national' && !selectedState && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
          <div className="bg-[#08152a]/92 backdrop-blur-md border border-white/[0.08] rounded-xl px-3 py-2.5 shadow-lg">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Current governor party</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {([
                ['democrat', 'Democrat', GOVERNOR_MAP_FILLS.democrat.base],
                ['republican', 'Republican', GOVERNOR_MAP_FILLS.republican.base],
                ['independent', 'Independent', GOVERNOR_MAP_FILLS.independent.base],
                ['unknown', 'No data', GOVERNOR_MAP_FILLS.unknown.base],
              ] as const).map(([, label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-white/10" style={{ background: color }} />
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Back to national button ── */}
      {/* Hidden while the full-width panel is open on small screens (the panel
          header already provides an "All States" breadcrumb there) so it never
          overlaps the panel content. On sm+ the panel is a right-side rail, so
          the top-left control is clear of it. */}
      {mapLevel === 'state' && (
        <button
          onClick={backToNational}
          className={`absolute top-4 left-4 z-30 items-center gap-2 bg-[#08152a]/90 border border-[#1e3a5f] hover:border-[#c8a951] text-white px-3 py-2 rounded-xl text-sm transition-colors ${panelOpen ? 'hidden sm:flex' : 'flex'}`}
        >
          <ArrowLeft className="h-4 w-4 text-[#c8a951]" />
          All States
        </button>
      )}

      {/* ── County hover tooltip ── */}
      {hoveredCounty && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-[#08152a]/95 border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-sm text-white">
            <span className="text-[#c8a951] font-medium">{hoveredCounty.name}</span>
            {hoveredCountyData && (
              <span className="text-gray-400 ml-2 text-xs">
                {hoveredCountyData.officials.length} official{hoveredCountyData.officials.length !== 1 ? 's' : ''} tracked
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Side panel ── */}
      {selectedState && panelOpen && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-[#08152a]/95 backdrop-blur-md border-l border-white/[0.08] overflow-y-auto z-20 flex flex-col shadow-2xl">

          {/* Header / breadcrumb */}
          <div className="sticky top-0 bg-[#08152a] border-b border-[#1e3a5f] px-4 py-3 z-10">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <button onClick={backToNational} className="hover:text-[#c8a951] transition-colors">All States</button>
              <ChevronRight className="h-3 w-3" />
              <button
                onClick={() => { setSelectedCounty(null); setSelectedCountyName(null); }}
                className={`transition-colors ${selectedCountyData || selectedCountyPending ? 'hover:text-[#c8a951]' : 'text-gray-300'}`}
              >
                {selectedStateData?.name ?? selectedState}
              </button>
              {(selectedCountyData || selectedCountyPending) && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-[#c8a951]">{selectedCountyData?.name ?? selectedCountyName}</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-lg">
                  {selectedCountyData ? selectedCountyData.name : selectedCountyPending ? (selectedCountyName ?? 'County') : (selectedStateData?.name ?? selectedState)}
                </div>
                <div className="text-gray-400 text-xs">
                  {selectedState === 'DC'
                    ? 'Federal district · non-voting House delegate'
                    : selectedCountyData
                    ? `${selectedCountyData.officials.length} official(s) tracked`
                    : selectedCountyPending
                      ? 'Official records integration in progress'
                    : `${selectedStateData?.activePoliticians ?? 0} officials tracked`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1e3a5f] transition-colors"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 space-y-4">

            {/* ── County detail view ── */}
            {selectedCountyPending ? (
              <>
                <button
                  onClick={() => { setSelectedCounty(null); setSelectedCountyName(null); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#c8a951] transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to {selectedStateData?.name ?? selectedState}
                </button>
                <div className="bg-[#0d1f35] rounded-xl p-6 border border-[#1e3a5f] text-center">
                  <MapPin className="h-10 w-10 text-[#c8a951]/40 mx-auto mb-3" />
                  <p className="text-white font-medium text-sm mb-2">
                    Official records integration in progress for {selectedCountyName ?? 'this county'}
                  </p>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    County-level official directories are being connected. The governor, U.S. senators, and U.S. representatives for {selectedStateData?.name ?? selectedState} are listed below.
                  </p>
                </div>
                {statePoliticians.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">
                        {selectedState ? officialsSectionLabel(selectedState, statePoliticians.length) : 'Elected Officials'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {statePoliticians.slice(0, MAP_SIDEBAR_OFFICIAL_LIMIT).map(p => <PoliticianRow key={p.id} politician={p} />)}
                    </div>
                    {statePoliticians.length > MAP_SIDEBAR_OFFICIAL_LIMIT && selectedState && (
                      <Link
                        href={`/politicians?state=${selectedState}`}
                        className="mt-2 block text-center text-xs text-[#c8a951] hover:text-[#e8c96a] transition-colors"
                      >
                        View all {statePoliticians.length} officials →
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : selectedCountyData ? (
              <>
                <button
                  onClick={() => setSelectedCounty(null)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#c8a951] transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to {selectedStateData?.name ?? selectedState}
                </button>

                {(selectedCountyData.seat || selectedCountyData.population) && (
                  <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] space-y-1">
                    {selectedCountyData.seat && (
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        County seat: <span className="text-gray-300">{selectedCountyData.seat}</span>
                      </div>
                    )}
                    {selectedCountyData.population && (
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        Population: <span className="text-gray-300">{selectedCountyData.population.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">County Officials</span>
                    </div>
                    <Link
                      href={`/counties/${selectedCountyData.fips}`}
                      className="flex items-center gap-1 text-xs text-[#c8a951] hover:text-white transition-colors"
                    >
                      Full page <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {selectedCountyData.officials.map(o => (
                      <OfficialCard key={o.id} official={o} />
                    ))}
                  </div>
                </div>

                {/* County elections */}
                {(selectedCountyData.elections ?? []).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <History className="h-4 w-4 text-purple-400" />
                      <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Elections</span>
                    </div>
                    <div className="space-y-2">
                      {(selectedCountyData.elections ?? []).map(e => (
                        <CountyElectionRow key={e.id} election={e} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* ── State view ──
                    Order: (1) currently elected officials at the TOP,
                    (2) then counties below, (3) then elections / other. */}

                {/* Currently elected officials */}
                {selectedState === 'DC' && (
                  <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#c8a951]/20 text-xs text-gray-400 leading-relaxed">
                    District of Columbia has no governor or voting members of Congress.
                    The non-voting delegate to the U.S. House is listed below when present in the authoritative legislators dataset.
                  </div>
                )}

                {statePoliticians.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">
                          {selectedState ? officialsSectionLabel(selectedState, statePoliticians.length) : 'Elected Officials'}
                        </span>
                      </div>
                      {selectedState && statePoliticians.length > MAP_SIDEBAR_OFFICIAL_LIMIT && (
                        <Link
                          href={`/politicians?state=${selectedState}`}
                          className="text-[10px] text-[#c8a951] hover:text-[#e8c96a] whitespace-nowrap"
                        >
                          Full list →
                        </Link>
                      )}
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {statePoliticians.slice(0, MAP_SIDEBAR_OFFICIAL_LIMIT).map(p => <PoliticianRow key={p.id} politician={p} />)}
                    </div>
                    {statePoliticians.length > MAP_SIDEBAR_OFFICIAL_LIMIT && selectedState && (
                      <Link
                        href={`/politicians?state=${selectedState}`}
                        className="mt-2 block text-center text-xs text-[#c8a951] hover:text-[#e8c96a] transition-colors"
                      >
                        View all {statePoliticians.length} officials →
                      </Link>
                    )}
                  </div>
                )}

                {selectedState === 'FL' && (
                  <>
                    <FloridaStateEconomicPanel
                      slice={getStateEconomicSlice()}
                      collapsedLabels={['Population', 'Unemployment level', 'Employment', 'Labor force']}
                    />
                    <FloridaRecordPanel
                      title="Recent Supreme Court Opinions"
                      subtitle="Case summaries — click title for full opinion."
                      slice={getJudiciaryCourtsSlice()}
                    />
                  </>
                )}

                {/* County directory (only when zoomed into state) */}
                {mapLevel === 'state' && stateCounties.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-[#c8a951]" />
                      <span className="text-[#c8a951] text-xs font-semibold uppercase tracking-wider">
                        Counties with Data ({stateCounties.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {stateCounties.map(county => (
                        <div key={county.fips} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCountyClick(county.fips, county.name)}
                            className="flex-1 flex items-center justify-between text-left px-3 py-2 rounded-lg bg-[#0d1f35] hover:bg-[#1e3a5f] transition-colors"
                          >
                            <span className="text-white text-xs font-medium">{county.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500 text-xs">{county.officials.length} official{county.officials.length !== 1 ? 's' : ''}</span>
                              <ChevronRight className="h-3 w-3 text-gray-500" />
                            </div>
                          </button>
                          <Link
                            href={`/counties/${county.fips}`}
                            className="p-2 text-gray-500 hover:text-[#c8a951] transition-colors rounded-lg bg-[#0d1f35]"
                            title="Open county page"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center">Or click a county on the map</p>
                  </div>
                )}

                {/* Upcoming elections */}
                {upcomingStateElections.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#c8a951]" />
                      <span className="text-[#c8a951] text-xs font-semibold uppercase tracking-wider">Upcoming Elections</span>
                    </div>
                    <div className="space-y-2">
                      {upcomingStateElections.map(election => (
                        <div key={election.id} className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f]">
                          <div className="text-white text-sm font-medium mb-1">{election.title}</div>
                          <div className="text-[#c8a951] text-xs mb-2">
                            {new Date(election.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="space-y-1.5">
                            {election.candidates.map(c => (
                              <div key={c.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 rounded ${
                                    c.party === 'Democrat' ? 'bg-blue-500/20 text-blue-400' :
                                    c.party === 'Republican' ? 'bg-red-500/20 text-red-400' :
                                    'bg-gray-500/20 text-gray-300'
                                  }`}>{c.party[0]}</span>
                                  <span className="text-gray-300 font-medium">{c.name}</span>
                                </div>
                                <span className="text-gray-500">{formatMoney(c.fundsRaised)}</span>
                              </div>
                            ))}
                          </div>
                          <Link href={buildCompareUrl(election.id)}
                                className="mt-2 flex items-center gap-1 text-xs text-[#c8a951] hover:text-white transition-colors">
                            <Vote className="h-3 w-3" /> Compare candidates
                          </Link>
                        </div>
                      ))}
                    </div>
                    {selectedState === 'FL' && (
                      <div className="mt-2 bg-[#0a1628] rounded-xl p-3 border border-dashed border-[#1e3a5f]">
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Additional ballot races (U.S. House districts, statewide cabinet, local): not yet integrated.
                          FL U.S. Senate seats are not on the 2026 general ballot.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {statePoliticians.length === 0 && stateElections.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <p>Full data for {selectedStateData?.name ?? selectedState} coming soon</p>
                    <p className="text-xs mt-1 text-gray-600">Integration with Congress.gov API in progress</p>
                  </div>
                )}

                <Link href={`/politicians?state=${selectedState}`}
                      className="flex items-center justify-center gap-2 w-full bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <Users className="h-4 w-4" /> All {selectedStateData?.name ?? selectedState} Politicians
                </Link>
                <Link href={`/elections?state=${selectedState}`}
                      className="flex items-center justify-center gap-2 w-full bg-[#c8a951] hover:bg-[#b8944a] text-[#0a1628] py-2.5 rounded-xl text-sm font-bold transition-colors">
                  <Calendar className="h-4 w-4" /> All {selectedStateData?.name ?? selectedState} Elections
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── National hint ── */}
      {!selectedState && mapLevel === 'national' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0a1628]/90 backdrop-blur-md border border-white/[0.08] rounded-full px-5 py-2.5 text-xs text-white/50 pointer-events-none shadow-lg sm:translate-x-0 sm:left-[calc(50%+6rem)]">
          Select a state to zoom in · DC label marks the federal district
        </div>
      )}

      {/* Panel toggle when closed */}
      {selectedState && !panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute top-4 right-4 z-30 bg-[#08152a]/90 border border-[#c8a951]/30 text-[#c8a951] px-3 py-2 rounded-xl text-sm"
        >
          Open panel
        </button>
      )}
    </div>
  );
}
