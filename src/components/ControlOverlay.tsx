import React, { useState } from 'react';
import { CameraViewMode, SceneObject } from '../types/scene';
import {
  User,
  Eye,
  Box,
  Layers,
  RotateCcw,
  Volume2,
  VolumeX,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Info,
  Flashlight,
  Sparkles,
  Ruler,
  ArrowUpDown,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ControlOverlayProps {
  viewMode: CameraViewMode;
  onSetViewMode: (mode: CameraViewMode) => void;
  onResetCamera: () => void;
  onOpenUpload: () => void;
  onOpenPhotoCompare: () => void;
  hasOriginalPhoto: boolean;
  selectedObject: SceneObject | null;
  roomTitle: string;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  objectsCount: number;
  isFlashlightOn: boolean;
  onToggleFlashlight: () => void;
  onUpdateCeilingHeight: (newHeight: number) => void;
  onUpdateRoomScale: (multiplier: number) => void;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  viewMode,
  onSetViewMode,
  onResetCamera,
  onOpenUpload,
  onOpenPhotoCompare,
  hasOriginalPhoto,
  selectedObject,
  roomTitle,
  roomWidth,
  roomLength,
  roomHeight,
  objectsCount,
  isFlashlightOn,
  onToggleFlashlight,
  onUpdateCeilingHeight,
  onUpdateRoomScale,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMuted, setIsMuted] = useState(!soundManager.enabled);
  const [showDimensionAdjuster, setShowDimensionAdjuster] = useState(false);

  const toggleAudio = () => {
    soundManager.enabled = !soundManager.enabled;
    setIsMuted(!soundManager.enabled);
    if (soundManager.enabled) {
      soundManager.playClick();
      soundManager.startAmbience();
    } else {
      soundManager.stopAmbience();
    }
  };

  const viewModes: { id: CameraViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'third_person', label: '3rd Person', icon: <User className="w-4 h-4" /> },
    { id: 'first_person', label: '1st Person', icon: <Eye className="w-4 h-4" /> },
    { id: 'dollhouse', label: 'Dollhouse', icon: <Box className="w-4 h-4" /> },
    { id: 'top_down', label: 'Top Down', icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Top Left Room Title & Quick Audio/Flashlight Pill */}
      <div className="absolute top-4 left-4 z-20 select-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#F59E0B]" />
          <div>
            <h1 className="text-xs font-bold text-slate-100">
              {roomTitle || 'Haunted 3D Escape Room'}
            </h1>
            <div className="text-[10px] text-slate-400 font-mono">
              WASD to Move • E to Investigate
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Room Volume & Ceiling Height Adjuster Modal/Popover */}
      {showDimensionAdjuster && (
        <div className="absolute top-20 left-4 z-30 w-96 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-2xl p-4 text-slate-200 select-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Ceiling & Volume Controls</h2>
            </div>
            <button
              onClick={() => setShowDimensionAdjuster(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-400 my-2.5">
            Adjust ceiling height and room proportions in real time to match grand audit rooms, lecture halls, or intimate chambers.
          </p>

          {/* Ceiling Height Adjustment */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                Ceiling Height:
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {roomHeight.toFixed(1)} meters
              </span>
            </div>

            {/* Stepper buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => {
                  onUpdateCeilingHeight(roomHeight - 1.0);
                  soundManager.playClick();
                }}
                disabled={roomHeight <= 2.8}
                className="py-1 px-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono transition-colors"
              >
                -1.0m
              </button>
              <button
                onClick={() => {
                  onUpdateCeilingHeight(roomHeight - 0.5);
                  soundManager.playClick();
                }}
                disabled={roomHeight <= 2.8}
                className="py-1 px-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono transition-colors"
              >
                -0.5m
              </button>
              <button
                onClick={() => {
                  onUpdateCeilingHeight(roomHeight + 0.5);
                  soundManager.playClick();
                }}
                disabled={roomHeight >= 16.0}
                className="py-1 px-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono transition-colors"
              >
                +0.5m
              </button>
              <button
                onClick={() => {
                  onUpdateCeilingHeight(roomHeight + 1.5);
                  soundManager.playClick();
                }}
                disabled={roomHeight >= 16.0}
                className="py-1 px-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono transition-colors"
              >
                +1.5m
              </button>
            </div>

            {/* Architectural Quick Presets */}
            <div className="pt-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-semibold">
                Ceiling Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Chamber (3.2m)', height: 3.2 },
                  { label: 'Spacious Hall (5.0m)', height: 5.0 },
                  { label: 'Grand Audit (7.2m)', height: 7.2 },
                  { label: 'Cathedral Vault (9.5m)', height: 9.5 },
                ].map((preset) => {
                  const isMatch = Math.abs(roomHeight - preset.height) < 0.2;
                  return (
                    <button
                      key={preset.height}
                      onClick={() => {
                        onUpdateCeilingHeight(preset.height);
                        soundManager.playClick();
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-left transition-all ${
                        isMatch
                          ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Room Footprint Scale Multiplier */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                Room Footprint Scale:
              </span>
              <span className="font-mono text-slate-300 text-xs">
                {roomWidth.toFixed(1)}m × {roomLength.toFixed(1)}m
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '0.8x', mult: 0.8 },
                { label: '1.2x', mult: 1.2 },
                { label: '1.5x (Audit)', mult: 1.5 },
                { label: '1.8x (Grand)', mult: 1.8 },
              ].map((scale) => (
                <button
                  key={scale.mult}
                  onClick={() => {
                    onUpdateRoomScale(scale.mult);
                    soundManager.playClick();
                  }}
                  className="py-1 px-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors text-center border border-slate-700/50"
                  title={`Scale room dimensions by ${scale.mult}x`}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Center Collapsible Control Dock */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-3xl select-none transition-all duration-300">
        {/* Collapse / Expand Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/95 border-t border-x border-slate-700/80 rounded-t-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Camera &amp; Scene Options</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide Options</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Container */}
        {!isCollapsed && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5">
            {/* Non-Spoiler Atmospheric Description Strip */}
            {selectedObject ? (
              <div className="flex items-center justify-between bg-slate-800/90 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-slate-200 shadow-inner">
                <span className="font-semibold text-amber-300">
                  {selectedObject.name}
                </span>
                {selectedObject.description && (
                  <span className="text-slate-300 hidden sm:inline truncate max-w-md italic">
                    “{selectedObject.description}”
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Use WASD to walk through the Gothic hall and press E near glowing Clue Anchors to uncover riddles.
                </span>
              </div>
            )}

            {/* Bottom Button Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
              {/* View Modes */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                {viewModes.map((m) => {
                  const active = viewMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSetViewMode(m.id);
                        soundManager.playClick();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                      }`}
                    >
                      {m.icon}
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Utility Actions */}
              <div className="flex items-center gap-1.5">
                {/* Tactical Flashlight Button */}
                <button
                  onClick={() => {
                    onToggleFlashlight();
                    soundManager.playFlashlightClick();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isFlashlightOn
                      ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-400'
                  }`}
                  title="Toggle Flashlight (Key: F)"
                >
                  <Flashlight className={`w-3.5 h-3.5 ${isFlashlightOn ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>Flashlight</span>
                  <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">F</kbd>
                </button>

                {/* Real-time Ceiling & Room Scale Tool */}
                <button
                  onClick={() => {
                    setShowDimensionAdjuster(!showDimensionAdjuster);
                    soundManager.playClick();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    showDimensionAdjuster
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                  title="Adjust Room Ceiling Height & Volume"
                >
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Ceiling & Scale</span>
                </button>

                <button
                  onClick={() => {
                    onResetCamera();
                    soundManager.playClick();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors"
                  title="Reset Camera View Angle"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Reset View</span>
                </button>

                {hasOriginalPhoto && (
                  <button
                    onClick={() => {
                      onOpenPhotoCompare();
                      soundManager.playClick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors"
                    title="Compare 3D Scene with Original Photograph"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dossier</span>
                  </button>
                )}

                <button
                  onClick={toggleAudio}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-colors"
                  title={isMuted ? 'Unmute Audio & Room Tone' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  onClick={() => {
                    onOpenUpload();
                    soundManager.playClick();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow-lg transition-all ml-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Haunt New Room</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Control Guide on Bottom Left */}
      <div className="absolute bottom-5 left-4 z-20 hidden lg:block select-none pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1.5 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">W A S D</span>
            <span>Move Investigator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold">E</span>
            <span>Investigate Clue / Exit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">F</span>
            <span>Toggle Flashlight</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">SPACE</span>
            <span>Jump</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">SHIFT</span>
            <span>Sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">DRAG</span>
            <span>Look / Orbit</span>
          </div>
        </div>
      </div>
    </>
  );
};
