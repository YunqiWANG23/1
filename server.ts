import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { generateGame } from './gameGenerator';
import { verifyAndFix, BROKEN_GAME } from './verifier';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Allow payloads for photos/video as base64 (up to 60mb)
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const roomAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    roomType: {
      type: Type.STRING,
      description: "Type of room, e.g., 'Modern Living Room', 'Scandinavian Bedroom', 'Minimalist Home Office', 'Studio Apartment'",
    },
    roomWidth: {
      type: Type.NUMBER,
      description: "True architectural room width in meters along X axis. For standard rooms: 5m-9m; for audit rooms, conference halls, auditoriums, or grand halls: 12m to 28m+. Always preserve the true expansive scale seen in the photograph.",
    },
    roomLength: {
      type: Type.NUMBER,
      description: "True architectural room length in meters along Z axis. For standard rooms: 6m-10m; for audit rooms, auditoriums, and halls: 14m to 35m+.",
    },
    roomHeight: {
      type: Type.NUMBER,
      description: "True architectural ceiling height in meters. Standard domestic ceilings are 2.8m-3.2m, BUT audit rooms, auditoriums, lecture halls, vaulted council chambers, and high-ceiling commercial spaces typically have high ceilings of 4.5m to 8.5m+. If the photo shows an audit room or high-ceiling space, you MUST output a tall ceiling (e.g. 5.5m - 8.0m) to preserve realistic volume.",
    },
    wallColor: {
      type: Type.STRING,
      description: "Dominant wall hex color matching the photo (e.g., '#EAE6DF', '#3A4245', '#F5F5F0')",
    },
    floorType: {
      type: Type.STRING,
      description: "Floor material type: must be one of 'hardwood', 'tiles', 'carpet', or 'concrete'",
    },
    floorColor: {
      type: Type.STRING,
      description: "Dominant floor hex color (e.g., '#8C6747', '#4A3B32', '#C8C2BA')",
    },
    ceilingColor: {
      type: Type.STRING,
      description: "Ceiling hex color (e.g., '#FAF9F6')",
    },
    lightingMood: {
      type: Type.STRING,
      description: "Atmosphere mood: must be one of 'warm_cozy', 'daylight_bright', 'evening_ambient', or 'golden_hour'",
    },
    lightIntensity: {
      type: Type.NUMBER,
      description: "Lighting intensity factor from 0.8 to 1.8",
    },
    keyLightColor: {
      type: Type.STRING,
      description: "Hex color of main key light / sunlight (e.g., '#FFF7ED', '#FFFBEB', '#FFE4B5')",
    },
    ambientLightColor: {
      type: Type.STRING,
      description: "Hex color of ambient fill light (e.g., '#E0E7FF', '#E2E8F0', '#F1F5F9')",
    },
    architecturalNotes: {
      type: Type.STRING,
      description: "Brief 1-2 sentence description of notable architectural features, mood, and aesthetic of the room",
    },
    tieredFloor: {
      type: Type.OBJECT,
      description: "Include this when the room is a tiered lecture theatre, stepped auditorium, or stadium classroom so the floor rises in solid steps under each row of seats (preventing floating rear chairs).",
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "True if the room has stepped/tiered seating rows that rise toward the back of the room.",
        },
        startZ: {
          type: Type.NUMBER,
          description: "Z coordinate where the first step riser begins (e.g., -3.5).",
        },
        endZ: {
          type: Type.NUMBER,
          description: "Z coordinate where the top tier ends near the back wall (e.g., 9.5).",
        },
        numTiers: {
          type: Type.NUMBER,
          description: "Number of stepped tiers from front to back (e.g., 8 to 12).",
        },
        stepHeight: {
          type: Type.NUMBER,
          description: "Vertical height increase per tier step in meters (e.g., 0.26 to 0.30).",
        },
        aisleXPositions: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: "X positions of longitudinal stepped stair aisles (e.g., [-3.1, 3.1]).",
        },
      },
      required: ["enabled", "startZ", "endZ", "numTiers", "stepHeight"],
    },
    suggestedSpawnPoint: {
      type: Type.OBJECT,
      properties: {
        x: {
          type: Type.NUMBER,
          description: "Clear walkable X position in meters relative to room center (0 is center, between -width/2 + 1 and width/2 - 1)",
        },
        z: {
          type: Type.NUMBER,
          description: "Clear walkable Z position in meters relative to room center (between -length/2 + 1 and length/2 - 1)",
        },
      },
      required: ["x", "z"],
    },
    objects: {
      type: Type.ARRAY,
      description: "All prominent pieces of furniture, tiered lecture rows, AV consoles, screens, whiteboards, banners, doors, and props identified in the image",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: {
            type: Type.STRING,
            description: "Friendly name of the object, e.g. 'Tier 3 Center Seating Bank', 'Curved Stainless AV Console', 'Pull-Up Event Banner'",
          },
          type: {
            type: Type.STRING,
            description: "Category: 'lecture_row', 'av_console', 'projection_screen', 'whiteboard', 'rollup_banner', 'catering_table', 'beverage_crates', 'double_door', 'sofa', 'couch', 'bed', 'desk', 'table', 'chair', 'armchair', 'throne', 'bookshelf', 'wardrobe', 'cabinet', 'tv_stand', 'coffee_table', 'nightstand', 'plant', 'floor_lamp', 'lamp', 'rug', 'wall_art', 'banner', 'window', 'door', 'pillar', 'chandelier', 'podium', 'brazier', 'fireplace', 'piano', 'armor', 'statue', 'clock', 'chest', 'generic'",
          },
          x: {
            type: Type.NUMBER,
            description: "X coordinate in meters relative to center of the room (-roomWidth/2 to roomWidth/2)",
          },
          y: {
            type: Type.NUMBER,
            description: "Y coordinate in meters above floor. For tiered lecture rows, matches the stepped tier elevation; 0 for front stage furniture; >0 for wall-mounted projection screens or wall art.",
          },
          z: {
            type: Type.NUMBER,
            description: "Z coordinate in meters relative to center of the room (-roomLength/2 to roomLength/2)",
          },
          width: {
            type: Type.NUMBER,
            description: "Width dimension in meters along X axis (e.g., lecture_row: 3.6 to 5.2, av_console: 2.1, rollup_banner: 0.88)",
          },
          height: {
            type: Type.NUMBER,
            description: "Height dimension in meters along Y axis (e.g., lecture_row: 0.86, av_console: 1.25, rollup_banner: 2.08)",
          },
          depth: {
            type: Type.NUMBER,
            description: "Depth dimension in meters along Z axis (e.g., lecture_row: 0.92, av_console: 0.95)",
          },
          rotationY: {
            type: Type.NUMBER,
            description: "Rotation around vertical Y axis in degrees (0 for lecture_row facing the front stage at -Z, 0 for stage walls facing +Z)",
          },
          primaryColor: {
            type: Type.STRING,
            description: "Main surface hex color matching the photo (e.g., '#1E63B8' for blue lecture seats, '#94A3B8' for brushed steel AV console)",
          },
          secondaryColor: {
            type: Type.STRING,
            description: "Accent or desk surface hex color (e.g., '#F1F5F9', '#1E293B')",
          },
          seatCount: {
            type: Type.NUMBER,
            description: "Number of seats in this row bank if type is 'lecture_row' (e.g., 6 to 9)",
          },
          description: {
            type: Type.STRING,
            description: "Detailed visual characteristics observed in the photo and its role in the space",
          },
        },
        required: ["id", "name", "type", "x", "y", "z", "width", "height", "depth", "rotationY", "primaryColor"],
      },
    },
  },
  required: [
    "roomType",
    "roomWidth",
    "roomLength",
    "roomHeight",
    "wallColor",
    "floorType",
    "floorColor",
    "ceilingColor",
    "lightingMood",
    "lightIntensity",
    "keyLightColor",
    "ambientLightColor",
    "architecturalNotes",
    "suggestedSpawnPoint",
    "objects",
  ],
};

