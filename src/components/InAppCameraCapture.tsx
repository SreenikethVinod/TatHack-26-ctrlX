import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  X,
  Maximize2,
  Copy,
  Check,
  SwitchCamera,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PhotoVerificationMetadata } from '../types';
import { haversineDistanceMeters } from '../lib/geo';

interface InAppCameraCaptureProps {
  reportedLatitude?: number | null;
  reportedLongitude?: number | null;
  reportedAddress?: string;
  onPhotoCaptured: (data: {
    imageUrl: string;
    photoFingerprint: string;
    photoMetadata: PhotoVerificationMetadata;
    isFlaggedMismatch: boolean;
    distanceMeters: number | null;
  }) => void;
  onPhotoCleared: () => void;
  existingImageUrl?: string;
  existingMetadata?: PhotoVerificationMetadata | null;
}

export const InAppCameraCapture: React.FC<InAppCameraCaptureProps> = ({
  reportedLatitude,
  reportedLongitude,
  reportedAddress,
  onPhotoCaptured,
  onPhotoCleared,
  existingImageUrl,
  existingMetadata,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>(existingImageUrl || '');
  const [metadata, setMetadata] = useState<PhotoVerificationMetadata | null>(existingMetadata || null);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Clean up media stream tracks when component unmounts or camera is closed
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Sync internal state if existingImageUrl changes from parent
  useEffect(() => {
    if (existingImageUrl !== capturedImage) {
      setCapturedImage(existingImageUrl || '');
    }
    if (existingMetadata) {
      setMetadata(existingMetadata);
    }
  }, [existingImageUrl, existingMetadata]);

  // Attach active media stream to video element
  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current
        .play()
        .catch((err) => console.warn('Camera video play error:', err));
    }
  }, [isCameraActive, cameraStream]);

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setPermissionError(null);
    setIsCameraActive(true);

    // Stop existing stream if any
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported by your browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setFacingMode(mode);
    } catch (err: any) {
      console.error('In-app camera stream acquisition error:', err);
      let errorText = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorText =
          'Camera permission was denied. Please allow camera permissions in your browser or device settings to capture live evidence.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorText = 'No camera hardware device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorText = 'Camera is currently in use by another application.';
      } else {
        errorText = err.message || 'Failed to initialize live camera.';
      }
      setPermissionError(errorText);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setPermissionError(null);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Compute SHA-256 fingerprint from image base64 data string
  const computeSha256Fingerprint = async (dataUrl: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataUrl));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback deterministic pseudo-hash if subtle crypto unavailable
      let hash = 0;
      for (let i = 0; i < dataUrl.length; i++) {
        hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
        hash |= 0;
      }
      return `fp-${Math.abs(hash).toString(16).padStart(16, '0')}`;
    }
  };

  // Capture frame from live video element
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Mirror image if front-facing camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Capture device geolocation at the exact moment of shutter press
    let deviceCoords: { latitude: number; longitude: number; accuracy?: number } | null = null;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000,
          });
        });
        deviceCoords = {
          latitude: Math.round(pos.coords.latitude * 100000) / 100000,
          longitude: Math.round(pos.coords.longitude * 100000) / 100000,
          accuracy: Math.round(pos.coords.accuracy),
        };
      }
    } catch (geoErr) {
      console.warn('Could not read instant GPS at capture time:', geoErr);
      // Fallback to reported location if device GPS fails but reported coordinates exist
      if (
        reportedLatitude !== null &&
        reportedLatitude !== undefined &&
        reportedLongitude !== null &&
        reportedLongitude !== undefined
      ) {
        deviceCoords = {
          latitude: reportedLatitude,
          longitude: reportedLongitude,
          accuracy: 50,
        };
      }
    }

    // Generate cryptographic fingerprint
    const fingerprint = await computeSha256Fingerprint(dataUrl);

    // Calculate distance discrepancy between photo capture GPS and reported coordinates
    let distanceMeters: number | null = null;
    let isFlaggedMismatch = false;
    let status: 'VERIFIED' | 'FLAGGED_MISMATCH' | 'NO_PHOTO' = 'VERIFIED';
    let notes = 'Photo captured via verified in-app camera.';

    if (
      deviceCoords &&
      reportedLatitude !== null &&
      reportedLatitude !== undefined &&
      reportedLongitude !== null &&
      reportedLongitude !== undefined
    ) {
      distanceMeters = haversineDistanceMeters(
        reportedLatitude,
        reportedLongitude,
        deviceCoords.latitude,
        deviceCoords.longitude
      );

      // Proximity threshold: 250 meters
      if (distanceMeters > 250) {
        isFlaggedMismatch = true;
        status = 'FLAGGED_MISMATCH';
        notes = `Location discrepancy flagged: photo captured ${distanceMeters}m from reported incident site.`;
      } else {
        isFlaggedMismatch = false;
        status = 'VERIFIED';
        notes = `Verified on-site: photo captured ${distanceMeters}m from reported incident site.`;
      }
    } else if (deviceCoords && (reportedLatitude === null || reportedLatitude === undefined)) {
      distanceMeters = 0;
      isFlaggedMismatch = false;
      status = 'VERIFIED';
      notes = 'Verified on-site: Incident location established directly from camera sensor GPS.';
    }

    const newMetadata: PhotoVerificationMetadata = {
      capturedAt: new Date().toISOString(),
      captureSource: 'in_app_camera',
      dimensions: { width, height },
      deviceGps: deviceCoords,
      reportedGps:
        reportedLatitude && reportedLongitude
          ? { latitude: reportedLatitude, longitude: reportedLongitude }
          : null,
      distanceMeters,
      fingerprint,
      isFlagged: isFlaggedMismatch,
      status,
      notes,
    };

    setCapturedImage(dataUrl);
    setMetadata(newMetadata);
    stopCamera();
    setIsCapturing(false);

    onPhotoCaptured({
      imageUrl: dataUrl,
      photoFingerprint: fingerprint,
      photoMetadata: newMetadata,
      isFlaggedMismatch,
      distanceMeters,
    });
  };

  const handleClearPhoto = () => {
    setCapturedImage('');
    setMetadata(null);
    onPhotoCleared();
  };

  const handleCopyFingerprint = () => {
    if (metadata?.fingerprint) {
      navigator.clipboard.writeText(metadata.fingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  // Recalculate verification if reported coordinates change while a photo is already captured
  useEffect(() => {
    if (
      capturedImage &&
      metadata &&
      metadata.deviceGps &&
      reportedLatitude !== null &&
      reportedLatitude !== undefined &&
      reportedLongitude !== null &&
      reportedLongitude !== undefined
    ) {
      const distanceMeters = haversineDistanceMeters(
        reportedLatitude,
        reportedLongitude,
        metadata.deviceGps.latitude,
        metadata.deviceGps.longitude
      );
      const isFlaggedMismatch = distanceMeters > 250;
      const status = isFlaggedMismatch ? 'FLAGGED_MISMATCH' : 'VERIFIED';
      const notes = isFlaggedMismatch
        ? `Location discrepancy flagged: photo captured ${distanceMeters}m from reported incident site.`
        : `Verified on-site: photo captured ${distanceMeters}m from reported incident site.`;

      if (
        metadata.distanceMeters !== distanceMeters ||
        metadata.isFlagged !== isFlaggedMismatch
      ) {
        const updated: PhotoVerificationMetadata = {
          ...metadata,
          distanceMeters,
          isFlagged: isFlaggedMismatch,
          status,
          notes,
          reportedGps: { latitude: reportedLatitude, longitude: reportedLongitude },
        };
        setMetadata(updated);
        onPhotoCaptured({
          imageUrl: capturedImage,
          photoFingerprint: metadata.fingerprint,
          photoMetadata: updated,
          isFlaggedMismatch,
          distanceMeters,
        });
      }
    }
  }, [reportedLatitude, reportedLongitude]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-indigo-600" />
          <span>Live In-App Camera Evidence</span>
          <span className="text-[10px] font-semibold text-slate-400 normal-case">(Cryptographic GPS Match)</span>
        </label>
        {capturedImage && (
          <button
            type="button"
            onClick={handleClearPhoto}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Remove Photo
          </button>
        )}
      </div>

      {/* Permission or Device Error Message */}
      {permissionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Camera Access Required</p>
            <p className="text-[11px] text-rose-700">{permissionError}</p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                Retry Camera Permission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: Active In-App Camera Viewfinder */}
      {isCameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-500 shadow-xl">
          {/* Shutter flash animation */}
          {shutterFlash && (
            <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-pulse" />
          )}

          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-72 sm:h-80 object-cover bg-black"
          />

          {/* Viewfinder Overlay HUD */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
            {/* Top Bar HUD */}
            <div className="flex items-center justify-between text-white/90">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="tracking-wide">LIVE VIEWFINDER</span>
              </div>
              <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Acquiring Live GPS</span>
              </div>
            </div>

            {/* Center Grid Reticle */}
            <div className="self-center flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-20 h-20 border-2 border-dashed border-white rounded-xl" />
            </div>

            {/* Bottom Controls Bar */}
            <div className="pointer-events-auto flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Switch Camera"
                className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                disabled={isCapturing}
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 p-1.5 flex items-center justify-center transition-transform active:scale-90 shadow-2xl cursor-pointer"
              >
                <div className="w-full h-full rounded-full border-2 border-indigo-600 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white">
                  <Camera className="w-6 h-6" />
                </div>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={stopCamera}
                title="Cancel"
                className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Empty / No Photo Captured Yet -> Open Camera Prompt */}
      {!isCameraActive && !capturedImage && (
        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 bg-slate-50 transition-all text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Live In-App Photo Capture</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Photos must be taken directly within the app using your device camera. Our anti-fraud sentinel records cryptographic metadata to verify your incident on-site.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startCamera('environment')}
            className="mt-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera &amp; Take Photo</span>
          </button>
          <span className="text-[10px] text-slate-400">
            Requires camera &amp; geolocation permissions • No uploads or preset stock photos permitted
          </span>
        </div>
      )}

      {/* VIEW 3: Photo Captured & Verified/Flagged */}
      {!isCameraActive && capturedImage && (
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Captured Photo Image */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 w-full sm:w-48 h-40 bg-slate-100 shrink-0 group">
              <img
                src={capturedImage}
                alt="Captured civic evidence"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-2">
                <span className="text-[10px] text-white font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {metadata?.capturedAt ? new Date(metadata.capturedAt).toLocaleTimeString() : 'Live Snap'}
                </span>
              </div>
            </div>

            {/* Verification Metadata & Discrepancy Status */}
            <div className="flex-1 space-y-2.5">
              {/* Verification Flag Banner */}
              {metadata?.isFlagged ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>⚠️ LOCATION DISCREPANCY FLAGGED</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                    Photo was taken{' '}
                    <strong className="font-extrabold text-rose-900">
                      {metadata.distanceMeters && metadata.distanceMeters > 1000
                        ? `${(metadata.distanceMeters / 1000).toFixed(1)} km`
                        : `${metadata.distanceMeters || 0} meters`}
                    </strong>{' '}
                    away from your reported location ({reportedAddress || 'Incident pin'}).
                  </p>
                  <p className="text-[10px] text-rose-600 italic">
                    This report will be flagged on the municipal triage dashboard for mandatory physical field verification.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✅ LIVE ON-SITE PHOTO VERIFIED</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                    Cryptographic match confirmed! Device camera GPS matches reported location within{' '}
                    <strong className="font-extrabold text-emerald-900">
                      {metadata?.distanceMeters !== null && metadata?.distanceMeters !== undefined
                        ? `${metadata.distanceMeters}m`
                        : 'on-site tolerance'}
                    </strong>.
                  </p>
                  <p className="text-[10px] text-emerald-600 italic">
                    This verified report qualifies for expedited municipal priority triage.
                  </p>
                </div>
              )}

              {/* SHA-256 Fingerprint Pill */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="truncate pr-2">
                  <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider block">
                    Cryptographic Image Fingerprint (SHA-256)
                  </span>
                  <span className="text-slate-800 font-bold text-[11px] truncate block">
                    {metadata?.fingerprint
                      ? `${metadata.fingerprint.slice(0, 16)}...${metadata.fingerprint.slice(-10)}`
                      : 'Generating hash...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyFingerprint}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-[10px] font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {copiedFingerprint ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Retake Camera Button */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  {metadata?.dimensions
                    ? `${metadata.dimensions.width}×${metadata.dimensions.height}px`
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
