/**
 * Text normalization for English, Arabic, and Hebrew.
 *
 * Goals:
 *  - case-insensitive matching
 *  - strip diacritics: Latin accents, Arabic harakat/tashkeel, Hebrew niqqud
 *  - fold Arabic letter variants (alef forms, ya, ta-marbuta, hamza carriers)
 *  - fold Hebrew final letters to their base form
 *  - fold Arabic-Indic / extended digits to ASCII
 *  - collapse extra whitespace and punctuation
 *
 * Everything downstream (tokenising, scoring, partial + fuzzy matching) runs on
 * the output of `normalizeText`, so a query typed in any of the three languages
 * — with or without vowel marks, spacing quirks, or letter variants — lines up
 * with the stored listing text.
 */

// Combining marks: Latin (U+0300–036F), Hebrew niqqud/te'amim (U+0591–05C7),
// Arabic harakat & superscript alef (U+0610–061A, U+064B–065F, U+0670, U+06D6–06ED).
const COMBINING_MARKS =
  /[̀-֑ͯ-ׇֽֿׁׂׅׄؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/g;

const TATWEEL = /ـ/g; // Arabic kashida (elongation), carries no meaning

// Arabic letter folding for matching.
const ARABIC_LETTER_MAP: Record<string, string> = {
  'أ': 'ا', // أ -> ا
  'إ': 'ا', // إ -> ا
  'آ': 'ا', // آ -> ا
  'ٱ': 'ا', // ٱ -> ا
  'ى': 'ي', // ى -> ي
  'ئ': 'ي', // ئ -> ي
  'ؤ': 'و', // ؤ -> و
  'ة': 'ه', // ة -> ه
};

// Hebrew final (sofit) letters folded to their base form.
const HEBREW_FINAL_MAP: Record<string, string> = {
  'ך': 'כ', // ך -> כ
  'ם': 'מ', // ם -> מ
  'ן': 'נ', // ן -> נ
  'ף': 'פ', // ף -> פ
  'ץ': 'צ', // ץ -> צ
};

// Arabic-Indic (U+0660–0669) and Extended Arabic-Indic (U+06F0–06F9) digits.
function foldDigit(ch: string): string | null {
  const code = ch.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return null;
}

// Keep Latin letters/digits, Arabic block (U+0600–06FF), Hebrew block
// (U+0590–05FF), and whitespace. Everything else becomes a space.
const KEEP = /[^0-9a-z؀-ۿ֐-׿\s]/g;

// Some JS engines may lack full Unicode NFKD. Arabic harakat and Hebrew niqqud
// are already standalone combining codepoints (stripped by the regex regardless),
// so a missing NFKD only degrades pre-composed Latin accents — never crashes.
const CAN_NORMALIZE = typeof String.prototype.normalize === 'function';

export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  // NFKD decomposes accented/presentation forms so marks can be stripped.
  const decomposed = CAN_NORMALIZE ? input.normalize('NFKD') : input;
  const s = decomposed.replace(COMBINING_MARKS, '').toLowerCase();

  let folded = '';
  for (const ch of s) {
    folded +=
      ARABIC_LETTER_MAP[ch] ?? HEBREW_FINAL_MAP[ch] ?? foldDigit(ch) ?? ch;
  }

  return folded
    .replace(TATWEEL, '')
    .replace(KEEP, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string | null | undefined): string[] {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  return normalized.split(' ').filter((t) => t.length > 0);
}

/**
 * Common English spelling variations / synonyms. Query tokens are expanded with
 * these so "mobile" finds "phone", "ps5" finds "playstation", etc. Kept small
 * and intentional; extend as needed.
 */
const SYNONYMS: Record<string, string[]> = {
  phone: ['mobile', 'cell', 'cellphone', 'smartphone'],
  mobile: ['phone', 'cellphone'],
  cell: ['phone', 'mobile'],
  tv: ['television'],
  television: ['tv'],
  laptop: ['notebook'],
  notebook: ['laptop'],
  headphones: ['earphones', 'earbuds', 'headset'],
  earbuds: ['headphones', 'earphones'],
  ps: ['playstation'],
  ps4: ['playstation'],
  ps5: ['playstation'],
  playstation: ['ps', 'ps4', 'ps5'],
  xbox: ['console'],
  fridge: ['refrigerator'],
  refrigerator: ['fridge'],
  bike: ['bicycle', 'cycle'],
  bicycle: ['bike', 'cycle'],
  couch: ['sofa'],
  sofa: ['couch'],
  kids: ['children', 'child'],
  children: ['kids', 'child'],
};

/**
 * Expand a set of query tokens with known synonyms. Returns a de-duplicated
 * list containing the originals plus any synonym forms.
 */
export function expandTokens(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const syn = SYNONYMS[t];
    if (syn) for (const s of syn) out.add(s);
  }
  return Array.from(out);
}

/**
 * Bounded Levenshtein distance: returns true when `a` and `b` are within
 * `max` edits. Used for typo tolerance on longer tokens. Early-exits to stay
 * cheap on the hot path.
 */
export function withinEditDistance(a: string, b: string, max: number): boolean {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return false;
  if (a === b) return true;

  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return false; // whole row already exceeds budget
    [prev, curr] = [curr, prev];
  }
  return prev[bl] <= max;
}
