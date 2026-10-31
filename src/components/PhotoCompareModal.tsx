import React, { useState } from 'react';
import { RoomEnvironmentData } from '../types/scene';
import { X, Eye, FileText, Camera } from 'lucide-react';

interface PhotoCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImages: string[];
  roomData: RoomEnvironmentData;
}

export const PhotoCompareModal: React.FC<PhotoCompareModalProps> = ({
  isOpen,
  onClose,
  originalImages,
  roomData,
}) => {
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);

  if (!isOpen || !originalImages || originalImages.length === 0) return null;

  const activeImage = originalImages[activeAngleIndex] || originalImages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Investigation Dossier</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 border border-slate-700 text-amber-300">
                  {originalImages.length} Angle{originalImages.length > 1 ? 's' : ''} Synthesized
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Compare original source camera angles with the triangulated 3D escape-room reconstruction
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Source Photographs with Angle Switcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Source Angle #{activeAngleIndex + 1} of {originalImages.length}</span>
              </h3>
            </div>

            {/* Main Angle Preview */}
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-2xl relative">
              <img
                src={activeImage}
                alt={`Source Room Angle ${activeAngleIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[10px] font-mono font-bold text-amber-300">
                Viewpoint #{activeAngleIndex + 1}
              </div>
            </div>

            {/* Thumbnail selector if multiple angles exist */}
            {originalImages.length > 1 && (
              <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                {originalImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveAngleIndex(idx)}
                    className={`relative rounded-lg overflow-hidden border aspect-video w-20 shrink-0 transition-all ${
                      activeAngleIndex === idx
                        ? 'border-amber-500 ring-2 ring-amber-500/40 scale-105'
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-center font-mono py-0.5 text-slate-200">
                      Angle {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 italic">
              "{roomData.architecturalNotes || 'Analyzed indoor space with inferred 3D layout.'}"
            </p>
          </div>

          {/* Right: Detected 3D Architecture Breakdown */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Triangulated 3D Architecture
              </h3>

              {/* Stat Chips */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Unified Room Scale</div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {roomData.roomWidth}m × {roomData.roomLength}m
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Ceiling Height</div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {roomData.roomHeight}m
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Aged Flooring</div>
                  <div className="font-bold text-slate-100 capitalize mt-0.5 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                      style={{ backgroundColor: roomData.floorColor }}
                    />
                    <span>{roomData.floorType}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Atmosphere</div>
                  <div className="font-bold text-amber-300 capitalize mt-0.5">
                    {roomData.lightingMood.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Detected Furniture List */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">
                  Merged Clues & Furniture ({roomData.objects.length})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {roomData.objects.map((obj) => (
                    <div
                      key={obj.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                          style={{ backgroundColor: obj.primaryColor }}
                        />
                        <span className="font-medium">{obj.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {obj.width}m × {obj.depth}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              Resume Escape Exploration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
