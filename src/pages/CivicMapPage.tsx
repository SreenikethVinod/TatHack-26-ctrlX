import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Filter,
  Search,
  Layers,
  ArrowRight,
  ThumbsUp,
  Clock,
  Building,
  CheckCircle2,
  Crosshair,
  Flame,
  Globe,
  Mountain,
  Navigation,
  Compass,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  HardHat,
  IndianRupee,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint } from '../types';
import {
  LeafletMap,
  MapLayerStyle,
  calculateDistanceKm,
  getValidCoordinates,
} from '../components/LeafletMap';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onSelectComplaint: (reference: string) => void;
  onReportNavigate: () => void;
}

export const CivicMapPage: React.FC<Props> = ({ onSelectComplaint, onReportNavigate }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Map view controls
  const [layerStyle, setLayerStyle] = useState<MapLayerStyle>('street');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  // User location state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null>(null);

  // Filters
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [distanceRadius, setDistanceRadius] = useState<'all' | '2' | '5' | '10'>('all');
  const [sideTab, setSideTab] = useState<'selected' | 'nearby' | 'hotspots'>('selected');

  const fetchMapComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaints({
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
      });
      const list = res.complaints || [];
      setComplaints(list);
      if (list.length > 0 && !selectedComplaint) {
        setSelectedComplaint(list[0]);
      }
    } catch (err) {
      console.error('Failed to load map data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapComplaints();
  }, [category, status]);

  // Compute complaints with distance to user's detected location
  const complaintsWithDistance = useMemo(() => {
    return complaints.map((c) => {
      const coords = getValidCoordinates(c);
      const dist = userLocation
        ? calculateDistanceKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
        : undefined;
      return {
        ...c,
        computedLat: coords.lat,
        computedLng: coords.lng,
        distanceKm: dist,
      };
    });
  }, [complaints, userLocation]);

  // Filter complaints based on distance radius if requested
  const filteredComplaints = useMemo(() => {
    if (distanceRadius === 'all' || !userLocation) {
      return complaintsWithDistance;
    }
    const maxKm = parseFloat(distanceRadius);
    return complaintsWithDistance.filter((c) => c.distanceKm !== undefined && c.distanceKm <= maxKm);
  }, [complaintsWithDistance, distanceRadius, userLocation]);

  // Sorted nearby complaints (closest first)
  const nearbyComplaints = useMemo(() => {
    if (!userLocation) return [];
    return [...complaintsWithDistance]
      .filter((c) => c.distanceKm !== undefined)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [complaintsWithDistance, userLocation]);

  // Area density hotspot clusters
  const hotspotClusters = useMemo(() => {
    const areaMap: Record<string, { locality: string; count: number; critical: number; inProgress: number }> = {};
    complaintsWithDistance.forEach((c) => {
      const loc = c.locality || 'Metro Area';
      if (!areaMap[loc]) {
        areaMap[loc] = { locality: loc, count: 0, critical: 0, inProgress: 0 };
      }
      areaMap[loc].count += 1;
      if (c.priority === 'Critical') areaMap[loc].critical += 1;
      if (c.status === 'In Progress') areaMap[loc].inProgress += 1;
    });

    return Object.values(areaMap).sort((a, b) => b.count - a.count);
  }, [complaintsWithDistance]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Title & Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Spatial Civic Intelligence &amp; GPS Radar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Metropolitan Civic Map</span>
            {showHeatmap && (
              <span className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
                Density Heatmap Active
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Real-time GPS positioning, issue density heatmap overlay, and localized grievance index.
          </p>
        </div>

        {/* User Location Pill & Quick Report */}
        <div className="flex flex-wrap items-center gap-2">
          {userLocation ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <div className="max-w-[220px] truncate">
                <span className="text-[10px] text-blue-500 uppercase font-bold block">Current Location</span>
                <span className="truncate">{userLocation.address || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
              <Crosshair className="w-3.5 h-3.5 text-slate-400" />
              <span>Detecting GPS Location...</span>
            </div>
          )}

          <button
            type="button"
            onClick={onReportNavigate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>+ Report Issue Here</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[11px] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="all">All Categories ({complaints.length})</option>
            <option value="road_damage">Road &amp; Pavement</option>
            <option value="waste_management">Waste Management</option>
            <option value="drainage">Drainage &amp; Flooding</option>
            <option value="streetlights">Lighting &amp; Signals</option>
            <option value="water_supply">Water Supply</option>
            <option value="public_safety">Public Safety</option>
            <option value="other">Other Civic Issues</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted (Active)</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress (Field Work)</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Distance Proximity Filter */}
          {userLocation && (
            <div className="flex items-center gap-1 bg-blue-50/80 p-1 rounded-xl border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 px-1.5">Radius:</span>
              {(['all', '2', '5', '10'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDistanceRadius(r)}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    distanceRadius === r
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {r === 'all' ? 'All Metro' : `< ${r} km`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layer style indicator & Heatmap toggle quick switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setLayerStyle('street')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                layerStyle === 'street' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="CARTO Voyager Street Map"
            >
              <span>🗺️ Street</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerStyle('positron')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                layerStyle === 'positron' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="CARTO Positron Clean Light"
            >
              <span>☀️ Light</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerStyle('dark')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                layerStyle === 'dark' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="CARTO Dark Matter Night Ops"
            >
              <span>🌙 Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerStyle('satellite')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                layerStyle === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Satellite Imagery"
            >
              <span>🛰️ Satellite</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerStyle('terrain')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                layerStyle === 'terrain' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Topographic Terrain"
            >
              <span>⛰️ Terrain</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showHeatmap
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap {showHeatmap ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* MAIN INTERACTIVE MAP & INSPECTOR / NEARBY ISSUES PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 syntrix-card overflow-hidden bg-white p-2 border border-slate-200 rounded-2xl">
          <LeafletMap
            complaints={filteredComplaints}
            selectedComplaintId={selectedComplaint?.id}
            onSelectComplaint={(c) => {
              setSelectedComplaint(c);
              setSideTab('selected');
            }}
            height="620px"
            layerStyle={layerStyle}
            onLayerStyleChange={setLayerStyle}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            userLocation={userLocation}
            onUserLocationDetected={setUserLocation}
          />
        </div>

        {/* Side Panel: Tabbed Inspector, Issues in Area, & Density Hotspots (4 cols) */}
        <div className="lg:col-span-4 syntrix-card bg-white p-5 space-y-4 border border-slate-200 rounded-2xl">
          {/* Sub-tab navigation */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSideTab('selected')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer truncate text-center ${
                sideTab === 'selected'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selected
            </button>
            <button
              type="button"
              onClick={() => setSideTab('nearby')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer truncate text-center ${
                sideTab === 'nearby'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Near You ({nearbyComplaints.length})
            </button>
            <button
              type="button"
              onClick={() => setSideTab('hotspots')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer truncate text-center ${
                sideTab === 'hotspots'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hotspots ({hotspotClusters.length})
            </button>
          </div>

          {/* TAB 1: SELECTED COMPLAINT INSPECTOR */}
          {sideTab === 'selected' && (
            <div>
              {!selectedComplaint ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs">Click any pin on the map to inspect incident details.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedComplaint.reference}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={selectedComplaint.status} size="sm" />
                      <PriorityBadge priority={selectedComplaint.priority} size="sm" showIcon={false} />
                    </div>
                  </div>

                  {/* Distance from user badge */}
                  {userLocation && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        <span>Distance From You:</span>
                      </div>
                      <span className="font-black text-blue-700 font-mono">
                        {calculateDistanceKm(
                          userLocation.lat,
                          userLocation.lng,
                          getValidCoordinates(selectedComplaint).lat,
                          getValidCoordinates(selectedComplaint).lng
                        )}{' '}
                        km
                      </span>
                    </div>
                  )}

                  {selectedComplaint.imageUrl && (
                    <div className="h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img
                        src={selectedComplaint.imageUrl}
                        alt={selectedComplaint.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="font-black text-slate-900 text-sm leading-snug mb-1">
                      {selectedComplaint.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* Worker & Approved Budget if available */}
                  {(selectedComplaint.assignedWorker || (selectedComplaint.budget && selectedComplaint.budget > 0)) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      {selectedComplaint.assignedWorker && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Worker / Crew:</span>
                          <strong className="text-slate-800">{selectedComplaint.assignedWorker}</strong>
                        </div>
                      )}
                      {selectedComplaint.budget && selectedComplaint.budget > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Approved Budget:</span>
                          <strong className="text-emerald-700 font-mono">
                            ₹{selectedComplaint.budget.toLocaleString()}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{selectedComplaint.address || selectedComplaint.locality}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{selectedComplaint.assignedDepartment}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Reported on{' '}
                        {new Date(selectedComplaint.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectComplaint(selectedComplaint.reference)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Inspect Full Audit Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ISSUES IN YOUR AREA (SORTED BY DISTANCE) */}
          {sideTab === 'nearby' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                <span>Civic Issues Ordered by Proximity</span>
                <span>{nearbyComplaints.length} in Reach</span>
              </div>

              {!userLocation ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <Crosshair className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="text-xs">Turn on GPS location to calculate nearby issues.</p>
                </div>
              ) : nearbyComplaints.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <p className="text-xs">No issues reported within this search range.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {nearbyComplaints.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedComplaint(c);
                        setSideTab('selected');
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedComplaint?.id === c.id
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-indigo-700 text-[11px]">{c.reference}</span>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-200">
                          🧭 {c.distanceKm} km away
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 line-clamp-1 mb-1">{c.title}</h4>
                      <p className="text-slate-500 text-[11px] line-clamp-1 mb-2">{c.address || c.locality}</p>
                      <div className="flex items-center justify-between text-[11px]">
                        <StatusBadge status={c.status} size="sm" />
                        <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DENSITY HOTSPOTS & REPORT VOLUME */}
          {sideTab === 'hotspots' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                <span>Highest Density Localities</span>
                <span className="flex items-center gap-1 text-rose-600 font-bold">
                  <Flame className="w-3.5 h-3.5" /> High Volume
                </span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {hotspotClusters.map((h, idx) => (
                  <div
                    key={h.locality}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            idx === 0
                              ? 'bg-rose-600 text-white'
                              : idx === 1
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-900">{h.locality}</span>
                      </div>
                      <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-mono text-[11px]">
                        {h.count} Issues
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>{h.critical} Critical Hazard</span>
                      <span>{h.inProgress} In Progress</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
