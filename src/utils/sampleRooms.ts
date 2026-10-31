import { SampleRoomPreset, SceneObject } from '../types/scene';
import {
  DEFAULT_GAME_DATA,
  DEFAULT_INVENTORY_DATA,
  integrateInventoryAndGameIntoRoom,
} from './escapeRoomData';

export const LECTURE_THEATRE_REFERENCE_PHOTOS: string[] = [
  '/assets/aistudio/Weixin_Image_20261031122003_146_769_2f587618.jpg',
  '/assets/aistudio/Weixin_Image_20261031121950_144_769_6e2b27d5.jpg',
  '/assets/aistudio/Weixin_Image_20261031121947_143_769_e0cd8c46.jpg',
  '/assets/aistudio/Weixin_Image_20261031121952_145_769_b2780edc.jpg',
  '/assets/aistudio/Weixin_Image_20261031122020_148_769_f28a01ed.jpg',
  '/assets/aistudio/Weixin_Image_20261031122012_147_769_eaed18b6.jpg',
];

function buildTieredLectureRows(): SceneObject[] {
  const rows: SceneObject[] = [];
  const startZ = -3.5;
  const endZ = 9.5;
  const numTiers = 10;
  const stepHeight = 0.28;
  const tierDepth = (endZ - startZ) / numTiers; // 1.3m per tier

  for (let i = 0; i < numTiers; i++) {
    const tierNumber = i + 1;
    const zCenter = Math.round((startZ + (i + 0.52) * tierDepth) * 100) / 100;
    const tierY = Math.round((i + 1) * stepHeight * 100) / 100;

    // 1. Left Cathedral Pew Bank (X from -7.3m to -3.65m -> center -5.48m, width 3.65m, 6 seats)
    rows.push({
      id: `tier_${tierNumber}_left_bank`,
      name: `Tier ${tierNumber} — Left Carved Oak Cathedral Pew Bank (6 Stalls & Scriptorium Ledge)`,
      type: 'lecture_row',
      x: -5.48,
      y: tierY,
      z: zCenter,
      width: 3.65,
      height: 0.86,
      depth: 0.92,
      rotationY: 0,
      primaryColor: '#4A1218',
      secondaryColor: '#2B1B12',
      seatCount: 6,
      description: `Row ${tierNumber} left Gothic scriptorium pew bank mounted flush on solid carved stone tier #${tierNumber} (elevation +${tierY.toFixed(2)}m), facing the front sanctum altar with a dark-oak writing ledge, blind-tracery modesty screen, and 6 crimson-velvet choir stalls.`,
    });

    // 2. Center Cathedral Pew Bank (X from -2.55m to +2.55m -> center 0m, width 5.10m, 9 seats)
    rows.push({
      id: `tier_${tierNumber}_center_bank`,
      name: `Tier ${tierNumber} — Center Grand Scriptorium Pew Bank (9 Stalls & Grimoire Ledge)`,
      type: 'lecture_row',
      x: 0,
      y: tierY,
      z: zCenter,
      width: 5.1,
      height: 0.86,
      depth: 0.92,
      rotationY: 0,
      primaryColor: '#4A1218',
      secondaryColor: '#2B1B12',
      seatCount: 9,
      description: `Row ${tierNumber} center Gothic cathedral pew bank resting solidly on stepped stone tier #${tierNumber} (elevation +${tierY.toFixed(2)}m), facing the ritual altar with continuous carved dark-oak writing desk, open illuminated grimoires, and 9 tufted velvet stalls.`,
    });

    // 3. Right Cathedral Pew Bank (X from +3.65m to +7.3m -> center +5.48m, width 3.65m, 6 seats)
    rows.push({
      id: `tier_${tierNumber}_right_bank`,
      name: `Tier ${tierNumber} — Right Carved Oak Cathedral Pew Bank (6 Stalls & Scriptorium Ledge)`,
      type: 'lecture_row',
      x: 5.48,
      y: tierY,
      z: zCenter,
      width: 3.65,
      height: 0.86,
      depth: 0.92,
      rotationY: 0,
      primaryColor: '#4A1218',
      secondaryColor: '#2B1B12',
      seatCount: 6,
      description: `Row ${tierNumber} right Gothic scriptorium pew bank mounted flush on stepped stone tier #${tierNumber} (elevation +${tierY.toFixed(2)}m), facing the three royal sanctum tapestries with carved oak writing ledge and 6 velvet choir seats.`,
    });
  }

  return rows;
}