// API Endpoint to analyze room image
app.post('/api/analyze-room', async (req, res) => {
  try {
    const rawImages: Array<{ imageBase64: string; mimeType?: string }> = [];
    if (Array.isArray(req.body.images) && req.body.images.length > 0) {
      rawImages.push(...req.body.images);
    } else if (req.body.imageBase64) {
      rawImages.push({
        imageBase64: req.body.imageBase64,
        mimeType: req.body.mimeType || 'image/jpeg',
      });
    }

    if (rawImages.length === 0) {
      return res.status(400).json({ error: 'At least one image (images array or imageBase64) is required.' });
    }

    const imageParts = rawImages.map((img) => {
      const cleanBase64 = img.imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      return {
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      };
    });

    const inventoryContext = req.body.inventoryData
      ? `\n\nAUTHORITATIVE INVENTORY OBJECTS (inventory.json):\n${JSON.stringify(req.body.inventoryData, null, 2)}`
      : '';
    const gameContext = req.body.gameData
      ? `\n\nAUTHORITATIVE ESCAPE-ROOM PUZZLES (game.json):\n${JSON.stringify(req.body.gameData, null, 2)}`
      : '';

    const systemPrompt = `You are a master 3D spatial computing architect and dark-fantasy environmental artist (inspired by The Legend of Zelda: Breath of the Wild Hyrule Castle Sanctum and Gothic Haunted Fortresses).
You have been provided with ${rawImages.length} photograph(s) of a real-world indoor environment.

Your task:
Perform an EXHAUSTIVE, HIGH-PRECISION visual inspection of the photograph(s) and reconstruct every visible architectural element, stepped floor tier, furniture group, and prop into a unified **Medieval Gothic Haunted Parallel World** 3D scene blueprint matching the real room's TRUE PHYSICAL PROPORTIONS and SPATIAL LAYOUT.

CRITICAL RULES FOR PARALLEL-WORLD RECONSTRUCTION & TIERED HALLS:
1. Parallel-World Spatial & Identity Preservation:
   - Preserve the real room's exact dimensions, stepped floor tiers, walkable aisles, and relative positions of all furniture and props.
   - Reinterpret the room's surface palette and object names/descriptions as their Medieval Gothic Haunted Castle counterparts:
     * Modern walls -> Weathered Gothic ashlar stone walls ('#282C35') with dark carved oak wainscoting
     * Modern ceiling -> Vaulted stone & heavy dark-timber ceiling ('#14171F')
     * Tiered lecture rows ('lecture_row') -> Carved dark-oak cathedral choir pews & scriptorium benches with royal crimson velvet cushions ('#7A1C24' / '#2C1B12')
     * AV podium ('av_console') -> Ancient carved oak & stone ritual altar with twin obsidian scrying mirrors
     * Projection screens ('projection_screen') -> Enormous haunted royal tapestries hung on iron spear rods (Left, Center, Right)
     * Sliding whiteboard ('whiteboard') -> Cursed runic inscription stone monolith
     * Pull-up banner ('rollup_banner') -> Tattered medieval heraldic war standard on iron pike
     * Exit double doors ('double_door') -> Heavy iron-bound medieval fortress double doors with stone archway
2. Tiered Lecture Theatres & Stepped Sanctums (NEVER FLOAT REAR CHAIRS!):
   - If the photo shows a tiered lecture theatre or stepped classroom (阶梯教室) where rows of seats rise toward the back:
     * You MUST set tieredFloor.enabled = true, with startZ (e.g. -3.5), endZ (e.g. 9.5), numTiers (e.g. 8 to 10), stepHeight (e.g. 0.28), and aisleXPositions (e.g. [-3.1, 3.1]).
     * Use type: 'lecture_row' for each bank of pews/benches on each tier (e.g. Left Bank, Center Bank, Right Bank per tier), setting rotationY: 0 so seats face forward toward the front stage (-Z).
3. Authoritative Inventory & Escape-Room Puzzle Target Preservation (SPOILER PROTECTION):
   - Preserve exact object IDs from inventory.objects (especially mandatory puzzle targets in game.puzzles[].target: 'red_whiteboard_marker', 'haribo_tub_top', 'paper_plates_stack', 'pepsi_max_multipack').
   - Give every object a Medieval Gothic parallel-world display name and description so the real-world object name is NOT spoiled in the 3D UI, while placing it on its exact real-world supporting surface (altar top, floor in front of altar, or right front-row scriptorium desk).
4. True Architectural Scale & High Ceilings (NEVER COMPRESS LARGE ROOMS):
   - For LECTURE THEATRES, AUDIT ROOMS, AUDITORIUMS, or GREAT HALLS:
     * roomHeight: 5.5m to 7.5m+.
     * roomWidth: 14.0m to 24.0m+.
     * roomLength: 18.0m to 30.0m+.
5. Multi-Angle Spatial Triangulation:
   - Cross-reference all uploaded photos so objects seen from different angles are unified without duplication at their exact (x, y, z) coordinates.${inventoryContext}${gameContext}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          ...imageParts,
          {
            text: systemPrompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: roomAnalysisSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    const sceneData = JSON.parse(text);
    return res.json({ success: true, sceneData });
  } catch (error: any) {
    console.error('Error analyzing room photo with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze room photo with Gemini.',
      details: error?.status || 'INTERNAL_ERROR',
    });
  }
});

const objectVerificationSchema = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      description:
        "Must be exactly one of: 'match', 'no_match', or 'uncertain'. Return 'match' ONLY when the photographed real-world object matches the expected object category and visual features. Return 'uncertain' if the image is blurry, too dark, obstructed, or ambiguous. Return 'no_match' if it is a different object or no object is shown.",
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score between 0.0 and 1.0.',
    },
    observedObject: {
      type: Type.STRING,
      description:
        'Brief neutral description of what object is visible in the webcam capture (without spoiling the expected target if it does not match).',
    },
    explanation: {
      type: Type.STRING,
      description:
        "Concise 1-2 sentence player-facing feedback. CRITICAL: When verdict is 'no_match' or 'uncertain', NEVER reveal or mention the expected target object's name, ID, or specific identity. Only explain what was seen in the camera frame and why it does not fulfill the clue or why a clearer view is needed.",
    },
  },
  required: ['verdict', 'confidence', 'observedObject', 'explanation'],
};

// API Endpoint to verify a real-world object captured via webcam using Gemini Vision
app.post('/api/verify-object', async (req, res) => {
  try {
    const { imageBase64, mimeType, expectedObject, puzzleClue } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        error: 'A captured webcam image (imageBase64) is required for verification.',
      });
    }

    if (!expectedObject || !expectedObject.id || !expectedObject.name) {
      return res.status(400).json({
        error: 'Expected inventory object specification is required.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `You are the impartial visual judge for a live-action + 3D hybrid escape room ("The Phantom Lecture of Imperial Hall").
The player is attempting to solve a riddle by holding a real-world physical object up to their webcam.

EXPECTED TARGET OBJECT (Confidential — DO NOT reveal this in your explanation if the player shows the wrong item):
- Object ID: "${expectedObject.id}"
- Category / Name: "${expectedObject.name}"
- Expected Color / Visual Attributes: "${expectedObject.color || 'standard'}"
- Real-Room Context: "${expectedObject.location || 'lecture theatre'}"
${puzzleClue ? `- Riddle Clue Shown to Player: "${puzzleClue}"` : ''}

EVALUATION RULES:
1. Inspect the webcam photograph carefully.
2. Evaluate whether the main object held up or shown by the player matches the expected target object ("${expectedObject.name}", color/features: "${expectedObject.color}").
   - Allow reasonable real-world lighting variations, webcam color shifts, or equivalent everyday instances of the same object category and visual profile (for example, a red-and-white whiteboard marker pen, a blue/green Haribo candy tub, a stack of white paper plates, or a black-and-blue Pepsi Max multipack/can).
   - If the object clearly matches the expected category and visual attributes, set verdict to "match".
   - If the image is too blurry, too dark, cut off, or you cannot tell with confidence what the object is, set verdict to "uncertain".
   - If the image shows an empty room/person with no object, or a completely different object that does not match the target, set verdict to "no_match".
3. SPOILER PROTECTION (CRITICAL):
   - If verdict is "no_match" or "uncertain", your "explanation" and "observedObject" MUST NOT mention "${expectedObject.name}" or "${expectedObject.id}"! Never tell the player what object they were supposed to show. Instead, describe what you actually see in their photo and tell them it does not match the riddle's vessel/artifact, or ask them to hold the item closer in better light.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: objectVerificationSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty verification response.');
    }

    const parsed = JSON.parse(text);
    const normalizedVerdict: 'match' | 'no_match' | 'uncertain' =
      parsed.verdict === 'match'
        ? 'match'
        : parsed.verdict === 'uncertain'
        ? 'uncertain'
        : 'no_match';

    let safeExplanation = String(parsed.explanation || '');
    // Extra server-side spoiler guard if verdict is not a match
    if (normalizedVerdict !== 'match') {
      const escapedName = String(expectedObject.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedId = String(expectedObject.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escapedName.length > 2) {
        safeExplanation = safeExplanation.replace(new RegExp(escapedName, 'gi'), 'the required artifact');
      }
      if (escapedId.length > 2) {
        safeExplanation = safeExplanation.replace(new RegExp(escapedId, 'gi'), 'the required artifact');
      }
    }

    return res.json({
      success: true,
      result: {
        verdict: normalizedVerdict,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        observedObject: String(parsed.observedObject || 'Unidentified object'),
        explanation: safeExplanation,
      },
    });
  } catch (error: any) {
    console.error('Error verifying object with Gemini Vision:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to verify object with Gemini Vision.',
      details: error?.status || 'INTERNAL_ERROR',
    });
  }
});

