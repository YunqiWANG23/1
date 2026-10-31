import React, { useState, useRef } from 'react';
import {
  EscapeGameData,
  InventoryData,
  RoomEnvironmentData,
  SampleRoomPreset,
} from '../types/scene';
import { SAMPLE_ROOM_PRESETS } from '../utils/sampleRooms';
import {
  Upload,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  Camera,
  Layers,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface UploadedImageItem {
  id: string;
  dataUrl: string;
  name: string;
  mimeType: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSceneGenerated: (sceneData: RoomEnvironmentData, imageSrcs: string[]) => void;
  hasExistingScene: boolean;
  inventoryData: InventoryData;
  gameData: EscapeGameData;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSceneGenerated,
  hasExistingScene,
  inventoryData,
  gameData,
}) => {
  const [selectedImages, setSelectedImages] = useState<UploadedImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const loadingSteps = [
    `Transmitting ${selectedImages.length || 1} multi-angle photograph(s) to Gemini Vision model...`,
    'Cross-referencing camera viewpoints & triangulating room scale...',
    'Fusing & deduplicating furniture detected across multiple perspectives...',
    'Synthesizing cinematic shadows, flickering lamps & cold moonlight...',
    'Spawning investigator with working tactical flashlight...',
  ];

  const handleFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMessage('Please upload valid image files (JPG, PNG, or WEBP).');
      return;
    }
    setErrorMessage(null);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setSelectedImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            dataUrl,
            name: file.name,
            mimeType: file.type || 'image/jpeg',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSelectPreset = (preset: SampleRoomPreset) => {
    soundManager.playClick();
    onSceneGenerated(
      preset.roomData,
      preset.referencePhotos && preset.referencePhotos.length > 0
        ? preset.referencePhotos
        : [preset.thumbnail]
    );
    onClose();
  };

  const handleGenerate = async () => {
    if (selectedImages.length === 0) return;

    soundManager.playClick();
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1300);

    try {
      const response = await fetch('/api/analyze-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedImages.map((img) => ({
            imageBase64: img.dataUrl,
            mimeType: img.mimeType,
          })),
          inventoryData,
          gameData,
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.sceneData) {
        throw new Error('Invalid scene data returned from vision analysis.');
      }

      onSceneGenerated(
        data.sceneData,
        selectedImages.map((img) => img.dataUrl)
      );
      onClose();
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error('Failed to generate multi-angle scene from photos:', err);
      setErrorMessage(
        err.message || 'Could not synthesize this room. Try different photos or select an atmospheric escape-room preset below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Multi-Angle 3D Scene Reconstruction</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Multi-View AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload photos from different angles of the room for full 360° triangulation & reconstruction.
              </p>
            </div>
          </div>

          {hasExistingScene && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Multi-angle Photos Gallery / Dropzone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Camera Angles ({selectedImages.length} selected)</span>
              </span>
              <span className="text-[11px] text-amber-400">
                {selectedImages.length === 0
                  ? 'Add 1 or more angles'
                  : selectedImages.length === 1
                  ? 'Tip: Add another angle for better 3D depth'
                  : '✓ Multi-angle 3D triangulation ready'}
              </span>
            </div>

            {selectedImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] shadow-lg flex flex-col justify-between"
                  >
                    <img
                      src={img.dataUrl}
                      alt={`Angle ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Angle Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[10px] font-mono font-bold text-amber-300">
                      Angle #{idx + 1}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleRemoveImage(img.id, e)}
                      disabled={isLoading}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/80 hover:bg-red-900/90 text-slate-300 hover:text-white border border-slate-700 transition-all opacity-90 group-hover:opacity-100"
                      title="Remove this angle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[10px] text-slate-300 truncate">
                      {img.name}
                    </div>
                  </div>
                ))}

                {/* Add Another Angle Button Card */}
                {selectedImages.length < 5 && (
                  <button
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-800/20 hover:bg-slate-800/40 p-4 aspect-[4/3] flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-amber-300 transition-all"
                  >
                    <div className="p-2 rounded-full bg-slate-800 border border-slate-700">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold">Add Another Angle</span>
                    <span className="text-[10px] text-slate-500">Different wall/corner</span>
                  </button>
                )}
              </div>
            ) : (
              /* Empty Dropzone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 hover:border-amber-500/70 bg-slate-800/20'
                }`}
              >
                <div className="space-y-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Upload 1 or more photos of the room from different angles
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Drag & drop multiple files or click to browse. Photos facing opposite walls or corners help Gemini eliminate blind spots.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Multi-angle tip banner */}
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-200">Multi-Angle Triangulation:</strong> Gemini cross-references landmark furniture and wall lines across all uploaded angles to calculate true 3D spatial positions and unearth hidden objects.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-red-300">
                  You can also select one of the atmospheric escape-room presets below to begin exploring immediately.
                </p>
              </div>
            </div>
          )}

          {/* Loading Animation Progress */}
          {isLoading && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="text-sm font-semibold text-amber-200">
                  {loadingSteps[loadingStep]}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          {selectedImages.length > 0 && !isLoading && (
            <button
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                Synthesize 3D Scene from {selectedImages.length} Angle{selectedImages.length > 1 ? 's' : ''}
              </span>
            </button>
          )}

          {/* Default Tiered Lecture Theatre Reference Preset */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Default Reference Environment (6 Multi-Angle Photos)
              </h3>
              <span className="text-[11px] text-amber-400">Stepped Tiered Floor Active</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {SAMPLE_ROOM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isLoading}
                  className="group text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/80 transition-all flex items-center gap-4"
                >
                  <div className="relative w-36 shrink-0 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900 aspect-video">
                    <img
                      src={preset.thumbnail}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-600/90 text-[10px] text-white font-semibold">
                      6 Angles
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                      {preset.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {preset.tagline}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
