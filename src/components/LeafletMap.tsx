import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  Flame,
  Globe,
  Mountain,
  Map as MapIcon,
  Crosshair,
  Maximize2,
  Minimize2,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Complaint } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

export type MapLayerStyle = 'street' | 'positron' | 'dark' | 'satellite' | 'terrain';

interface Props {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
  layerStyle?: MapLayerStyle;
  onLayerStyleChange?: (style: MapLayerStyle) => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: (show: boolean) => void;
  userLocation?: { lat: number; lng: number; address?: string } | null;
  onUserLocationDetected?: (loc: { lat: number; lng: number; address?: string }) => void;
  onSelectDistanceFilter?: (radiusKm: number | null) => void;
}

// CARTO API Key provided by user
export const CARTO_API_KEY = 'cb1_4far_1_2c1d034fd93bd4f62dd57110';

// Standard base map tile providers powered by CARTO Basemaps API
export const TILE_CONFIGS: Record<
  MapLayerStyle,
  { label: string; icon: string; url: string; subdomains?: string; attribution: string; maxZoom: number }
> = {
  street: {
    label: 'CARTO Voyager',
    icon: '🗺️',
    url: `/api/tiles/carto/voyager/{z}/{x}/{y}.png`,
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  positron: {
    label: 'CARTO Positron',
    icon: '☀️',
    url: `/api/tiles/carto/positron/{z}/{x}/{y}.png`,
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  dark: {
    label: 'CARTO Dark Matter',
    icon: '🌙',
    url: `/api/tiles/carto/dark/{z}/{x}/{y}.png`,
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  satellite: {
    label: 'Satellite View',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics, USDA, USGS',
    maxZoom: 19,
  },
  terrain: {
    label: 'Simple Terrain',
    icon: '⛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS, EPA, NPS',
    maxZoom: 19,
  },
};

// Deterministic locality coordinates fallback for complaints without GPS
export const KNOWN_LOCALITY_COORDS: Record<string, [number, number]> = {
  'Central Metro': [37.7749, -122.4194],
  'Civic Center': [37.7793, -122.4192],
  'Oakwood Heights': [37.7645, -122.4332],
  'Oakwood North': [37.7695, -122.4382],
  'Mission District': [37.7599, -122.4148],
  'Downtown': [37.7885, -122.4072],
  'Central Municipal Ward': [37.7785, -122.421],
  'Metropolitan District HQ': [37.782, -122.418],
  'North End': [37.801, -122.411],
  'South Bay': [37.751, -122.405],
  'Westside': [37.765, -122.46],
  'Market Street': [37.781, -122.413],
  'Central Ward': [37.772, -122.426],
};

// Calculate Haversine distance in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Fallback coordinate assigner so all issues appear on the spatial map
export function getValidCoordinates(c: Complaint): { lat: number; lng: number } {
  if (typeof c.latitude === 'number' && !isNaN(c.latitude) && typeof c.longitude === 'number' && !isNaN(c.longitude)) {
    return { lat: c.latitude, lng: c.longitude };
  }

  // Locality lookup
  if (c.locality && KNOWN_LOCALITY_COORDS[c.locality]) {
    const [baseLat, baseLng] = KNOWN_LOCALITY_COORDS[c.locality];
    // Hash reference to add slight spread so pins don't overlap completely
    const hash = (c.reference || c.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const offsetLat = ((hash % 100) - 50) * 0.00018;
    const offsetLng = (((hash * 3) % 100) - 50) * 0.00018;
    return { lat: baseLat + offsetLat, lng: baseLng + offsetLng };
  }

  // Fallback to default metropolitan civic center with small unique offset
  const hash = (c.reference || c.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    lat: 37.7749 + ((hash % 80) - 40) * 0.00025,
    lng: -122.4194 + (((hash * 7) % 80) - 40) * 0.00025,
  };
}

export const LeafletMap: React.FC<Props> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  height = '580px',
  zoom = 13,
  center = [37.7749, -122.4194],
  layerStyle: controlledLayerStyle,
  onLayerStyleChange,
  showHeatmap: controlledShowHeatmap,
  onToggleHeatmap,
  userLocation: controlledUserLocation,
  onUserLocationDetected,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.LayerGroup | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Internal states
  const [activeLayer, setActiveLayer] = useState<MapLayerStyle>(controlledLayerStyle || 'street');
  const [activeHeatmap, setActiveHeatmap] = useState<boolean>(
    controlledShowHeatmap !== undefined ? controlledShowHeatmap : true
  );
  const [heatmapIntensity, setHeatmapIntensity] = useState<'normal' | 'high' | 'ultra'>('high');
  const [internalUserLoc, setInternalUserLoc] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null>(controlledUserLocation || null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  // Sync controlled props
  useEffect(() => {
    if (controlledLayerStyle && controlledLayerStyle !== activeLayer) {
      setActiveLayer(controlledLayerStyle);
    }
  }, [controlledLayerStyle]);

  useEffect(() => {
    if (controlledShowHeatmap !== undefined && controlledShowHeatmap !== activeHeatmap) {
      setActiveHeatmap(controlledShowHeatmap);
    }
  }, [controlledShowHeatmap]);

  useEffect(() => {
    if (controlledUserLocation) {
      setInternalUserLoc(controlledUserLocation);
    }
  }, [controlledUserLocation]);

  // Prepared complaints with valid coordinates
  const processedComplaints = complaints.map((c) => {
    const coords = getValidCoordinates(c);
    const distanceKm = internalUserLoc
      ? calculateDistanceKm(internalUserLoc.lat, internalUserLoc.lng, coords.lat, coords.lng)
      : undefined;
    return {
      ...c,
      computedLat: coords.lat,
      computedLng: coords.lng,
      distanceKm,
    };
  });

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const leaflet = (L as any).default || L;

    // Teardown previous instance if any
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
        center: internalUserLoc ? [internalUserLoc.lat, internalUserLoc.lng] : center,
        zoom: zoom,
        zoomControl: false, // We'll add custom modern controls
        scrollWheelZoom: true,
      });

      // Add default tile layer
      const config = TILE_CONFIGS[activeLayer];
      const tile = leaflet.tileLayer(config.url, {
        subdomains: config.subdomains || 'abc',
        maxZoom: config.maxZoom,
        attribution: config.attribution,
      }).addTo(map);

      tileLayerRef.current = tile;

      // Group for issue markers
      const markersLayer = leaflet.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Group for user location
      const userGroup = leaflet.layerGroup().addTo(map);
      userMarkerRef.current = userGroup;

      mapInstanceRef.current = map;

      // Setup custom canvas for density heatmap overlay
      const overlayPane = map.getPanes().overlayPane;
      const canvas = document.createElement('canvas');
      canvas.className = 'civic-density-heatmap-canvas';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '350';
      overlayPane.appendChild(canvas);
      heatmapCanvasRef.current = canvas;

      // Invalidate dimensions
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      // Try initial browser geolocation
      detectUserLocation(false);

      return () => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            // Teardown ignore
          }
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('Leaflet initialization failed', err);
      setMapError(true);
    }
  }, []);

  // 2. Change Tile Layer when activeLayer changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const leaflet = (L as any).default || L;
    const config = TILE_CONFIGS[activeLayer];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTile = leaflet.tileLayer(config.url, {
      subdomains: config.subdomains || 'abc',
      maxZoom: config.maxZoom,
      attribution: config.attribution,
    }).addTo(mapInstanceRef.current);

    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, [activeLayer]);

  // 3. User Geolocation Detection Handler
  const detectUserLocation = (flyTo: boolean = true) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocatingUser(false);

        let reverseAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          // Attempt reverse geocoding from backend
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`).then((r) => r.json());
          if (res?.success && res.address) {
            reverseAddress = res.locality || res.address;
          }
        } catch (e) {
          // Silently fallback to coordinates
        }

        const locData = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || 100,
          address: reverseAddress,
        };

        setInternalUserLoc(locData);
        onUserLocationDetected?.(locData);

        if (flyTo && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
        }
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Geolocation notice:', err.message);
        // Fallback to central civic location if user denied GPS
        if (!internalUserLoc) {
          const fallback = {
            lat: 37.7749,
            lng: -122.4194,
            accuracy: 250,
            address: 'Civic Center, Metropolitan Ward',
          };
          setInternalUserLoc(fallback);
          onUserLocationDetected?.(fallback);
        }
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  // 4. Render User Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userMarkerRef.current) return;
    const leaflet = (L as any).default || L;
    userMarkerRef.current.clearLayers();

    if (!internalUserLoc) return;

    const { lat, lng, accuracy, address } = internalUserLoc;

    // Accuracy Circle
    const accuracyCircle = leaflet.circle([lat, lng], {
      radius: Math.min(accuracy || 120, 500),
      color: '#2563eb',
      fillColor: '#60a5fa',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '3, 4',
    });
    userMarkerRef.current.addLayer(accuracyCircle);

    // Pulsing User Pin Icon
    const userPinIcon = leaflet.divIcon({
      className: 'custom-user-location-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div class="user-radar-pulse" style="
            position: absolute;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background-color: rgba(37, 99, 235, 0.45);
          "></div>
          <div style="
            position: relative;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-color: #2563eb;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 5px; height: 5px; border-radius: 50%; background-color: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });

    const userMarker = leaflet.marker([lat, lng], { icon: userPinIcon, zIndexOffset: 1000 });
    userMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 4px; min-width: 180px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px;">
          <span>📍</span>
          <span>Your Current Location</span>
        </div>
        <div style="color: #334155; font-size: 11px; margin-bottom: 6px; line-height: 1.4;">
          ${address || 'Detected Location'}
        </div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace;">
          ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
      </div>
    `);

    userMarkerRef.current.addLayer(userMarker);
  }, [internalUserLoc]);

  // 5. Draw Density Heatmap Overlay Canvas
  const redrawHeatmap = () => {
    const canvas = heatmapCanvasRef.current;
    const map = mapInstanceRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!activeHeatmap || processedComplaints.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const bounds = map.getBounds();
    const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
    const size = map.getSize();

    // Resize canvas if container dimensions changed
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }

    // Position canvas exactly on overlay pane
    L.DomUtil.setPosition(canvas, topLeft);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const zoomLevel = map.getZoom();
    const multiplier = heatmapIntensity === 'ultra' ? 1.6 : heatmapIntensity === 'high' ? 1.3 : 1.0;

    // Dynamic kernel radius scaled by zoom level
    const baseRadius = Math.max(26, Math.min(75, Math.round(28 * Math.pow(1.15, zoomLevel - 12)))) * multiplier;

    // Draw radial density gradients for each reported civic issue
    processedComplaints.forEach((c) => {
      const pt = map.latLngToLayerPoint([c.computedLat, c.computedLng]);
      // Screen offset relative to canvas topLeft
      const x = pt.x - topLeft.x;
      const y = pt.y - topLeft.y;

      // Skip points way outside screen buffer
      if (x < -baseRadius || x > size.x + baseRadius || y < -baseRadius || y > size.y + baseRadius) {
        return;
      }

      // Weight multiplier based on priority/severity
      let weight = 1.0;
      if (c.priority === 'Critical') weight = 1.4;
      else if (c.priority === 'High') weight = 1.2;
      else if (c.priority === 'Low') weight = 0.8;

      const radius = baseRadius * (0.85 + weight * 0.15);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(239, 68, 68, ${0.75 * weight})`); // Hot crimson center
      grad.addColorStop(0.25, `rgba(249, 115, 22, ${0.6 * weight})`); // Radiant orange
      grad.addColorStop(0.5, `rgba(234, 179, 8, ${0.45 * weight})`); // Amber gold
      grad.addColorStop(0.75, `rgba(16, 185, 129, ${0.28 * weight})`); // Emerald
      grad.addColorStop(0.9, `rgba(59, 130, 246, ${0.12 * weight})`); // Cool blue edge
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)'); // Transparent

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  // Sync heatmap drawing with map movement & zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const onMoveOrZoom = () => {
      requestAnimationFrame(redrawHeatmap);
    };

    map.on('move', onMoveOrZoom);
    map.on('zoom', onMoveOrZoom);
    map.on('resize', onMoveOrZoom);
    map.on('viewreset', onMoveOrZoom);

    // Initial draw
    redrawHeatmap();

    return () => {
      map.off('move', onMoveOrZoom);
      map.off('zoom', onMoveOrZoom);
      map.off('resize', onMoveOrZoom);
      map.off('viewreset', onMoveOrZoom);
    };
  }, [processedComplaints, activeHeatmap, heatmapIntensity]);

  // 6. Update Issue Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const leaflet = (L as any).default || L;
    markersLayerRef.current.clearLayers();

    processedComplaints.forEach((c) => {
      const lat = c.computedLat;
      const lng = c.computedLng;
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
      } else if (c.status === 'Rejected') {
        pinColor = '#94a3b8'; // Slate
        pinBorder = '#64748b';
      } else if (c.priority === 'Critical') {
        pinColor = '#e11d48'; // Rose
        pinBorder = '#9f1239';
      }

      const customIcon = leaflet.divIcon({
        className: 'custom-civic-pin',
        html: `
          <div style="
            position: relative;
            width: ${isSelected ? '34px' : '28px'};
            height: ${isSelected ? '34px' : '28px'};
            background-color: ${pinColor};
            border: 3px solid ${isSelected ? '#ffffff' : pinBorder};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: ${
              isSelected ? '0 0 0 3px rgba(79, 70, 229, 0.4), 0 8px 12px rgba(0,0,0,0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.25)'
            };
            transition: all 0.2s ease-in-out;
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
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = leaflet.marker([lat, lng], { icon: customIcon });

      const distanceBadge =
        c.distanceKm !== undefined
          ? `<div style="font-size: 11px; font-weight: 700; color: #1d4ed8; background: #eff6ff; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span>🧭</span> ${c.distanceKm} km from your location
            </div>`
          : '';

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; max-width: 250px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 800; color: #4f46e5; font-family: monospace;">${c.reference}</span>
            <span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${c.status}</span>
          </div>
          ${distanceBadge}
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">${c.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; line-height: 1.3;">${c.address || c.locality}</div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span style="font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${c.priority} Priority</span>
            ${c.budget ? `<span style="font-size: 10px; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-family: monospace;">₹${c.budget.toLocaleString()}</span>` : ''}
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
  }, [processedComplaints, selectedComplaintId, internalUserLoc]);

  // Center on user action
  const handleCenterOnUser = () => {
    if (internalUserLoc && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([internalUserLoc.lat, internalUserLoc.lng], 15, { duration: 1.2 });
    } else {
      detectUserLocation(true);
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Reset district view
  const handleResetBounds = () => {
    if (!mapInstanceRef.current) return;
    const leaflet = (L as any).default || L;
    const bounds = leaflet.latLngBounds([]);
    processedComplaints.forEach((c) => bounds.extend([c.computedLat, c.computedLng]));
    if (internalUserLoc) bounds.extend([internalUserLoc.lat, internalUserLoc.lng]);
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  };

  // If map fails, render fallback list
  if (mapError) {
    return (
      <div
        style={{ height }}
        className="w-full bg-slate-900 text-slate-100 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-slate-800"
      >
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white text-base">Civic Geographic Distribution</h3>
          </div>
          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded-full font-medium">
            {complaints.length} Reported Incidents
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-4 overflow-y-auto max-h-[360px] pr-2">
          {processedComplaints.map((c) => (
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
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group"
      style={{ height }}
    >
      {/* Leaflet map DOM container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* FLOATING TOP-RIGHT: BASEMAP LAYER TOGGLE CONTROL (CARTO Voyager, Positron, Dark, Satellite, Terrain) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg mr-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>CARTO API</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveLayer('street');
            onLayerStyleChange?.('street');
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeLayer === 'street'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="CARTO Voyager: Detailed street basemap with labels & landmarks"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Street</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLayer('positron');
            onLayerStyleChange?.('positron');
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeLayer === 'positron'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="CARTO Positron: Ultra-clean light civic cartography"
        >
          <span>☀️ Light</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLayer('dark');
            onLayerStyleChange?.('dark');
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeLayer === 'dark'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="CARTO Dark Matter: High-contrast dark basemap for night ops"
        >
          <span>🌙 Dark</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLayer('satellite');
            onLayerStyleChange?.('satellite');
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeLayer === 'satellite'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="High-Resolution Satellite & Aerial Photography"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLayer('terrain');
            onLayerStyleChange?.('terrain');
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeLayer === 'terrain'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Simple Topographic Contour & Terrain Shading"
        >
          <Mountain className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Terrain</span>
        </button>
      </div>

      {/* FLOATING TOP-LEFT: DENSITY HEATMAP OVERLAY TOGGLE & CONTROLS */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !activeHeatmap;
            setActiveHeatmap(next);
            onToggleHeatmap?.(next);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border ${
            activeHeatmap
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border-amber-600 shadow-rose-500/20'
              : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
          title="Toggle Issue Density Heatmap Overlay"
        >
          <Flame className={`w-4 h-4 ${activeHeatmap ? 'animate-pulse text-white' : 'text-amber-500'}`} />
          <span>Density Heatmap</span>
          <span
            className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-black tracking-wider ${
              activeHeatmap ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {activeHeatmap ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Heatmap intensity switcher if active */}
        {activeHeatmap && (
          <div className="flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 text-[11px] font-bold shadow-md">
            <span className="text-slate-400 px-2">Density:</span>
            {(['normal', 'high', 'ultra'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setHeatmapIntensity(level)}
                className={`px-2 py-1 rounded-lg capitalize cursor-pointer transition-all ${
                  heatmapIntensity === level
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING RIGHT SIDE: MAP NAVIGATION & MY LOCATION CONTROLS */}
      <div className="absolute top-16 right-3 z-30 flex flex-col gap-1.5">
        {/* User Geolocation Button */}
        <button
          type="button"
          onClick={handleCenterOnUser}
          disabled={locatingUser}
          className={`p-2.5 rounded-xl border shadow-md transition-all cursor-pointer flex items-center justify-center ${
            internalUserLoc
              ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700 shadow-blue-500/20'
              : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
          title={
            internalUserLoc
              ? `Center on your current location (${internalUserLoc.address || 'GPS detected'})`
              : 'Detect and fly to your current location'
          }
        >
          <Crosshair className={`w-4 h-4 ${locatingUser ? 'animate-spin text-blue-300' : ''}`} />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-md font-bold text-sm cursor-pointer flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-md font-bold text-sm cursor-pointer flex items-center justify-center"
          title="Zoom Out"
        >
          -
        </button>

        {/* Reset / Fit Bounds */}
        <button
          type="button"
          onClick={handleResetBounds}
          className="p-2.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-md cursor-pointer flex items-center justify-center"
          title="Fit All Reported Issues"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* FLOATING BOTTOM-LEFT: HEATMAP DENSITY & STATUS LEGEND */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2.5 max-w-[280px] shadow-lg">
        {/* User Location Indicator */}
        {internalUserLoc && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold truncate">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span className="truncate">Your Location: {internalUserLoc.address || 'Active'}</span>
            </div>
            <button
              type="button"
              onClick={handleCenterOnUser}
              className="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline shrink-0 cursor-pointer"
            >
              Center
            </button>
          </div>
        )}

        {/* Heatmap density color gradient bar */}
        {activeHeatmap && (
          <div className="space-y-1 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-500" />
                Issue Density Scale
              </span>
              <span>Cluster Volume</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 via-orange-500 to-rose-600 shadow-inner" />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
              <span>Low (Isolated)</span>
              <span>Moderate</span>
              <span className="text-rose-600">High Hotspot</span>
            </div>
          </div>
        )}

        {/* Status Pins Legend */}
        <div className="space-y-1">
          <div className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">
            Issue Status Pins ({processedComplaints.length})
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Resolved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
              <span>Submitted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