// Stage 1: Generate Escape Game (inventory, usable_objects, rejected_objects, game, rule_check)
app.post('/api/generate-game', async (req, res) => {
  try {
    const result = await generateGame(req.body);
    res.json(result);
  } catch (e: any) {
    console.error('Error in /api/generate-game:', e);
    res.status(500).json({ error: e.message || 'Failed to generate game' });
  }
});

// Stage 2: Verify & Auto-Fix Escape Game (Rule check + 3 AI Playtesters + Auto-fix loop)
app.post('/api/verify', async (req, res) => {
  try {
    res.json(
      await verifyAndFix(req.body.game, req.body.usable_objects, {
        mock: req.body.mock,
      })
    );
  } catch (e: any) {
    console.error('Error in /api/verify:', e);
    res.status(500).json({ error: e.message || 'Failed to verify game' });
  }
});

// Planted broken demo level for Stage 2 Verifier demonstration
app.get('/api/broken-game', (_req, res) => res.json(BROKEN_GAME));

// Stage 4: Short-lived ephemeral token for browser Live API session (API key stays on server)
app.post('/api/live-token', async (_req, res) => {
  try {
    const liveAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
    const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const token = await liveAi.authTokens.create({
      config: {
        uses: 1,
        expireTime: expire,
        newSessionExpireTime: expire,
        httpOptions: {
          apiVersion: 'v1alpha',
          headers: { 'User-Agent': 'aistudio-build' },
        },
      },
    });
    res.json({ token: token.name });
  } catch (e: any) {
    console.error('Error in /api/live-token:', e);
    res.status(500).json({ error: e.message });
  }
});

// Mount Vite or serve static files
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Room2World] Server running at http://0.0.0.0:${PORT} in ${isDev ? 'development' : 'production'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
