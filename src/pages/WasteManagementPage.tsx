import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Truck,
  Recycle,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  ChevronRight,
  X,
  PlusCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  HardHat,
  Leaf,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { WastePickup, WasteType, WastePickupStatus, WasteStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { detectRealLocation, reverseGeocodeCoordinates } from '../lib/geo';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const WASTE_CATEGORIES: {
  id: WasteType;
  title: string;
  desc: string;
  recommendedVehicle: string;
  iconName: string;
  badgeColor: string;
}[] = [
  {
    id: 'bulk_furniture',
    title: 'Bulky Household & Furniture',
    desc: 'Sofas, mattresses, wooden wardrobes, desks, large fixtures',
    recommendedVehicle: 'Hydraulic Flatbed Truck #07',
    iconName: 'Package',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'electronic_waste',
    title: 'Electronic E-Waste & Appliances',
    desc: 'Computers, TVs, refrigerators, batteries, printed circuit boards',
    recommendedVehicle: 'Secure Hazardous Transporter #02',
    iconName: 'Sparkles',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    id: 'construction_debris',
    title: 'Construction & Renovation Debris',
    desc: 'Concrete blocks, broken tiles, plaster, sanitary fittings, rubble',
    recommendedVehicle: 'Heavy Tipper Dump Truck #05',
    iconName: 'HardHat',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  {
    id: 'garden_green',
    title: 'Garden & Green Waste',
    desc: 'Tree cuttings, pruned branches, lawn turf, dry organic biomass',
    recommendedVehicle: 'Mulcher Tipper Van #12',
    iconName: 'Leaf',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    id: 'hazardous_chemical',
    title: 'Hazardous / Chemical / Paint',
    desc: 'Paint cans, thinners, chemical solvents, pesticide containers',
    recommendedVehicle: 'Hazardous Containment Truck #01',
    iconName: 'AlertCircle',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    id: 'recyclable_scrap',
    title: 'Dry Recyclable Scrap Bulk',
    desc: 'Cardboard bales, plastic crates, sheet glass, metal scrap',
    recommendedVehicle: 'EcoVan Compactor #04',
    iconName: 'Recycle',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
  },
];

const TIME_SLOTS = [
  { id: '08:00 AM - 11:00 AM', label: 'Morning Slot (08:00 AM - 11:00 AM)', tag: 'Fastest' },
  { id: '11:30 AM - 02:30 PM', label: 'Midday Slot (11:30 AM - 02:30 PM)', tag: 'Standard' },
  { id: '03:00 PM - 06:00 PM', label: 'Afternoon Slot (03:00 PM - 06:00 PM)', tag: 'Popular' },
];

const WEIGHT_OPTIONS = [
  { id: 'Light (< 15 kg)', label: 'Light (< 15 kg)', desc: 'Small boxes, single appliance or 2-3 bags' },
  { id: 'Medium (15 - 50 kg)', label: 'Medium (15 - 50 kg)', desc: 'Wardrobe, couch, or moderate renovation rubble' },
  { id: 'Heavy / Full Load (> 50 kg)', label: 'Heavy / Truckload (> 50 kg)', desc: 'Multi-room clearing or bulky industrial demolition' },
];

export const WasteManagementPage: React.FC<Props> = ({ onNavigateTab }) => {
  const { currentUser, isOfficial, isDistrictAdmin, isMunicipalityAdmin } = useAuth();
  const isAdminOrOfficial = Boolean(isOfficial || isDistrictAdmin || isMunicipalityAdmin);

  const [activeTab, setActiveTab] = useState<'book' | 'my-pickups' | 'stats'>('book');
  const [pickups, setPickups] = useState<WastePickup[]>([]);
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Booking Form State
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedCategory, setSelectedCategory] = useState<WasteType>('bulk_furniture');
  const [selectedWeight, setSelectedWeight] = useState('Medium (15 - 50 kg)');
  const [pickupDate, setPickupDate] = useState(tomorrow);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0].id);
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('Central Ward');
  const [pincode, setPincode] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [locating, setLocating] = useState(false);

  // Selected pickup for dispatch modal (for officials)
  const [selectedPickup, setSelectedPickup] = useState<WastePickup | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<WastePickupStatus>('Scheduled');
  const [dispatchCrew, setDispatchCrew] = useState('');
  const [dispatchVehicle, setDispatchVehicle] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pickupsRes, statsRes] = await Promise.all([
        api.getWastePickups({
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.getWasteStats().catch(() => ({ success: false, stats: null as any })),
      ]);

      if (pickupsRes && pickupsRes.pickups) {
        setPickups(pickupsRes.pickups);
      }
      if (statsRes && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to load waste pickups', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, searchQuery]);

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleDetectGPS = async () => {
    setLocating(true);
    try {
      const loc = await detectRealLocation();
      const geo = await reverseGeocodeCoordinates(loc.latitude, loc.longitude);
      setAddress(geo.address);
      if (geo.locality) setLocality(geo.locality);
      setToastMessage({ text: 'GPS Location detected and populated!', success: true });
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage({ text: 'Could not access GPS. Please enter street address manually.', success: false });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setToastMessage({ text: 'Please sign in to schedule waste collection.', success: false });
      return;
    }

    if (!address.trim()) {
      setToastMessage({ text: 'Please enter the pickup street address.', success: false });
      return;
    }

    if (!pickupDate) {
      setToastMessage({ text: 'Please select a preferred pickup date.', success: false });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.bookWastePickup({
        wasteType: selectedCategory,
        estimatedWeight: selectedWeight,
        pickupDate,
        timeSlot,
        address: address.trim(),
        locality: locality.trim(),
        pincode: pincode.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });

      if (res && res.pickup) {
        setToastMessage({
          text: `Success! Booking ${res.pickup.reference} confirmed. Crew will arrive on ${pickupDate}.`,
          success: true,
        });
        setTimeout(() => setToastMessage(null), 4500);

        // Reset form fields
        setSpecialInstructions('');
        // Switch to list view to see booking immediately
        setActiveTab('my-pickups');
        loadData();
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to schedule waste collection.', success: false });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled pickup?')) return;
    try {
      const res = await api.cancelWastePickup(id);
      if (res.success) {
        setToastMessage({ text: 'Pickup booking cancelled.', success: true });
        setTimeout(() => setToastMessage(null), 3000);
        loadData();
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Could not cancel booking.', success: false });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedPickup) return;
    setUpdatingStatus(true);
    try {
      const res = await api.updateWastePickupStatus(selectedPickup.id, {
        status: dispatchStatus,
        assignedCrew: dispatchCrew.trim() || undefined,
        assignedVehicle: dispatchVehicle.trim() || undefined,
        notes: dispatchNotes.trim() || undefined,
      });

      if (res && res.pickup) {
        setToastMessage({
          text: `Booking ${res.pickup.reference} updated to ${dispatchStatus}.`,
          success: true,
        });
        setTimeout(() => setToastMessage(null), 3000);
        setSelectedPickup(null);
        loadData();
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to update pickup status', success: false });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: WastePickupStatus) => {
    switch (status) {
      case 'Requested':
        return {
          label: 'Request Logged',
          color: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'Scheduled':
        return {
          label: 'Crew Scheduled',
          color: 'bg-indigo-50 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500',
        };
      case 'Dispatched':
        return {
          label: 'Vehicle En Route',
          color: 'bg-blue-50 text-blue-800 border-blue-300',
          dot: 'bg-blue-500 animate-pulse',
        };
      case 'Completed':
        return {
          label: 'Collected & Recycled',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'Cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-slate-100 text-slate-600 border-slate-300',
          dot: 'bg-slate-400',
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const currentCategoryObj = WASTE_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto space-y-7 pb-16 animate-in fade-in duration-200">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md transition-all ${
            toastMessage.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-bold tracking-wide uppercase">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>Municipal Sanitation &amp; Doorstep Pickups</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              On-Demand Waste Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Book a municipal sanitation crew and heavy transport vehicle to collect bulky furniture,
              construction rubble, electronic waste, or green garden cuttings directly from your residence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('book')}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                activeTab === 'book'
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Schedule Pickup</span>
            </button>

            <button
              onClick={() => setActiveTab('my-pickups')}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'my-pickups'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>
                {isAdminOrOfficial ? 'All Collection Orders' : 'My Bookings & Live Track'}
              </span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Live Eco & Collection Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Pickups</span>
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.totalBookings ?? pickups.length}
          </div>
          <div className="text-[11px] text-slate-500">Registered collection orders</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Active Dispatches</span>
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600">
            {stats?.dispatched ?? pickups.filter((p) => p.status === 'Dispatched' || p.status === 'Scheduled').length}
          </div>
          <div className="text-[11px] text-slate-500">Sanitation crews on route</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed Pickups</span>
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            {stats?.completed ?? pickups.filter((p) => p.status === 'Completed').length}
          </div>
          <div className="text-[11px] text-slate-500">Safely cleared &amp; processed</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-teal-600" />
            <span>Landfill Diverted</span>
          </span>
          <div className="text-2xl sm:text-3xl font-black text-teal-700">
            {stats?.ecoDivertedKg ?? 0} kg
          </div>
          <div className="text-[11px] text-slate-500">Sent to certified recycling</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('book')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'book'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book Doorstep Collection</span>
        </button>

        <button
          onClick={() => setActiveTab('my-pickups')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'my-pickups'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Track Bookings ({pickups.length})</span>
        </button>
      </div>

      {/* VIEW 1: BOOKING WIZARD */}
      {activeTab === 'book' && (
        <form onSubmit={handleSubmitBooking} className="space-y-6">
          {/* Step 1: Waste Type Selector */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Step 1 of 4
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Select Waste Material Category
              </h2>
              <p className="text-xs text-slate-500">
                Choose the primary category so the municipal depot dispatches the appropriate collection vehicle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {WASTE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative space-y-2.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                        {cat.id === 'bulk_furniture' && <Package className="w-5 h-5 text-amber-600" />}
                        {cat.id === 'electronic_waste' && <Sparkles className="w-5 h-5 text-indigo-600" />}
                        {cat.id === 'construction_debris' && <HardHat className="w-5 h-5 text-orange-600" />}
                        {cat.id === 'garden_green' && <Leaf className="w-5 h-5 text-emerald-600" />}
                        {cat.id === 'hazardous_chemical' && <AlertCircle className="w-5 h-5 text-rose-600" />}
                        {cat.id === 'recyclable_scrap' && <Recycle className="w-5 h-5 text-teal-600" />}
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{cat.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{cat.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100/90 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <Truck className="w-3 h-3 text-slate-400" />
                      <span className="truncate">Vehicle: {cat.recommendedVehicle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Weight & Quantity Estimator */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Step 2 of 4
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Estimated Volume &amp; Load Size
              </h2>
              <p className="text-xs text-slate-500">
                Helps allocate adequate labor loaders and vehicular payload capacity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {WEIGHT_OPTIONS.map((opt) => {
                const isSelected = selectedWeight === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedWeight(opt.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Date & Preferred Time Slot */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Step 3 of 4
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Preferred Date &amp; Time Slot
              </h2>
              <p className="text-xs text-slate-500">
                Select your preferred collection window. Sanitation crews operate 7 days a week.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Pickup Date</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Time Window Slot</span>
                </label>
                <div className="space-y-2">
                  {TIME_SLOTS.map((slot) => (
                    <label
                      key={slot.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        timeSlot === slot.id
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="timeSlot"
                          checked={timeSlot === slot.id}
                          onChange={() => setTimeSlot(slot.id)}
                          className="accent-indigo-600"
                        />
                        <span>{slot.label}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                        {slot.tag}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Pickup Address & Instructions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Step 4 of 4
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Collection Location &amp; Contact Details
              </h2>
              <p className="text-xs text-slate-500">
                Specify exactly where the waste will be stationed for vehicle access.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Doorstep / Street Address</span>
                </label>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={locating}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{locating ? 'Detecting GPS...' : 'Use Current GPS Pin'}</span>
                </button>
              </div>

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., #42 5th Cross, 2nd Main, Indiranagar, near water tank"
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Locality / Ward</label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="e.g., Central Ward, Ward 7"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Postal PIN Code</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g., 560038"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Contact Mobile Number</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g., +91 98451 23456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">
                  Special Instructions for Crew (Optional)
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g., Placed by main gate, heavy lifting required, narrow alleyway access"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Submission Action Bar */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Municipal Sanitation Guarantee
                </div>
                <div className="text-[11px] text-slate-500">
                  Vehicle arrives with certified crew. 100% processed through authorized recycling facilities.
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              <span>{submitting ? 'Confirming with Municipal Depot...' : 'Schedule Waste Collection'}</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW 2: TRACK BOOKINGS & STATUS TIMELINE */}
      {activeTab === 'my-pickups' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search bookings by Reference ID (e.g. WM-2026-...), address, or locality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Requested">Requested (Pending Dispatch)</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Dispatched">Dispatched (En Route)</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <button
                  onClick={loadData}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bookings Stream */}
          {loading ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading municipal collection orders...</p>
            </div>
          ) : pickups.length === 0 ? (
            <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <Truck className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">No Waste Pickups Found</h3>
                <p className="text-xs text-slate-500">
                  {searchQuery || filterStatus !== 'all'
                    ? 'No collection bookings match your search query or filter.'
                    : 'You have no scheduled waste pickups. Need bulky items or debris collected?'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('book')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Book Your First Collection
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pickups.map((item) => {
                const statusBadge = getStatusBadge(item.status);
                const categoryObj = WASTE_CATEGORIES.find((c) => c.id === item.wasteType);

                // Determine stepper progress (1: Requested, 2: Scheduled, 3: Dispatched, 4: Completed)
                const stepIndex =
                  item.status === 'Requested'
                    ? 1
                    : item.status === 'Scheduled'
                    ? 2
                    : item.status === 'Dispatched'
                    ? 3
                    : item.status === 'Completed'
                    ? 4
                    : 0;

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-5 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    {/* Header: Reference, Badge, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-2xs shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-slate-900">
                              {item.reference}
                            </span>
                            <button
                              onClick={() => handleCopy(item.reference)}
                              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              title="Copy Reference"
                            >
                              {copiedRef === item.reference ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Booked by <strong className="text-slate-700">{item.userName}</strong> on{' '}
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${statusBadge.color}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                          <span>{statusBadge.label}</span>
                        </span>

                        {isAdminOrOfficial && (
                          <button
                            onClick={() => {
                              setSelectedPickup(item);
                              setDispatchStatus(item.status);
                              setDispatchCrew(item.assignedCrew || '');
                              setDispatchVehicle(item.assignedVehicle || '');
                              setDispatchNotes(item.notes || '');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Manage Dispatch
                          </button>
                        )}

                        {item.status !== 'Completed' && item.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancelBooking(item.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Stepper Line */}
                    {item.status !== 'Cancelled' && (
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Doorstep Collection Progress
                        </div>

                        <div className="grid grid-cols-4 gap-2 relative">
                          {[
                            { step: 1, title: 'Request Placed', desc: 'Registered in depot' },
                            { step: 2, title: 'Crew Scheduled', desc: 'Vehicle allocated' },
                            { step: 3, title: 'En Route', desc: 'Crew dispatched' },
                            { step: 4, title: 'Collected', desc: 'Recycled & closed' },
                          ].map((s) => {
                            const isPassed = stepIndex >= s.step;
                            const isCurrent = stepIndex === s.step;

                            return (
                              <div key={s.step} className="space-y-1 text-center sm:text-left">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto sm:mx-0 ${
                                      isPassed
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-slate-200 text-slate-500'
                                    }`}
                                  >
                                    {isPassed ? <Check className="w-3.5 h-3.5" /> : s.step}
                                  </div>
                                  <span
                                    className={`hidden sm:inline text-xs font-bold ${
                                      isCurrent
                                        ? 'text-emerald-700'
                                        : isPassed
                                        ? 'text-slate-800'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {s.title}
                                  </span>
                                </div>
                                <div className="hidden sm:block text-[10px] text-slate-400 pl-7">
                                  {s.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pickup Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Material Type
                        </span>
                        <div className="font-bold text-slate-900">
                          {categoryObj?.title || item.wasteType}
                        </div>
                        <div className="text-[11px] text-slate-500">{item.estimatedWeight}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pickup Slot
                        </span>
                        <div className="font-bold text-slate-900">{item.pickupDate}</div>
                        <div className="text-[11px] text-slate-500">{item.timeSlot}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Assigned Transport
                        </span>
                        <div className="font-bold text-indigo-700 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          <span>{item.assignedVehicle || 'Standard Municipal Tipper'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.assignedCrew || 'Sanitation Team 3'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pickup Location
                        </span>
                        <div className="font-bold text-slate-900 truncate" title={item.address}>
                          {item.address}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.locality} {item.pincode ? `• ${item.pincode}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Special Instructions Callout */}
                    {item.specialInstructions && (
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          <strong>Instructions for Crew:</strong> {item.specialInstructions}
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DISPATCH MANAGEMENT MODAL (FOR OFFICIALS) */}
      {selectedPickup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Update Collection Order: {selectedPickup.reference}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign sanitation crew, vehicle, or update live collection status.
                </p>
              </div>
              <button
                onClick={() => setSelectedPickup(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Collection Status</label>
                <select
                  value={dispatchStatus}
                  onChange={(e) => setDispatchStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="Requested">Requested (Pending Confirmation)</option>
                  <option value="Scheduled">Scheduled (Crew &amp; Slot Locked)</option>
                  <option value="Dispatched">Dispatched (Vehicle En Route)</option>
                  <option value="Completed">Completed (Waste Collected &amp; Cleared)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Assigned Sanitation Crew</label>
                <input
                  type="text"
                  value={dispatchCrew}
                  onChange={(e) => setDispatchCrew(e.target.value)}
                  placeholder="e.g., Heavy Salvage Moving Squad 4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Assigned Transport Vehicle</label>
                <input
                  type="text"
                  value={dispatchVehicle}
                  onChange={(e) => setDispatchVehicle(e.target.value)}
                  placeholder="e.g., Hydraulic Flatbed Truck #07"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Depot Field Notes</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g., Arrived at 09:30 AM, loaded 45kg sofa, transported to recyclers."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPickup(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {updatingStatus ? 'Updating Order...' : 'Save & Notify Citizen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
