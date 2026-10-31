/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  Download,
  Image as ImageIcon,
  Film,
  Trash2,
  KeyRound,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  FileJson,
  Eye,
} from 'lucide-react';
import {
  INITIAL_GAME_RESULT,
  INITIAL_VERIFICATION_RESULT,
  MOCK_USABLE_OBJECTS,
  SAMPLE_ROOM_PHOTOS,
  type EventInfo,
  type GenerateGameResponse,
  type VerifyAndFixResponse,
  type RoomObject,
} from './utils/escapeData';
import { VerificationScreen } from './components/VerificationScreen';
import { RoomScene } from './components/RoomScene';
import GhostPanel from './GhostPanel';
import { initialState, type GameState } from './gameState';

interface UploadedMediaItem {
  id: string;
  name: string;
  mimeType: string;
  base64: string; // raw base64 without data:... prefix
  previewUrl: string;
}

function triggerJsonDownload(filename: string, data: unknown) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fileToBase64(
  file: File
): Promise<{ mimeType: string; base64: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      resolve({
        mimeType: file.type || 'image/jpeg',
        base64,
        previewUrl: dataUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  // Navigation tab: 'verification' (Stage 2 + Stage 4 Live) or 'generator' (Stage 1)
  const [activeView, setActiveView] = useState<'verification' | 'generator'>(
    'verification'
  );

  // Shared Demo mode (offline) toggle that sends mock: true
  const [demoMode, setDemoMode] = useState<boolean>(true);

  // Event form state matching EventInfo in gameGenerator.ts
  const [organiser, setOrganiser] = useState<string>('Alex');
  const [players, setPlayers] = useState<number>(20);
  const [teams, setTeams] = useState<number>(4);
  const [minutes, setMinutes] = useState<number>(15);
  const [scareLevel, setScareLevel] = useState<EventInfo['scare_level']>(
    'spooky but not scary'
  );

  // Media upload state
  const [mediaItems, setMediaItems] = useState<UploadedMediaItem[]>([]);
  const [loadingSample, setLoadingSample] = useState<boolean>(false);

  // Stage 1 Generation & result state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] =
    useState<GenerateGameResponse>(INITIAL_GAME_RESULT);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Stage 2 Verification & Auto-Fix state
  const [verifyData, setVerifyData] = useState<VerifyAndFixResponse>(
    INITIAL_VERIFICATION_RESULT
  );
  const [verifyUsableObjects, setVerifyUsableObjects] = useState<RoomObject[]>(
    INITIAL_GAME_RESULT.usable_objects
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Stage 4 Live Ghost & shared GameState (shown after Organiser presses Approve)
  const [approved, setApproved] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState>(initialState());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setErrorMessage(null);
    const files: File[] = Array.from(fileList);
    const hasVideo = files.some((f) => f.type.startsWith('video/'));

    try {
      if (hasVideo) {
        const videoFile = files.find((f) => f.type.startsWith('video/'))!;
        const converted = await fileToBase64(videoFile);
        setMediaItems([
          {
            id: `${videoFile.name}-${Date.now()}`,
            name: videoFile.name,
            mimeType: converted.mimeType,
            base64: converted.base64,
            previewUrl: converted.previewUrl,
          },
        ]);
      } else {
        const convertedList = await Promise.all(
          files.map(async (file, idx) => {
            const converted = await fileToBase64(file);
            return {
              id: `${file.name}-${Date.now()}-${idx}`,
              name: file.name,
              mimeType: converted.mimeType,
              base64: converted.base64,
              previewUrl: converted.previewUrl,
            };
          })
        );
        setMediaItems((prev) => {
          const withoutVideo = prev.filter(
            (item) => !item.mimeType.startsWith('video/')
          );
          return [...withoutVideo, ...convertedList];
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not read selected files.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLoadSamplePhotos = async () => {
    setLoadingSample(true);
    setErrorMessage(null);
    try {
      const loaded: UploadedMediaItem[] = await Promise.all(
        SAMPLE_ROOM_PHOTOS.map(async (url, index) => {
          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], `room-angle-${index + 1}.jpg`, {
            type: blob.type || 'image/jpeg',
          });
          const converted = await fileToBase64(file);
          return {
            id: `sample-${index + 1}`,
            name: `room-angle-${index + 1}.jpg`,
            mimeType: converted.mimeType,
            base64: converted.base64,
            previewUrl: url,
          };
        })
      );
      setMediaItems(loaded);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load sample room photos.');
    } finally {
      setLoadingSample(false);
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const runVerifyRequest = async (
    gameToVerify: GenerateGameResponse['game'],
    usableToVerify: RoomObject[],
    mockFlag: boolean
  ) => {
    setIsVerifying(true);
    setVerifyError(null);
    setApproved(false);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: gameToVerify,
          usable_objects: usableToVerify,
          mock: mockFlag,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Verification error (${res.status})`);
      }
      const verified = data as VerifyAndFixResponse;
      setVerifyUsableObjects(usableToVerify);
      setVerifyData(verified);
      setResult((prev) => ({
        ...prev,
        game: verified.final_game,
        usable_objects: usableToVerify,
      }));
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to run /api/verify.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadBrokenDemo = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    setApproved(false);
    try {
      const brokenRes = await fetch('/api/broken-game');
      const brokenGame = await brokenRes.json();
      if (!brokenRes.ok) {
        throw new Error(brokenGame?.error || 'Failed to load /api/broken-game');
      }
      await runVerifyRequest(brokenGame, MOCK_USABLE_OBJECTS, demoMode);
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to load broken demo level.');
      setIsVerifying(false);
    }
  };

  const handleVerifyCurrentGame = async () => {
    await runVerifyRequest(result.game, result.usable_objects, demoMode);
  };

  const handleApproveGame = () => {
    setResult((prev) => ({
      ...prev,
      game: verifyData.final_game,
      usable_objects: verifyUsableObjects,
    }));
    setGameState(initialState());
    setApproved(true);
  };

  const handleGenerateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!organiser.trim()) {
      setErrorMessage('Please enter an organiser name.');
      return;
    }

    if (!demoMode && mediaItems.length === 0) {
      setErrorMessage(
        'Please upload room photos or a short video (or click "Load 6 Sample Room Photos" or enable "Demo mode (offline)") before generating.'
      );
      return;
    }

    setIsGenerating(true);
    try {
      const eventPayload: EventInfo = {
        organiser: organiser.trim(),
        players: Number(players) || 20,
        teams: Number(teams) || 4,
        minutes: Number(minutes) || 15,
        scare_level: scareLevel,
      };

      const response = await fetch('/api/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media: mediaItems.map((m) => ({
            mimeType: m.mimeType,
            base64: m.base64,
          })),
          event: eventPayload,
          mock: demoMode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      const generated = data as GenerateGameResponse;
      setResult(generated);
      // Also run verification on the newly generated game
      await runVerifyRequest(
        generated.game,
        generated.usable_objects,
        demoMode
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate game from server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const puzzleTargetSet = new Set(
    (result.game?.puzzles ?? []).map((p) => p.target)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Top Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Haunted Room — Escape Game Studio
                </h1>
                <p className="text-xs text-zinc-400">
                  Stage 1 Generator · Stage 2 Verifier · Stage 4 Live Ghost
                </p>
              </div>
            </div>

            {/* Screen Switcher */}
            <nav
              aria-label="Screen navigation"
              className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800"
            >
              <button
                type="button"
                onClick={() => setActiveView('verification')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeView === 'verification'
                    ? 'bg-orange-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Verification Screen
              </button>
              <button
                type="button"
                onClick={() => setActiveView('generator')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeView === 'generator'
                    ? 'bg-orange-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Stage 1: Room Generator
              </button>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                triggerJsonDownload('inventory.json', result.inventory)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Download inventory.json</span>
            </button>
            <button
              type="button"
              onClick={() =>
                triggerJsonDownload('game.json', verifyData.final_game)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download game.json</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRawJson((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>{showRawJson ? 'Hide Raw JSON' : 'View Raw JSON'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {activeView === 'verification' ? (
          <>
            {approved && (
              <section
                aria-label="Live Ghost Session and 3D Room Stage"
                className="rounded-2xl bg-zinc-900/90 border-2 border-orange-500/50 p-5 space-y-5 shadow-2xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-emerald-500 text-zinc-950 mr-2">
                      Stage 4 Live
                    </span>
                    <h2 className="inline text-lg font-bold text-white">
                      {result.game.title} — Live Ghost Host &amp; 3D Room Stage
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    gemini-3.8-live · ephemeral token via /api/live-token
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7">
                    <GhostPanel
                      game={result.game}
                      objects={result.usable_objects}
                      onState={setGameState}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <RoomScene
                      game={result.game}
                      objects={result.usable_objects}
                      state={gameState}
                    />
                  </div>
                </div>
              </section>
            )}

            <VerificationScreen
              verifyData={verifyData}
              usableObjects={verifyUsableObjects}
              demoMode={demoMode}
              onToggleDemoMode={setDemoMode}
              onLoadBrokenDemo={handleLoadBrokenDemo}
              onVerifyCurrentGame={handleVerifyCurrentGame}
              onApprove={handleApproveGame}
              isVerifying={isVerifying}
              verifyError={verifyError}
            />
          </>
        ) : (
          <>
            {/* Stage 1: Upload & Event Setup Form */}
            <section
              aria-label="Escape game setup form"
              className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 sm:p-6 shadow-xl"
            >
              <form onSubmit={handleGenerateGame} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Room Media Upload */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="room-media-upload"
                        className="block text-sm font-semibold text-white"
                      >
                        1. Upload Room Photos or One Short Video
                      </label>
                      <button
                        type="button"
                        onClick={handleLoadSamplePhotos}
                        disabled={loadingSample}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer disabled:opacity-50"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          {loadingSample
                            ? 'Loading sample photos...'
                            : 'Load 6 Sample Room Photos'}
                        </span>
                      </button>
                    </div>

                    <label
                      htmlFor="room-media-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-orange-500/60 rounded-xl p-5 bg-zinc-950/60 hover:bg-zinc-950 transition cursor-pointer text-center"
                    >
                      <Upload className="w-7 h-7 text-orange-400 mb-2" />
                      <span className="text-sm font-medium text-zinc-200">
                        Click to select room photos or one short video
                      </span>
                      <span className="text-xs text-zinc-400 mt-1">
                        Sent as base64 to{' '}
                        <code className="font-mono">/api/generate-game</code> (up
                        to 60MB)
                      </span>
                      <input
                        id="room-media-upload"
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>

                    {mediaItems.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>
                            {mediaItems.length} file
                            {mediaItems.length === 1 ? '' : 's'} encoded as base64
                          </span>
                          <button
                            type="button"
                            onClick={() => setMediaItems([])}
                            className="text-rose-400 hover:underline cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {mediaItems.map((item) => (
                            <div
                              key={item.id}
                              className="relative group rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 aspect-square flex items-center justify-center"
                            >
                              {item.mimeType.startsWith('video/') ? (
                                <div className="flex flex-col items-center justify-center p-2 text-center">
                                  <Film className="w-6 h-6 text-orange-400 mb-1" />
                                  <span className="text-[10px] text-zinc-300 truncate max-w-full">
                                    {item.name}
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={item.previewUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <button
                                type="button"
                                aria-label={`Remove ${item.name}`}
                                onClick={() => handleRemoveMedia(item.id)}
                                className="absolute top-1 right-1 p-1 rounded bg-zinc-950/80 text-zinc-300 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        Tip: Upload your room photos/video, click{' '}
                        <span className="text-zinc-200 font-medium">
                          Load 6 Sample Room Photos
                        </span>
                        , or use{' '}
                        <span className="text-zinc-200 font-medium">
                          Demo mode (offline)
                        </span>
                        .
                      </p>
                    )}
                  </div>

                  {/* Right Column: Event Configuration Form */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="text-sm font-semibold text-white">
                      2. Event Details
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label
                          htmlFor="organiser-input"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Organiser name
                        </label>
                        <input
                          id="organiser-input"
                          type="text"
                          value={organiser}
                          onChange={(e) => setOrganiser(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="scare-level-select"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Scare level
                        </label>
                        <select
                          id="scare-level-select"
                          value={scareLevel}
                          onChange={(e) =>
                            setScareLevel(
                              e.target.value as EventInfo['scare_level']
                            )
                          }
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="kid-friendly">kid-friendly</option>
                          <option value="spooky but not scary">
                            spooky but not scary
                          </option>
                          <option value="hardcore">hardcore</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="players-input"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Players
                        </label>
                        <input
                          id="players-input"
                          type="number"
                          min={1}
                          max={500}
                          value={players}
                          onChange={(e) => setPlayers(Number(e.target.value))}
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label
                            htmlFor="teams-input"
                            className="block text-xs font-medium text-zinc-300 mb-1"
                          >
                            Teams
                          </label>
                          <input
                            id="teams-input"
                            type="number"
                            min={1}
                            max={50}
                            value={teams}
                            onChange={(e) => setTeams(Number(e.target.value))}
                            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="minutes-input"
                            className="block text-xs font-medium text-zinc-300 mb-1"
                          >
                            Minutes
                          </label>
                          <input
                            id="minutes-input"
                            type="number"
                            min={5}
                            max={120}
                            value={minutes}
                            onChange={(e) => setMinutes(Number(e.target.value))}
                            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label
                        htmlFor="generator-demo-mode-checkbox"
                        className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none"
                      >
                        <input
                          id="generator-demo-mode-checkbox"
                          type="checkbox"
                          checked={demoMode}
                          onChange={(e) => setDemoMode(e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500"
                        />
                        <span>Demo mode (offline) — sends mock: true</span>
                      </label>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 shadow-lg shadow-orange-500/20 transition cursor-pointer"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating Escape Game...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate game</span>
                          </>
                        )}
                      </button>

                      {errorMessage && (
                        <div
                          role="alert"
                          className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/70 rounded-lg px-3 py-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </section>

            {/* Rule Check Banner (green PASSED / red FAILED with problems) */}
            <section
              aria-label="Rule check status"
              className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                result.rule_check.passed
                  ? 'bg-emerald-950/35 border-emerald-700/60'
                  : 'bg-rose-950/40 border-rose-700/70'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  {result.rule_check.passed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950">
                      <CheckCircle2 className="w-4 h-4" />
                      PASSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-500 text-white">
                      <XCircle className="w-4 h-4" />
                      FAILED
                    </span>
                  )}
                  <h2 className="text-base font-bold text-white">
                    Deterministic Rule Check (<code>rule_check</code>)
                  </h2>
                </div>

                {result.rule_check.passed ? (
                  <p className="text-xs text-emerald-200/90">
                    All puzzles target unique usable objects, clues never reveal
                    the object name directly, every puzzle has 2 hints and a
                    1-digit reward, and <code>final_code</code> (
                    {result.game.final_code}) matches the reward digits in order.
                  </p>
                ) : (
                  <ul className="list-disc list-inside text-xs text-rose-200 space-y-1 pt-1">
                    {result.rule_check.problems.map((prob, i) => (
                      <li key={i}>{prob}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                    final_code
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-widest text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    <span>{result.game.final_code}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Usable Objects & Rejected Objects with Reasons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usable Objects */}
              <section
                aria-label="Usable objects"
                className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col"
              >
                <div className="px-5 py-3.5 bg-emerald-950/30 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">
                      Usable Objects (<code>usable_objects</code>:{' '}
                      {result.usable_objects.length})
                    </h2>
                  </div>
                  <span className="text-xs text-emerald-300/90 font-mono">
                    owner=shared · portable · safe · distinct≥3
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/80 max-h-[480px] overflow-y-auto">
                  {result.usable_objects.map((obj) => {
                    const isTarget = puzzleTargetSet.has(obj.id);
                    return (
                      <div
                        key={obj.id}
                        className={`p-4 space-y-1.5 ${
                          isTarget ? 'bg-emerald-950/15' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">
                              {obj.name}
                            </span>
                            <code className="text-xs font-mono text-emerald-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                              {obj.id}
                            </code>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-300">
                              owner: {obj.owner}
                            </span>
                            {isTarget && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                Puzzle Target
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            camera_distinct: {obj.camera_distinct}/5
                          </span>
                        </div>

                        <div className="text-xs text-zinc-400">
                          <span className="text-zinc-300 font-medium">color:</span>{' '}
                          {obj.color} ·{' '}
                          <span className="text-zinc-300 font-medium">
                            location:
                          </span>{' '}
                          {obj.location}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Rejected Objects with Reasons */}
              <section
                aria-label="Rejected objects with reasons"
                className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col"
              >
                <div className="px-5 py-3.5 bg-rose-950/30 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <h2 className="text-sm font-bold text-white">
                      Rejected Objects (<code>rejected_objects</code>:{' '}
                      {result.rejected_objects.length})
                    </h2>
                  </div>
                  <span className="text-xs text-rose-300/90 font-mono">
                    rejected_because
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/80 max-h-[480px] overflow-y-auto">
                  {result.rejected_objects.map((obj) => (
                    <div key={obj.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-zinc-200">
                            {obj.name}
                          </span>
                          <code className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            {obj.id}
                          </code>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-400">
                            owner: {obj.owner}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">
                          camera_distinct: {obj.camera_distinct}/5
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">color:</span>{' '}
                        {obj.color} ·{' '}
                        <span className="text-zinc-300 font-medium">
                          location:
                        </span>{' '}
                        {obj.location}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(obj.rejected_because ?? []).map((reason, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* The Puzzles */}
            <section aria-label="Escape game puzzles" className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-r from-orange-950/40 via-zinc-900 to-zinc-900 border border-orange-500/30 p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {result.game.title}
                  </h2>
                  <span className="text-xs font-mono text-orange-300 bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 rounded-md">
                    {result.game.puzzles.length} Puzzles · final_code:{' '}
                    {result.game.final_code}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {result.game.intro}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.game.puzzles.map((puzzle, index) => (
                  <div
                    key={puzzle.id}
                    className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                            Puzzle {index + 1} ({puzzle.id})
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            solve_by: {puzzle.solve_by}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                          <span>reward_digit:</span>
                          <span className="text-sm">{puzzle.reward_digit}</span>
                        </div>
                      </div>

                      <blockquote className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 text-sm text-zinc-100 italic leading-relaxed">
                        “{puzzle.clue}”
                      </blockquote>

                      <div className="flex items-center justify-between text-xs bg-zinc-950/60 px-3 py-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-400">target:</span>
                        <code className="font-mono font-semibold text-emerald-400">
                          {puzzle.target}
                        </code>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                          <span>hints</span>
                        </div>
                        <div className="text-xs text-zinc-300 bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-2.5 space-y-1">
                          {puzzle.hints.map((hint, hIdx) => (
                            <div key={hIdx}>
                              <span className="font-semibold text-zinc-400">
                                Hint {hIdx + 1}:{' '}
                              </span>
                              {hint}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-300">
                        why_it_works:{' '}
                      </span>
                      {puzzle.why_it_works}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Optional Raw JSON Drawer */}
        {showRawJson && (
          <section
            aria-label="Raw JSON files preview"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-orange-300">
                  inventory.json
                </span>
                <button
                  type="button"
                  onClick={() =>
                    triggerJsonDownload('inventory.json', result.inventory)
                  }
                  className="text-xs text-orange-400 hover:underline cursor-pointer"
                >
                  Save file
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-zinc-200 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {JSON.stringify(result.inventory, null, 2)}
              </pre>
            </div>

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-emerald-300">
                  game.json
                </span>
                <button
                  type="button"
                  onClick={() =>
                    triggerJsonDownload('game.json', verifyData.final_game)
                  }
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Save file
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-zinc-200 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {JSON.stringify(verifyData.final_game, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
