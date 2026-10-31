import {
  EscapePuzzleItem,
  GeminiVerificationResult,
  InventoryObjectItem,
  VerificationVerdict,
} from '../types/scene';

export interface VerifyObjectRequest {
  puzzle: EscapePuzzleItem;
  expectedObject: InventoryObjectItem;
  imageBase64: string;
  mimeType?: string;
}

/**
 * Calls the server-side Gemini Vision verification endpoint (`/api/verify-object`)
 * to evaluate whether the webcam photograph matches the puzzle's target object in `inventory.objects`.
 */
export async function verifyObjectWithGemini({
  puzzle,
  expectedObject,
  imageBase64,
  mimeType = 'image/jpeg',
}: VerifyObjectRequest): Promise<GeminiVerificationResult> {
  const response = await fetch('/api/verify-object', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      puzzleId: puzzle.id,
      targetId: puzzle.target,
      puzzleClue: puzzle.clue,
      expectedObject,
      imageBase64,
      mimeType,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data?.result) {
    throw new Error(data?.error || 'Failed to verify the captured image with Gemini Vision.');
  }

  return data.result as GeminiVerificationResult;
}

/**
 * Developer-only test simulator that produces a deterministic verification result
 * (`match`, `no_match`, or `uncertain`) without making a network request to Gemini.
 */
export function simulateVerificationResult(
  verdict: VerificationVerdict,
  expectedObject?: InventoryObjectItem
): GeminiVerificationResult {
  if (verdict === 'match') {
    return {
      verdict: 'match',
      confidence: 0.99,
      observedObject: expectedObject
        ? `${expectedObject.name} (${expectedObject.color})`
        : 'Verified target artifact',
      explanation:
        'The spectral lens recognizes the physical artifact and confirms its shape and colors match the riddle!',
    };
  }

  if (verdict === 'uncertain') {
    return {
      verdict: 'uncertain',
      confidence: 0.42,
      observedObject: 'Partially obscured or dimly lit object',
      explanation:
        'The image is too shadowy or ambiguous to confirm the vessel. Hold the item steady in clearer light and try again.',
    };
  }

  return {
    verdict: 'no_match',
    confidence: 0.91,
    observedObject: 'Unrelated item in frame',
    explanation:
      'The object held before the camera does not match the riddle’s description. Re-read the clue and inspect the room carefully.',
  };
}
