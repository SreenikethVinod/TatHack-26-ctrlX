import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint } from '../types';
import { LeafletMap } from '../components/LeafletMap';
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

  // Filters
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

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

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Spatial Civic Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Metropolitan Civic Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Geographic heatmap and pin index of verified municipal reports across the district.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="all">All Categories</option>
            <option value="road_damage">Road &amp; Pavement</option>
            <option value="waste_management">Waste Management</option>
            <option value="drainage">Drainage &amp; Flooding</option>
            <option value="streetlights">Lighting &amp; Signals</option>
            <option value="water_supply">Water Supply</option>
            <option value="public_safety">Public Safety</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={onReportNavigate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            + Report at Location
          </button>
        </div>
      </div>

      {/* Main Interactive Map & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 syntrix-card overflow-hidden bg-white p-2">
          <LeafletMap
            complaints={complaints}
            selectedComplaintId={selectedComplaint?.id}
            onSelectComplaint={(c) => setSelectedComplaint(c)}
            height="580px"
          />
        </div>

        {/* Selected Complaint Card (4 cols) */}
        <div className="lg:col-span-4 syntrix-card bg-white p-6 space-y-5">
          {!selectedComplaint ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs">Click any pin on the map to inspect incident details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {selectedComplaint.reference}
                </span>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={selectedComplaint.status} size="sm" />
                  <PriorityBadge priority={selectedComplaint.priority} size="sm" showIcon={false} />
                </div>
              </div>

              {selectedComplaint.imageUrl && (
                <div className="h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={selectedComplaint.imageUrl}
                    alt={selectedComplaint.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h3 className="font-extrabold text-slate-900 text-sm leading-snug mb-1">
                  {selectedComplaint.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="truncate">{selectedComplaint.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-600 shrink-0" />
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
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Inspect Full Audit Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
