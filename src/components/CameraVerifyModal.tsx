import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  FlaskConical,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  EscapePuzzleItem,
  GeminiVerificationResult,
  InventoryObjectItem,
  VerificationVerdict,
} from '../types/scene';
import {
  simulateVerificationResult,
  verifyObjectWithGemini,
} from '../utils/geminiVerification';

interface CameraVerifyModalProps {
  isOpen: boolean;
  puzzle: EscapePuzzleItem | null;
  puzzleIndex: number;
  expectedObject: InventoryObjectItem | undefined;
  isDevMode: boolean;
  onBackToClue: () => void;
  onClose: () => void;
  onVerifiedSuccess: (puzzleId: string, explanation?: string) => void;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export const CameraVerifyModal: React.FC<CameraVerifyModalProps> = ({
  isOpen,
  puzzle,
  puzzleIndex,
  expectedObject,
  isDevMode,
  onBackToClue,
  onClose,
  onVerifiedSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<GeminiVerificationResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startWebcam = async () => {
    setCameraError(null);
    stopWebcam();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Webcam access is not supported in this browser context. You can upload a photo of the real-world object below.'
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setCameraError(
        err?.message ||
          'Could not access webcam. Please allow camera permission or capture/upload a photo below.'
      );
    }
  };

  useEffect(() => {
    if (isOpen && puzzle) {
      setCapturedImage(null);
      setVerificationResult(null);
      setRequestError(null);
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [isOpen, puzzle?.id]);

  if (!isOpen || !puzzle) return null;

  const roman = ROMAN_NUMERALS[puzzleIndex] || String(puzzleIndex + 1);

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    setVerificationResult(null);
    setRequestError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
        setVerificationResult(null);
        setRequestError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVerificationResult(null);
    setRequestError(null);
    if (!isCameraActive) {
      startWebcam();
    }
  };

  const handleVerifyWithGemini = async () => {
    if (!capturedImage) return;
    if (!expectedObject) {
      setRequestError(
        `Inventory configuration error: target ID "${puzzle.target}" was not found in inventory.json.`
      );
      return;
    }

    setIsVerifying(true);
    setRequestError(null);
    setVerificationResult(null);

    try {
      const result = await verifyObjectWithGemini({
        puzzle,
        expectedObject,
        imageBase64: capturedImage,
        mimeType: 'image/jpeg',
      });
      setVerificationResult(result);

      if (result.verdict === 'match') {
        onVerifiedSuccess(puzzle.id, result.explanation);
      }
    } catch (err: any) {
      setRequestError(err?.message || 'Verification request failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Developer-Only Test Mode Simulator (Requirement 9)
  const handleDevSimulate = (verdict: VerificationVerdict) => {
    setRequestError(null);
    const simResult = simulateVerificationResult(verdict, expectedObject);
    setVerificationResult(simResult);
    if (verdict === 'match') {
      onVerifiedSuccess(puzzle.id, simResult.explanation);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg">
      <div className="relative w-full max-w-xl bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <button
            onClick={onBackToClue}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Riddle {roman} Clue</span>
          </button>

          <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
            Spectral Lens Verification
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Contextual Prompt + Brief Clue Reminder (Never exposes expected target or reward digit) */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              Show the object to the camera
            </div>
            <div className="text-xs text-amber-100/90 italic font-serif">
              “{puzzle.clue}”
            </div>
          </div>

          {/* Webcam Live Preview / Captured Photo Frame */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured real-world object"
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    isCameraActive ? 'block' : 'hidden'
                  }`}
                />
                {!isCameraActive && (
                  <div className="p-6 text-center space-y-3 max-w-md">
                    <Camera className="w-10 h-10 text-amber-400/70 mx-auto" />
                    <p className="text-xs text-slate-300">
                      {cameraError ||
                        'Initializing webcam... Hold the real-world object corresponding to the riddle in front of your camera.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={startWebcam}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
                      >
                        Retry Webcam
                      </button>
                      <label className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-medium cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Subtle Viewfinder Reticle Overlay */}
            <div className="pointer-events-none absolute inset-4 border border-amber-400/25 rounded-lg" />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Capture / Verify Controls */}
          {!capturedImage ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / Camera Snapshot</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleCaptureFrame}
                disabled={!isCameraActive}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Object Photo</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleRetake}
                disabled={isVerifying}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>

              {verificationResult?.verdict !== 'match' && (
                <button
                  onClick={handleVerifyWithGemini}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing with Gemini Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Verify Captured Object</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error Banner */}
          {requestError && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>{requestError}</div>
            </div>
          )}

          {/* Structured Gemini Verification Result (`match` | `no_match` | `uncertain`) */}
          {verificationResult && (
            <div
              className={`p-4 rounded-xl border ${
                verificationResult.verdict === 'match'
                  ? 'bg-emerald-950/75 border-emerald-400/60 text-emerald-100'
                  : verificationResult.verdict === 'uncertain'
                  ? 'bg-amber-950/75 border-amber-400/60 text-amber-100'
                  : 'bg-rose-950/75 border-rose-500/60 text-rose-100'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
                    {verificationResult.verdict === 'match' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Verdict: MATCH — Artifact Confirmed!</span>
                      </>
                    ) : verificationResult.verdict === 'uncertain' ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300">
                          Verdict: UNCERTAIN — Ambiguous Image
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-300">
                          Verdict: NO MATCH — Incorrect Artifact
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed opacity-95">
                    {verificationResult.explanation}
                  </p>

                  {verificationResult.verdict !== 'match' && (
                    <div className="pt-1">
                      <button
                        onClick={handleRetake}
                        className="text-xs font-semibold underline hover:opacity-80"
                      >
                        Try capturing a clearer photo
                      </button>
                    </div>
                  )}
                </div>

                {/* Only reveal the reward digit when verdict === 'match'! */}
                {verificationResult.verdict === 'match' && (
                  <div className="shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-emerald-500/30 border border-emerald-300">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-200">
                      Digit Unlocked
                    </span>
                    <span className="text-2xl font-mono font-bold text-white">
                      {puzzle.reward_digit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Developer-Only Test Mode Controls (Requirement 9 — Hidden in normal player mode) */}
          {isDevMode && (
            <div className="pt-3 border-t border-purple-500/30 bg-purple-950/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-purple-200">
                <span className="flex items-center gap-1.5 font-semibold">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                  Developer Verification Simulator (Bypasses Gemini API)
                </span>
                <span>Target: {puzzle.target}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDevSimulate('match')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold"
                >
                  Simulate Match
                </button>
                <button
                  onClick={() => handleDevSimulate('no_match')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-semibold"
                >
                  Simulate No Match
                </button>
                <button
                  onClick={() => handleDevSimulate('uncertain')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-semibold"
                >
                  Simulate Uncertain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
