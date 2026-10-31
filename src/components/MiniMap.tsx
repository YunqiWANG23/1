import React, { useState } from 'react';
import { RoomEnvironmentData, CollisionBox } from '../types/scene';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';

interface MiniMapProps {
  roomData: RoomEnvironmentData;
  playerPos: { x: number; z: number; rotation: number };
  collisionBoxes: CollisionBox[];
}

export const MiniMap: React.FC<MiniMapProps> = ({
  roomData,
  playerPos,
  collisionBoxes,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const roomW = roomData.roomWidth || 6;
  const roomL = roomData.roomLength || 6;

  // Map canvas dimension
  const mapSize = 160;
  const padding = 14;
  const effectiveSize = mapSize - padding * 2;

  // Scale factors
  const maxDim = Math.max(roomW, roomL);
  const scale = effectiveSize / maxDim;

  const toMapX = (x: number) => mapSize / 2 + x * scale;
  const toMapY = (z: number) => mapSize / 2 + z * scale;

  return (
    <div className="absolute top-4 right-4 z-20 select-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2.5 transition-all duration-200">
        <div className="flex items-center justify-between gap-3 px-1 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Compass className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Escape Radar</span>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded hover:bg-slate-800"
            title={collapsed ? 'Expand Radar' : 'Collapse Radar'}
          >
            {collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!collapsed && (
          <div className="relative mt-2">
            <svg
              width={mapSize}
              height={mapSize}
              className="bg-slate-950/90 rounded-lg border border-slate-800"
            >
              <defs>
                <pattern id="radarGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width={mapSize} height={mapSize} fill="url(#radarGrid)" />

              {/* Perimeter Walls */}
              <rect
                x={toMapX(-roomW / 2)}
                y={toMapY(-roomL / 2)}
                width={roomW * scale}
                height={roomL * scale}
                fill="rgba(24, 28, 36, 0.45)"
                stroke="#64748B"
                strokeWidth="2"
                strokeDasharray="3 1.5"
                rx="2"
              />

              {/* Furniture Footprints / Obstacles */}
              {collisionBoxes.map((box) => {
                const bx = toMapX(box.minX);
                const by = toMapY(box.minZ);
                const bw = Math.max(4, (box.maxX - box.minX) * scale);
                const bh = Math.max(4, (box.maxZ - box.minZ) * scale);

                return (
                  <g key={box.id}>
                    <rect
                      x={bx}
                      y={by}
                      width={bw}
                      height={bh}
                      fill="rgba(217, 119, 6, 0.28)"
                      stroke="#B45309"
                      strokeWidth="1"
                      rx="2"
                    />
                  </g>
                );
              })}

              {/* Non-colliding Rugs */}
              {(roomData.objects || [])
                .filter((o) => o.type === 'rug')
                .map((rug) => (
                  <rect
                    key={rug.id}
                    x={toMapX(rug.x - rug.width / 2)}
                    y={toMapY(rug.z - rug.depth / 2)}
                    width={rug.width * scale}
                    height={rug.depth * scale}
                    fill="rgba(180, 83, 9, 0.12)"
                    stroke="rgba(180, 83, 9, 0.35)"
                    strokeWidth="0.8"
                    rx="1"
                  />
                ))}

              {/* Investigator with Flashlight Beam Angle */}
              <g
                transform={`translate(${toMapX(playerPos.x)}, ${toMapY(playerPos.z)}) rotate(${(-playerPos.rotation * 180) / Math.PI})`}
              >
                {/* Flashlight Beam Cone */}
                <polygon
                  points="0,0 -10,-24 10,-24"
                  fill="rgba(254, 240, 138, 0.3)"
                />
                {/* Direction Pointer */}
                <polygon points="0,-7 -4,2 0,0 4,2" fill="#FBBF24" />
                {/* Player Dot */}
                <circle cx="0" cy="0" r="3.5" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.2" />
              </g>
            </svg>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-0.5">
              <span>{roomW}m × {roomL}m</span>
              <span className="text-amber-400 font-mono">
                X:{playerPos.x.toFixed(1)} Z:{playerPos.z.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
