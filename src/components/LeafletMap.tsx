import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';
import { Complaint } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
}

export const LeafletMap: React.FC<Props> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  height = '500px',
  zoom = 13,
  center = [37.768, -122.425],
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapError, setMapError] = useState(false);

  // Complaints with valid numeric coordinates
  const geoComplaints = complaints.filter(
    (c) => typeof c.latitude === 'number' && !isNaN(c.latitude) && typeof c.longitude === 'number' && !isNaN(c.longitude)
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Resolve leaflet export reliably in both ESM and CJS bundle modes
    const leaflet = (L as any).default || L;

    // Prevent duplicate leaflet container initialization
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      } catch (e) {
        console.warn('Map cleanup notice:', e);
      }
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    try {
      const map = leaflet.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // High-performance, crisp CartoDB Voyager tiles matching modern design
      leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      const markersLayer = leaflet.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Ensure Leaflet computes container dimensions after DOM layout
      const resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', handleResize);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            // Ignore unmount teardown warnings
          }
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn('Leaflet map initialization notice:', err);
      setMapError(true);
    }
  }, []);

  // Update markers when complaints or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const leaflet = (L as any).default || L;
    markersLayerRef.current.clearLayers();

    const bounds = leaflet.latLngBounds([]);

    geoComplaints.forEach((c) => {
      const lat = c.latitude!;
      const lng = c.longitude!;
      bounds.extend([lat, lng]);

      const isSelected = selectedComplaintId === c.id;

      // Color coding based on status and priority
      let pinColor = '#4f46e5'; // Indigo default
      let pinBorder = '#3730a3';
      if (c.status === 'Resolved') {
        pinColor = '#10b981'; // Emerald
        pinBorder = '#047857';
      } else if (c.status === 'In Progress') {
        pinColor = '#f59e0b'; // Amber
        pinBorder = '#b45309';
      } else if (c.priority === 'Critical') {
        pinColor = '#e11d48'; // Rose
        pinBorder = '#9f1239';
      }

      const customIcon = leaflet.divIcon({
        className: 'custom-civic-pin',
        html: `
          <div style="
            position: relative;
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            background-color: ${pinColor};
            border: 3px solid ${isSelected ? '#ffffff' : pinBorder};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background-color: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -32],
      });

      const marker = leaflet.marker([lat, lng], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; max-width: 240px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 700; color: #4f46e5; margin-bottom: 4px;">${c.reference}</div>
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 6px; line-height: 1.3;">${c.title}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${c.address}</div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${c.status}</span>
            <span style="font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${c.priority}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectComplaint) {
          onSelectComplaint(c);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });

    if (geoComplaints.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
  }, [complaints, selectedComplaintId]);

  // If map error occurred or no geolocation library support, render high-fidelity locality cards
  if (mapError || geoComplaints.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full bg-slate-900 text-slate-100 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-inner border border-slate-800"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white text-base">Civic Geographic Distribution</h3>
          </div>
          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded-full font-medium">
            {complaints.length} Reported Incidents
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-4 overflow-y-auto max-h-[340px] pr-2">
          {complaints.slice(0, 9).map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectComplaint?.(c)}
              className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl hover:border-indigo-500/60 cursor-pointer transition-all hover:bg-slate-800"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono font-bold text-indigo-400">{c.reference}</span>
                <span className="text-[11px] text-slate-400">{c.locality}</span>
              </div>
              <p className="text-sm font-medium text-slate-200 line-clamp-1 mb-2">{c.title}</p>
              <div className="flex items-center justify-between text-xs">
                <StatusBadge status={c.status} size="sm" />
                <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between pt-3 border-t border-slate-800">
          <span>San Francisco Metropolitan Metro District</span>
          <span className="flex items-center gap-1 text-indigo-400">
            <Navigation className="w-3.5 h-3.5" /> Live Geo Index
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 max-w-[210px] shadow-sm">
        <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Status Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Resolved ({complaints.filter((c) => c.status === 'Resolved').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600">In Progress ({complaints.filter((c) => c.status === 'In Progress').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <span className="text-slate-600">Critical Safety Alert</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <span className="text-slate-600">Submitted / Active</span>
        </div>
      </div>
    </div>
  );
};
