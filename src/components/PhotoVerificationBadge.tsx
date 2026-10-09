import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PhotoVerificationMetadata } from '../types';

interface PhotoVerificationBadgeProps {
  imageUrl?: string;
  photoFingerprint?: string | null;
  photoMetadata?: PhotoVerificationMetadata | null;
  isFlaggedLocationMismatch?: boolean;
  locationMatchStatus?: 'VERIFIED' | 'FLAGGED_MISMATCH' | 'NO_PHOTO';
  photoDistanceMeters?: number | null;
  compact?: boolean;
}

export const PhotoVerificationBadge: React.FC<PhotoVerificationBadgeProps> = ({
  imageUrl,
  photoFingerprint,
  photoMetadata,
  isFlaggedLocationMismatch,
  locationMatchStatus,
  photoDistanceMeters,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  if (!imageUrl) return null;

  const isFlagged = Boolean(
    isFlaggedLocationMismatch ||
      locationMatchStatus === 'FLAGGED_MISMATCH' ||
      photoMetadata?.isFlagged
  );

  const distance =
    photoDistanceMeters !== null && photoDistanceMeters !== undefined
      ? photoDistanceMeters
      : photoMetadata?.distanceMeters ?? null;

  const fingerprint = photoFingerprint || photoMetadata?.fingerprint || null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fingerprint) {
      navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {isFlagged ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>⚠️ Location Discrepancy Flagged</span>
            {distance !== null && (
              <span className="font-mono text-[9px] text-rose-800">
                ({distance > 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`})
              </span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>✅ Live On-Site Photo Verified</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 text-xs transition-all ${
        isFlagged
          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-xs">
          {isFlagged ? (
            <>
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-rose-900 font-extrabold">
                Location Discrepancy Flagged (Photo vs Reported Site)
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-900 font-extrabold">
                In-App Live Photo Verified On-Site
              </span>
            </>
          )}
        </div>

        {fingerprint && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copy SHA-256 cryptographic fingerprint"
            className="flex items-center gap-1 px-2 py-0.5 bg-white/80 hover:bg-white rounded border border-slate-200/80 text-[10px] text-slate-700 font-mono transition-colors cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span>SHA-256</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-1.5 space-y-1 text-[11px]">
        {isFlagged ? (
          <p className="text-rose-800 leading-relaxed">
            Automated sensor comparison indicates this photo was captured{' '}
            <strong className="font-extrabold text-rose-950">
              {distance !== null
                ? distance > 1000
                  ? `${(distance / 1000).toFixed(1)} km`
                  : `${Math.round(distance)} meters`
                : 'significantly far'}
            </strong>{' '}
            from the reported address. Flagged for officer physical review.
          </p>
        ) : (
          <p className="text-emerald-800 leading-relaxed">
            Camera sensor coordinates correspond with the reported incident pin{' '}
            {distance !== null ? `(within ${Math.round(distance)}m)` : '(verified on-site)'}.
          </p>
        )}

        {fingerprint && (
          <div className="font-mono text-[10px] text-slate-500 pt-0.5 truncate">
            Fingerprint: <span className="text-slate-800">{fingerprint}</span>
          </div>
        )}
      </div>
    </div>
  );
};
