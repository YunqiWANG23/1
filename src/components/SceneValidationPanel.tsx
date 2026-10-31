import React, { useState, useRef, useMemo } from 'react';
import {
  EscapeGameData,
  InventoryData,
  SceneValidationReport,
} from '../types/scene';
import {
  sceneObjectRegistry,
  SceneRegistryEntry,
  buildParallelObjectMappings,
} from '../utils/escapeRoomData';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Crosshair,
  Database,
  ShieldCheck,
  Puzzle,
  FileJson,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  Wand2,
  KeyRound,
  HelpCircle,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface SceneValidationPanelProps {
  validationReport: SceneValidationReport | null;
  inventoryData: InventoryData;
  gameData: EscapeGameData;
  solvedTargetIds?: Set<string>;
  highlightedObjectId: string | null;
  onFocusObject: (objectId: string) => void;
  onUpdateJsonFiles: (newInventory: InventoryData, newGame: EscapeGameData) => void;
  onResetDefaultJson: () => void;
  onDevSimulateCorrect?: () => void;
  onDevSimulateWrong?: () => void;
  onDevRequestHint?: () => void;
  onDevUnlockExit?: () => void;
  onDevResetGame?: () => void;
}

export const SceneValidationPanel: React.FC<SceneValidationPanelProps> = ({
  validationReport,
  inventoryData,
  gameData,
  solvedTargetIds = new Set(),
  highlightedObjectId,
  onFocusObject,
  onUpdateJsonFiles,
  onResetDefaultJson,
  onDevSimulateCorrect,
  onDevSimulateWrong,
  onDevRequestHint,
  onDevUnlockExit,
  onDevResetGame,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'puzzles' | 'mapping' | 'registry' | 'json'
  >('puzzles');
  const [searchQuery, setSearchQuery] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [devStatusMsg, setDevStatusMsg] = useState<string | null>(null);

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const gameInputRef = useRef<HTMLInputElement>(null);

  const parallelMappings = useMemo(
    () => buildParallelObjectMappings(inventoryData, gameData, solvedTargetIds),
    [inventoryData, gameData, solvedTargetIds]
  );

  const registryEntries: SceneRegistryEntry[] = [];
  (inventoryData.objects || []).forEach((inv) => {
    const entry = sceneObjectRegistry.get(inv.id);
    if (entry) {
      registryEntries.push(entry);
    }
  });

  const filteredRegistry = registryEntries.filter(
    (entry) =>
      entry.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMappings = parallelMappings.filter(
    (m) =>
      m.realObjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.parallelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.virtualAssetType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUploadInventoryJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (!parsed || !Array.isArray(parsed.objects)) {
          throw new Error('Invalid inventory.json: missing "objects" array.');
        }
        onUpdateJsonFiles(parsed as InventoryData, gameData);
        soundManager.playSceneReady();
      } catch (err: any) {
        setJsonError(err.message || 'Failed to parse inventory.json');
      }
    };
    reader.readAsText(file);
  };

  const handleUploadGameJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (!parsed || !Array.isArray(parsed.puzzles)) {
          throw new Error('Invalid game.json: missing "puzzles" array.');
        }
        onUpdateJsonFiles(inventoryData, parsed as EscapeGameData);
        soundManager.playSceneReady();
      } catch (err: any) {
        setJsonError(err.message || 'Failed to parse game.json');
      }
    };
    reader.readAsText(file);
  };

  const allValid = validationReport?.allPuzzlesValid ?? false;

  return (
    <div className="absolute top-20 left-4 z-20 w-92 sm:w-[410px] select-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Compact Header Bar */}
        <div
          onClick={() => {
            setIsOpen(!isOpen);
            soundManager.playClick();
          }}
          className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-colors border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2 min-w-0">
            {allValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 truncate">
                  Dev Object Mapping & Scene Validator
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    allValid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {allValid
                    ? `${validationReport?.mandatoryPuzzleCount || gameData.puzzles.length}/${
                        validationReport?.mandatoryPuzzleCount || gameData.puzzles.length
                      } VALID`
                    : 'MISMATCH'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {gameData.title} • {inventoryData.objects.length} Real→Parallel Mappings
              </p>
            </div>
          </div>

          <button className="p-1 text-slate-400 hover:text-white">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <div className="p-3 space-y-2.5 max-h-[70vh] flex flex-col">
            {/* Developer Quick Simulation Toolbar */}
            {(onDevSimulateCorrect ||
              onDevSimulateWrong ||
              onDevRequestHint ||
              onDevUnlockExit ||
              onDevResetGame) && (
              <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
                  <span className="flex items-center gap-1 font-bold uppercase tracking-wider">
                    <Wand2 className="w-3 h-3" />
                    Dev Gameplay Simulation Controls
                  </span>
                  {devStatusMsg && (
                    <span className="text-emerald-300 truncate max-w-[170px]">
                      {devStatusMsg}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1 text-[10px] font-semibold">
                  {onDevSimulateCorrect && (
                    <button
                      onClick={() => {
                        onDevSimulateCorrect();
                        setDevStatusMsg('Verified active target');
                        soundManager.playSceneReady();
                      }}
                      className="px-1.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white transition-colors"
                      title="Simulate showing the correct real-world object to the camera"
                    >
                      +Verify OK
                    </button>
                  )}
                  {onDevSimulateWrong && (
                    <button
                      onClick={() => {
                        onDevSimulateWrong();
                        setDevStatusMsg('Simulated wrong object');
                        soundManager.playClick();
                      }}
                      className="px-1.5 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white transition-colors"
                      title="Simulate showing a wrong object"
                    >
                      Wrong Obj
                    </button>
                  )}
                  {onDevRequestHint && (
                    <button
                      onClick={() => {
                        onDevRequestHint();
                        setDevStatusMsg('Revealed next hint');
                        soundManager.playClick();
                      }}
                      className="px-1.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white flex items-center justify-center gap-0.5 transition-colors"
                      title="Request hint for active puzzle"
                    >
                      <HelpCircle className="w-2.5 h-2.5" />
                      <span>Hint</span>
                    </button>
                  )}
                  {onDevUnlockExit && (
                    <button
                      onClick={() => {
                        onDevUnlockExit();
                        setDevStatusMsg('Submitted final code');
                        soundManager.playSceneReady();
                      }}
                      className="px-1.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white flex items-center justify-center gap-0.5 transition-colors"
                      title="Test final exit condition"
                    >
                      <KeyRound className="w-2.5 h-2.5" />
                      <span>Exit</span>
                    </button>
                  )}
                  {onDevResetGame && (
                    <button
                      onClick={() => {
                        onDevResetGame();
                        setDevStatusMsg('Game state reset');
                        soundManager.playClick();
                      }}
                      className="px-1.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                      title="Reset escape room state"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sub-navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-[10px] font-semibold">
              <button
                onClick={() => {
                  setActiveTab('puzzles');
                  soundManager.playClick();
                }}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'puzzles'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Puzzle className="w-3 h-3" />
                <span>Puzzles ({gameData.puzzles.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('mapping');
                  soundManager.playClick();
                }}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'mapping'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Parallel ({parallelMappings.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('registry');
                  soundManager.playClick();
                }}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'registry'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3 h-3" />
                <span>3D Reg ({registryEntries.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('json');
                  soundManager.playClick();
                }}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'json'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileJson className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </div>

            {/* Explicit Missing Target Alert if any puzzle target is missing from inventory.objects */}
            {validationReport && validationReport.missingInventoryTargets.length > 0 && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700 text-[11px] text-red-200 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-300">
                    Unresolved Puzzle Target ID Mismatch:
                  </p>
                  <p className="font-mono mt-0.5">
                    {validationReport.missingInventoryTargets.join(', ')}
                  </p>
                  <p className="text-[10px] text-red-300/90 mt-0.5">
                    Target IDs must match an exact `id` in `inventory.objects`. Missing targets are reported explicitly and never silently invented.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 1: MANDATORY PUZZLE OBJECTS & 6-POINT SCENE VALIDATION */}
            {activeTab === 'puzzles' && validationReport && (
              <div className="space-y-2 overflow-y-auto pr-1">
                <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                  <span>Mandatory `game.puzzles[].target` Checks</span>
                  {gameData.final_code && (
                    <span className="font-mono text-amber-300">
                      Code: <strong>{gameData.final_code}</strong>
                    </span>
                  )}
                </div>

                {validationReport.puzzleResults.map((res) => {
                  const isSelected = highlightedObjectId === res.targetId;
                  const isSolved = solvedTargetIds.has(res.targetId);
                  const isOk =
                    res.status === 'valid' || res.status === 'fallback_recovered';

                  return (
                    <div
                      key={res.puzzleId}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/80'
                          : isOk
                          ? 'bg-slate-800/70 border-slate-700/70 hover:border-slate-600'
                          : 'bg-red-950/40 border-red-700/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold uppercase">
                              {res.puzzleId} • Digit {res.rewardDigit}
                            </span>
                            <code className="text-xs font-bold text-white font-mono truncate">
                              {res.targetId}
                            </code>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                isSolved
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {isSolved ? 'PURIFIED' : 'CURSED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200/95 font-medium mt-0.5">
                            {res.parallelName || res.objectName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Asset: {res.virtualAssetType || 'medieval_prop'}
                          </p>
                        </div>

                        {res.inSceneGraph && (
                          <button
                            onClick={() => {
                              onFocusObject(res.targetId);
                              soundManager.playClick();
                            }}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-[10px] font-semibold shadow transition-colors"
                            title="Teleport camera to inspect this puzzle object in 3D"
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>Locate 3D</span>
                          </button>
                        )}
                      </div>

                      {/* Supporting Surface & 3D Transform Coordinates */}
                      <div className="mt-1.5 text-[10px] text-slate-400 space-y-0.5">
                        <div className="truncate">
                          <span className="text-slate-500">Surface:</span>{' '}
                          <span className="text-slate-300">{res.supportingSurface}</span>
                        </div>
                        {res.position && (
                          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                            <span>
                              pos: ({res.position.x.toFixed(2)}, {res.position.y.toFixed(2)},{' '}
                              {res.position.z.toFixed(2)})m
                            </span>
                            <span className="text-emerald-400">
                              {res.meshCount} meshes • {res.vertexCount} verts
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 6-Point Validation Badges */}
                      <div className="mt-2 pt-1.5 border-t border-slate-700/60 grid grid-cols-3 gap-1 text-[9px] font-mono">
                        <span
                          className={`flex items-center gap-1 ${
                            res.inInventory ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          In Inventory
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            res.inSceneGraph ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          3D Entity
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            res.hasValidTransformAndGeometry ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          Geometry OK
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            res.onSupportingSurface ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          Surface OK
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            res.withinNavigableBounds ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          In Bounds
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            res.noDuplicates ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          Unique ID
                        </span>
                      </div>

                      {res.errorMessages.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-red-300 bg-red-950/70 rounded p-1.5">
                          {res.errorMessages.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: PARALLEL OBJECT MAPPING TABLE (Real ID -> Parallel Object -> Rendered Asset -> Status) */}
            {activeTab === 'mapping' && (
              <div className="space-y-2 flex flex-col min-h-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter Real Object ID, Parallel Relic, or 3D Asset..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5 overflow-y-auto pr-1 max-h-72">
                  {filteredMappings.map((m) => {
                    const inScene = sceneObjectRegistry.has(m.realObjectId);
                    return (
                      <div
                        key={m.realObjectId}
                        className={`p-2 rounded-xl border text-[11px] space-y-1 ${
                          m.isPuzzleTarget
                            ? 'bg-amber-950/25 border-amber-500/40'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <code className="font-mono font-bold text-amber-300 truncate">
                              {m.realObjectId}
                            </code>
                            <span className="text-slate-500">→</span>
                            <span className="font-semibold text-slate-100 truncate">
                              {m.parallelName}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              onFocusObject(m.realObjectId);
                              soundManager.playClick();
                            }}
                            className="shrink-0 p-1 rounded bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white transition-colors"
                            title="Highlight and focus in 3D scene"
                          >
                            <Crosshair className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Asset: {m.virtualAssetType}</span>
                          <div className="flex items-center gap-1">
                            {m.isPuzzleTarget && (
                              <span
                                className={`px-1.5 py-0.2 rounded ${
                                  m.resolvedState
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {m.resolvedState ? 'PURIFIED' : 'CURSED'}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded ${
                                inScene
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {inScene ? 'RENDERED' : 'MISSING'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: FULL `sceneObjectRegistry` BROWSER */}
            {activeTab === 'registry' && (
              <div className="space-y-2 flex flex-col min-h-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter sceneObjectRegistry by exact ID or location..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5 overflow-y-auto pr-1 max-h-72">
                  {filteredRegistry.map((entry) => {
                    const isSelected = highlightedObjectId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500/80'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] font-mono font-bold text-amber-300 truncate">
                              {entry.id}
                            </code>
                            {entry.puzzleId && (
                              <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase">
                                {entry.puzzleId}
                              </span>
                            )}
                            {entry.interactive && (
                              <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                                interactive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-200 truncate">{entry.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{entry.location}</p>
                          <p className="text-[9px] font-mono text-slate-500">
                            ({entry.position.x.toFixed(2)}, {entry.position.y.toFixed(2)},{' '}
                            {entry.position.z.toFixed(2)})m
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            onFocusObject(entry.id);
                            soundManager.playClick();
                          }}
                          className="shrink-0 p-1.5 rounded-lg bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white transition-colors"
                          title={`Locate ${entry.id} in 3D scene`}
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: CUSTOM `inventory.json` & `game.json` LOADER */}
            {activeTab === 'json' && (
              <div className="space-y-2.5 text-xs text-slate-300">
                <p className="text-[11px] text-slate-400">
                  Authoritative `inventory.json` and `game.json` are active and synced with `window.sceneObjectRegistry`. Upload custom JSON files to test target resolution and mismatch reporting:
                </p>

                {jsonError && (
                  <div className="p-2 rounded-lg bg-red-950/70 border border-red-700 text-[11px] text-red-200">
                    {jsonError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => inventoryInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                  >
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <FileJson className="w-3.5 h-3.5" />
                      <span>Load inventory.json</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Current: {inventoryData.objects.length} objects
                    </div>
                  </button>

                  <button
                    onClick={() => gameInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                  >
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load game.json</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Current: {gameData.puzzles.length} puzzles
                    </div>
                  </button>
                </div>

                <input
                  ref={inventoryInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleUploadInventoryJson}
                />
                <input
                  ref={gameInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleUploadGameJson}
                />

                <button
                  onClick={() => {
                    setJsonError(null);
                    onResetDefaultJson();
                    soundManager.playClick();
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default Imperial Hall JSON Data</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
