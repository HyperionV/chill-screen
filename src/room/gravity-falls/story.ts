import { PLACES, type PlaceId } from './types';

/**
 * Every word of the slow mystery: the notebook pages, the coded notes and the small messages.
 * All text is original and uses only the pixel font's characters (letters, digits, space and . , - : ! ? ' ( ) & / + * [ ]).
 */

/** Dipper's notebook, one page per place, in the order the places are visited. Each is at most 150 characters. */
export const JOURNAL: Readonly<Record<PlaceId, string>> = {
  shack: 'Someone chalked a tiny eye on the stove. Stan says a customer did it. Customers are not that neat.',
  woods: 'The gnomes keep a ledger of missing socks. The last page points at a hill above the shack. Why would a sock thief want a hill?',
  town: 'The water tower hums at 3 in the morning. A number again: 4-1-9. I wrote it down.',
  lake: 'Something very big circles under the dock in a figure like the number 419. It is guarding something, or it is lonely.',
  hidden: 'Every mark points to one hill. There is a round door under the roots. It opens for whoever found every symbol. To be continued.',
};

/** The plain text of each coded note: 14 to 28 characters, capital letters, digits and spaces only (the cipher moves letters only). */
export const NOTES: Readonly<Record<PlaceId, string>> = {
  shack: 'LOOK UP AT THE ROOF',
  woods: 'COUNT EVERY SOCK',
  town: 'LISTEN FOR THE HUM',
  lake: 'CIRCLE 419 TIMES',
  hidden: 'FIVE MARKS OPEN IT',
};

/** How far the note cipher moves each letter along the alphabet. */
export const SHIFT = 3;

const LETTER_COUNT = 26;
const CODE_A = 65;
const CODE_Z = 90;

/** Moves every capital letter `by` places along the alphabet (wrapping round); digits, spaces and anything else stay put. */
function shiftLetters(text: string, by: number): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < CODE_A || code > CODE_Z) {
      out += ch;
      continue;
    }
    const moved = (((code - CODE_A + by) % LETTER_COUNT) + LETTER_COUNT) % LETTER_COUNT;
    out += String.fromCharCode(CODE_A + moved);
  }
  return out;
}

/** Plain capital-letter text to its coded form. */
export function encode(plain: string): string {
  return shiftLetters(plain, SHIFT);
}

/** The coded form back to plain text. */
export function decode(coded: string): string {
  return shiftLetters(coded, -SHIFT);
}

export const MSG_NOTE_TITLE = 'SECRET NOTE';
export const MSG_SCURRIED = 'SOMETHING SCURRIED OFF';
export const MSG_DOOR_LOCKED = "IT WON'T BUDGE";
export const MSG_DOOR_OPENS = 'THE DOOR OPENS. TO BE CONTINUED...';

/** The toast shown when a symbol is found, e.g. SYMBOL 2 OF 5 FOUND. */
export function msgSymbolFound(found: number): string {
  return `SYMBOL ${found} OF ${PLACES.length} FOUND`;
}

/** The heading of a journal card, e.g. JOURNAL PAGE 3. */
export function msgPageTitle(place: PlaceId): string {
  return `JOURNAL PAGE ${PLACES.indexOf(place) + 1}`;
}
