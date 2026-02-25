/** Compress callsign to short form: first letter + last letter + number.
 *  FALCON01 → FN01,  TEXACO02 → TO02,  HAWK01 → HK01 */
export function shortCallsign(callsign: string): string {
  const match = callsign.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return callsign.slice(0, 4);
  const word = match[1].toUpperCase();
  const num = match[2];
  return word[0] + word[word.length - 1] + num;
}

/** Format fuel in lbs as a compact string: 142000 → "142k" */
export function formatFuelLbs(lbs: number): string {
  if (lbs >= 1000) return `${Math.round(lbs / 1000)}k`;
  return `${lbs}`;
}