export const SAMPLE_ROOM_PRESETS: SampleRoomPreset[] = [
  {
    id: 'imperial-tiered-lecture-theatre',
    title: 'The Cursed Sanctum of Imperial Keep (Medieval Gothic Parallel World)',
    tagline:
      '10 rising Gothic stone tiers • 210 carved oak cathedral pews • 3 Royal Haunted Tapestries • Ritual Altar & 4 Cursed Relic Puzzles',
    thumbnail: LECTURE_THEATRE_REFERENCE_PHOTOS[0],
    referencePhotos: LECTURE_THEATRE_REFERENCE_PHOTOS,
    roomData: integrateInventoryAndGameIntoRoom(
      {
        roomType: 'Medieval Gothic Haunted Castle Great Hall & Tiered Sanctum',
        roomWidth: 16.0,
        roomLength: 22.0,
        roomHeight: 6.2,
        wallColor: '#282C35',
        floorType: 'carpet',
        floorColor: '#21242C',
        ceilingColor: '#191C24',
        lightingMood: 'dim_Warm',
        lightIntensity: 1.25,
        keyLightColor: '#F59E0B',
        ambientLightColor: '#60A5FA',
        architecturalNotes:
          'Parallel-world Medieval Gothic Haunted Castle transformation of the Imperial College tiered lecture theatre ("The Phantom Lecture of Imperial Hall"). Preserves the exact 16m × 22m × 6.2m spatial layout, 10 rising stepped tiers (+0.28m per step up to +2.80m at the rear gallery), dual stepped stair aisles, 3 seating banks of carved dark-oak cathedral pews, 3 enormous haunted royal tapestries on the front sanctum wall, the central carved dark-oak & stone ritual altar, the cursed runic stone monolith, tall Gothic stained-glass lancet windows casting cold moonlight beams, wrought-iron flickering candle chandeliers, and all 21 real-world inventory objects reinterpreted as dark-fantasy cursed relics.',
        tieredFloor: {
          enabled: true,
          startZ: -3.5,
          endZ: 9.5,
          numTiers: 10,
          stepHeight: 0.28,
          aisleXPositions: [-3.1, 3.1],
        },
        suggestedSpawnPoint: {
          x: -3.1,
          z: -5.4,
        },
        objects: [
          // --- THREE FRONT WALL HAUNTED ROYAL TAPESTRIES (PARALLEL-WORLD COUNTERPART OF PROJECTION SCREENS: LEFT, CENTER, RIGHT) ---
          {
            id: 'left_projection_screen',
            name: 'Left Sanctum Wall Royal Haunted Tapestry',
            type: 'projection_screen',
            x: -4.65,
            y: 3.45,
            z: -10.82,
            width: 3.8,
            height: 2.35,
            depth: 0.14,
            rotationY: 0,
            primaryColor: '#4E1217',
            secondaryColor: '#C9A24B',
            description:
              'Enormous tattered crimson-and-gold medieval royal tapestry suspended from a wrought-iron spear rod on the upper-left section of the front sanctum wall.',
          },
          {
            id: 'center_projection_screen',
            name: 'Center Grand Sanctum Royal Crest Tapestry',
            type: 'projection_screen',
            x: -0.35,
            y: 3.45,
            z: -10.82,
            width: 4.1,
            height: 2.45,
            depth: 0.14,
            rotationY: 0,
            primaryColor: '#5B1217',
            secondaryColor: '#C9A24B',
            description:
              'Primary grand woven heraldic tapestry bearing the gilded sacred crest, hanging above the ritual altar at the center of the front stone wall.',
          },
          {
            id: 'right_projection_screen',
            name: 'Right Sanctum Wall Royal Haunted Tapestry',
            type: 'projection_screen',
            x: 3.85,
            y: 3.45,
            z: -10.82,
            width: 3.7,
            height: 2.3,
            depth: 0.14,
            rotationY: 0,
            primaryColor: '#4E1217',
            secondaryColor: '#C9A24B',
            description:
              'Weathered royal crimson tapestry with gold filigree borders suspended on the upper-right section of the front sanctum wall.',
          },

          // --- FRONT STAGE CURSED RUNIC MONOLITH & RITUAL ALTAR LANDMARKS (Z = -10.9m to -6.0m, Floor Y = 0) ---
          {
            id: 'sliding_whiteboard_system',
            name: 'Cursed Runic Inscription Stone Monolith',
            type: 'whiteboard',
            x: -2.5,
            y: 0,
            z: -10.75,
            width: 4.6,
            height: 3.0,
            depth: 0.22,
            rotationY: 0,
            primaryColor: '#1E222B',
            secondaryColor: '#C9A24B',
            description:
              'Twin carved stone buttress pillars supporting a wide dark-slate runic inscription monolith etched with blood-crimson mathematical sigils and arcane prophecies.',
          },
          {
            id: 'stainless_av_console',
            name: 'Central Carved Dark-Oak & Stone Ritual Altar',
            type: 'av_console',
            x: 0.95,
            y: 0,
            z: -6.9,
            width: 2.15,
            height: 1.25,
            depth: 0.95,
            rotationY: 0,
            primaryColor: '#282D38',
            secondaryColor: '#1D120B',
            description:
              'Ancient Gothic ritual altar of carved dark oak and chiseled stone, crowned with twin wrought-iron Obsidian Scrying Mirrors, a brass astrolabe wedge, flickering altar candles, and the lower bronze alchemical cauldron.',
          },
          {
            id: 'presenter_side_table',
            name: "Alchemist's Carved Oak Side Writing Table & Grimoire",
            type: 'catering_table',
            x: -0.65,
            y: 0,
            z: -7.65,
            width: 1.4,
            height: 0.76,
            depth: 0.75,
            rotationY: 0,
            primaryColor: '#261810',
            secondaryColor: '#5B1217',
            description:
              'Ornate medieval scholar’s writing table with turned baluster legs and a crimson velvet runner positioned beside the central ritual altar.',
          },
          {
            id: 'front_right_exit_doors',
            name: 'Front Right Iron-Bound Fortress Double Exit Doors',
            type: 'double_door',
            x: 6.65,
            y: 0,
            z: -10.82,
            width: 1.95,
            height: 2.35,
            depth: 0.24,
            rotationY: 0,
            primaryColor: '#1D120B',
            secondaryColor: '#C9A24B',
            description:
              'Heavy medieval dark-oak fortress double doors bound with wrought-iron straps, iron studs, golden lion ring knockers, and a glowing four-digit Arcane Runic Lock Seal.',
          },

          // --- REAR TOP-TIER FORTRESS EXIT DOORS IN CARVED OAK GALLERY WALL (Z = +10.82m, Tier 10 Y = +2.80m) ---
          {
            id: 'rear_left_exit_doors',
            name: 'Upper Gallery Left Iron-Bound Fortress Doors',
            type: 'double_door',
            x: -3.1,
            y: 2.8,
            z: 10.82,
            width: 1.85,
            height: 2.25,
            depth: 0.22,
            rotationY: 180,
            primaryColor: '#1D120B',
            secondaryColor: '#C9A24B',
            description:
              'Upper gallery iron-bound oak fortress double doors set within the carved timber rear sanctum wall at the top of the left stepped aisle.',
          },
          {
            id: 'rear_right_exit_doors',
            name: 'Upper Gallery Right Iron-Bound Fortress Doors',
            type: 'double_door',
            x: 3.1,
            y: 2.8,
            z: 10.82,
            width: 1.85,
            height: 2.25,
            depth: 0.22,
            rotationY: 180,
            primaryColor: '#1D120B',
            secondaryColor: '#C9A24B',
            description:
              'Upper gallery iron-bound oak fortress double doors set within the carved timber rear sanctum wall at the top of the right stepped aisle.',
          },

          // --- ALL 10 STEPPED TIERS × 3 SEATING BANKS (30 Carved Cathedral Pew Banks, 210 Stalls Total) ---
          ...buildTieredLectureRows(),
        ],
      },
      DEFAULT_INVENTORY_DATA,
      DEFAULT_GAME_DATA
    ),
  },
];


