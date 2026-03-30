'use strict';

const natural = require('natural');

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function tokens(text) {
  return norm(text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Region → language ─────────────────────────────────────────────────────────

const LANG = { hu: 'hu', us: 'en', uk: 'en', de: 'de' };

/**
 * Suffixes that turn a noun into a modifier (adjective / case form).
 *
 * When the search term only appears with one of these suffixes (and NOT
 * in its base form), the product is ABOUT something else — it's merely
 * flavored/made-with the search term.
 *
 * Example (HU):
 *   "pirospaprika"  → base noun → the product IS paprika
 *   "pirospaprikás" → adjective (-s) → the product is paprika-FLAVORED
 *   "pirospaprikával" → instrumental (-val) → "with paprika"
 */
const MODIFIER_SUFFIXES = {
  hu: [
    's', 'os', 'es', 'as',      // adjective  (-s / -os / -es / -ös / -as)
    'val', 'vel',                // instrumental  ("with")
    'bol', 'bel',                // elative       ("from / out of")
    'ban', 'ben',                // inessive      ("in")
    'nak', 'nek',                // dative        ("for")
    'ra', 're',                  // sublative     ("onto")
    'hoz', 'hez',                // allative      ("to")
    'ul',                        // translative   ("as")
  ],
  en: [
    'flavored', 'flavoured', 'infused', 'seasoned',
    'style', 'based', 'coated',
  ],
  de: ['geschmack', 'haltig'],
};

/**
 * Space-separated words that indicate a modifier relationship.
 *
 * Unlike MODIFIER_SUFFIXES (which are attached), these are standalone words
 * that follow the search term with a space in between.
 *
 * Example (HU):  "csirke ízű" = chicken-flavored
 * Example (EN):  "chicken flavored"
 */
const SPACED_MODIFIER_WORDS = {
  hu: ['izu', 'izesitesu', 'izesitett', 'izesitessel', 'izzel', 'stilusu'],
  en: ['flavored', 'flavoured', 'infused', 'seasoned', 'style', 'based', 'coated'],
  de: ['geschmack', 'haltig'],
};

/**
 * Words that indicate a product is NOT a grocery item.
 *
 * Checked as substrings of the full normalized product name.
 * If any match, the product is auto-rejected (score → 0.02).
 */
const NON_GROCERY_WORDS = [
  // HU cosmetics / body care
  'testapolo', 'tusfurdo', 'habfurdo', 'kremszappan',
  // HU household
  'legfrissito',
  // HU pet food (compound words & inflected forms)
  'macskaeledel', 'kutyaeledel', 'macskatap', 'kutyatap',
  'allateledel', 'kutyaknak', 'macskaknak',
  // EN
  'cat food', 'dog food', 'pet food',
  'body lotion', 'body wash', 'air freshener',
  // DE
  'katzenfutter', 'hundefutter', 'tierfutter',
];

/**
 * Words that indicate a processed / compound food category.
 *
 * Checked as SUBSTRINGS against each name token so compound words
 * like "sertésmájkrém" (containing "krem") are caught.
 */
const PROCESSED_WORDS = [
  // Hungarian (all accent-stripped — matching happens after NFD normalization)
  'krem', 'pastetom', 'szosz', 'pizza', 'leves', 'salata',
  'chips', 'keksz', 'kenyer', 'teszta', 'sutemeny', 'croissant',
  'torta', 'pite', 'konzerv', 'befott', 'toltott', 'rolad',
  'hamburger', 'szendvics', 'wrap', 'stangli', 'grissini',
  'ontet', 'muszli', 'mulesli', 'galuska', 'savanyusag',
  'ketchup', 'passzirozot', 'suritett', 'pure', 'darabolt',
  'festek', 'rantott', 'apritott', 'poritott',
  'csokolade', 'ostya', 'bonbon', 'snack',
  // English
  'soup', 'sauce', 'pizza', 'salad', 'cracker', 'chips',
  'noodle', 'bread', 'pasta', 'pastry', 'ramen', 'spread',
  'dressing', 'cereal', 'granola', 'cookie', 'muffin',
  'puree', 'concentrate', 'canned', 'dried',
  // German
  'suppe', 'sosse', 'nudel', 'brot', 'kuchen', 'mark',
];

// ── Scoring engine ────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLD = 0.30;

/**
 * Score how relevant a scraped product name is to the original search term.
 *
 * Returns 0.0 – 1.0.
 *
 * Signals (in order):
 *   1. Exact / prefix match
 *   2. Modifier-suffix detection  (HU adjective / "with X" / "from X")
 *   3. Substring match with position bonus
 *   4. Compound-word root overlap  ("fűszerpaprika" ↔ "pirospaprika")
 *   5. Dice-coefficient fallback
 *   6. Penalties: processed-food words, split-compound mismatch
 */
function scoreRelevance(productName, searchTerm, regionId = 'us') {
  const nName = norm(productName);
  const nTerm = norm(searchTerm);
  if (!nName || !nTerm) return 0;

  const nameToks = tokens(productName);
  const termToks = tokens(searchTerm);
  if (nameToks.length === 0 || termToks.length === 0) return 0;

  // ── 0. Non-grocery rejection (cosmetics, pet food, etc.) ───────────
  if (NON_GROCERY_WORDS.some(w => nName.includes(w))) return 0.02;

  // ── 1. Exact / prefix ──────────────────────────────────────────────────
  if (nName === nTerm) return 1.0;

  // ── 2. Modifier detection ──────────────────────────────────────────────
  const lang = LANG[regionId] || 'en';
  const suffixes = (MODIFIER_SUFFIXES[lang] || []).map(s => norm(s));

  // For English/German, modifier words are space-separated ("chicken flavored").
  // Check before awarding the prefix bonus so we don't skip the analysis.
  const spacedMods = (SPACED_MODIFIER_WORDS[lang] || []).map(s => norm(s));

  let prefixIsClean = false;
  if (nName.startsWith(nTerm + ' ')) {
    const rest = nName.substring(nTerm.length + 1);
    const nextWord = rest.split(/\s+/)[0];
    prefixIsClean = !suffixes.includes(nextWord) && !spacedMods.includes(nextWord);
  }

  if (prefixIsClean) return 0.95;

  let onlyModifier = false;
  let hasBase = false;

  if (nName.includes(nTerm)) {
    const idx = nName.indexOf(nTerm);
    const after = nName.substring(idx + nTerm.length);
    const before = nName.substring(0, idx);
    // Is the search term part of a larger compound word (no space before/after)?
    const insideCompound = (idx > 0 && !/\s/.test(before[before.length - 1]))
                        || (after.length > 0 && !/[\s,;]/.test(after[0]));

    // Attached suffix (HU: pirospaprikás, pirospaprikával)
    const directModifier = suffixes.some(s =>
      after.startsWith(s) && (after.length === s.length || /[\s,;]/.test(after[s.length]))
    );

    // Compound-word continuation: term is the first part of a bigger word
    // e.g. "paradicsom" → "paradicsompüré", "tojás" → "tojásfesték"
    let compoundContinuation = false;
    if (!directModifier && insideCompound && after.length > 0 && !/\s/.test(after[0])) {
      // The remainder (after the term inside the compound) matches a processed word
      const rest = after.replace(/^[^a-z]+/, '');
      if (rest.length >= 3) {
        compoundContinuation = PROCESSED_WORDS.some(pw => rest.startsWith(pw) || pw.startsWith(rest));
      }
    }

    // Space-separated modifier word (all langs: "chicken flavored", "csirke ízű")
    let spacedModifier = false;
    if (!directModifier && !compoundContinuation && after.startsWith(' ')) {
      const nextWord = after.trimStart().split(/\s+/)[0];
      spacedModifier = spacedMods.includes(nextWord);
    }

    if (directModifier || compoundContinuation) {
      onlyModifier = true;
      // Check whether the BASE form also appears as a standalone word ELSEWHERE
      const re = new RegExp('(^|\\s)' + esc(nTerm) + '(\\s|$)');
      hasBase = re.test(nName);
    } else if (spacedModifier) {
      onlyModifier = true;
      hasBase = false;
    } else if (insideCompound) {
      // Term is a prefix/suffix of a compound but remainder isn't processed/modifier.
      // Only trust compound-PREFIX matches (HU: csirke→csirkemell).
      // Reject accidental mid-word hits (só inside paradicsom).
      const isCompoundPrefix = (idx === 0 || /\s/.test(nName[idx - 1]));
      if (isCompoundPrefix) {
        const re = new RegExp('(^|\\s)' + esc(nTerm) + '(\\s|$)');
        hasBase = re.test(nName);
        if (!hasBase) {
          // The only occurrence is inside a compound word — moderate match
          hasBase = true;
        }
      }
      // Mid-word matches: hasBase stays false → falls to root/dice
    } else {
      hasBase = true;
    }
  } else {
    // Term not found as substring — check if a modifier form exists
    for (const s of suffixes) {
      if (nName.includes(nTerm + s)) { onlyModifier = true; break; }
    }
  }

  // (English) "with X" pattern
  if (lang === 'en' && !hasBase && !onlyModifier) {
    const withRe = new RegExp('\\bwith\\s+' + esc(nTerm) + '\\b');
    if (withRe.test(nName)) onlyModifier = true;
  }

  // ── Multi-word: all search words present but not adjacent ────────────
  // E.g. "tengeri só" → "tengeri finom só" (extra word between search words)
  if (termToks.length >= 2 && !hasBase && !onlyModifier) {
    let baseWords = 0;
    let modWords = 0;

    for (const tw of termToks) {
      if (nameToks.some(nw => nw === tw)) {
        baseWords++;
      } else if (nameToks.some(nw =>
        nw.startsWith(tw) && nw.length > tw.length &&
        suffixes.some(s => nw === tw + s)
      )) {
        modWords++;
      }
    }

    if (baseWords + modWords === termToks.length) {
      if (modWords === 0) {
        hasBase = true;
      } else {
        onlyModifier = true;
      }
    }
  }

  // ── 3. Base score ──────────────────────────────────────────────────────
  let base = 0;

  if (hasBase && !onlyModifier) {
    // Clean substring — score by position (earlier = better)
    const pos = nName.indexOf(nTerm);
    base = 0.70 + 0.15 * (1 - pos / nName.length);

  } else if (onlyModifier && !hasBase) {
    // Only modifier form → very low
    base = 0.15;

  } else {
    // No exact substring → compound-word root overlap
    // E.g. "fűszerpaprika" shares root "paprika" with "pirospaprika"
    let bestLen = 0;
    let matchedTok = null;
    for (let len = nTerm.length; len >= 4; len--) {
      const tail = nTerm.substring(nTerm.length - len);
      for (const tok of nameToks) {
        if (tok.endsWith(tail) || (tok.length >= tail.length && tok.includes(tail))) {
          bestLen = len;
          matchedTok = tok;
          break;
        }
      }
      if (bestLen > 0) break;
    }

    const bestRatio = bestLen / nTerm.length;

    if (bestRatio >= 0.45 && matchedTok) {
      // Check whether the root in the matched token is itself modified
      const root = nTerm.substring(nTerm.length - bestLen);
      const afterRoot = matchedTok.substring(matchedTok.indexOf(root) + root.length);
      const rootModified = afterRoot.length > 0 &&
        suffixes.some(s => afterRoot === s || afterRoot.startsWith(s));

      base = rootModified ? 0.15 : (0.35 + 0.30 * bestRatio);
    } else {
      // Fallback: Dice coefficient
      base = natural.DiceCoefficient(nTerm, nName.substring(0, 40)) * 0.40;
    }
  }

  if (base < 0.05) return 0;

  // ── 4. Penalties ───────────────────────────────────────────────────────
  let score = base;

  // 4a. Processed-food penalty
  const termIsProcessed = termToks.some(tw =>
    PROCESSED_WORDS.some(pw => tw.length >= pw.length && tw.includes(pw))
  );
  if (!termIsProcessed) {
    const nameHasProcessed = nameToks.some(nw =>
      PROCESSED_WORDS.some(pw => nw.length >= pw.length && nw.includes(pw))
    );
    if (nameHasProcessed) score *= 0.35;
  }

  // 4b. Split-compound mismatch (HU): "pirospaprika" (compound) vs
  //     "piros paprika" (two words) can mean different things
  if (lang === 'hu' && !nTerm.includes(' ') && nTerm.length >= 8) {
    for (let i = 3; i < nTerm.length - 3; i++) {
      const left = nTerm.substring(0, i);
      const right = nTerm.substring(i);
      if (nName.includes(left + ' ' + right)) {
        score *= 0.55;
        break;
      }
    }
  }

  return Math.min(1, Math.max(0, parseFloat(score.toFixed(3))));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Filter scraped items, keeping only those genuinely relevant to the search term.
 *
 * @param {Array<{name:string}>} items       Scraped product objects
 * @param {string}               searchTerm  Original search query
 * @param {string}               regionId    e.g. 'hu', 'us'
 * @param {number}               [threshold] Minimum score to keep (default 0.30)
 * @returns {Array} Items that passed the relevance gate
 */
function filterRelevantProducts(items, searchTerm, regionId = 'us', threshold = DEFAULT_THRESHOLD) {
  const kept = [];
  const dropped = [];

  for (const item of items) {
    const s = scoreRelevance(item.name, searchTerm, regionId);
    if (s >= threshold) {
      kept.push(item);
    } else {
      dropped.push({ name: item.name, score: s });
    }
  }

  if (dropped.length > 0) {
    console.log(`🧠 [Relevance] Kept ${kept.length}/${items.length} for "${searchTerm}":`);
    for (const d of dropped) {
      console.log(`   🚫 "${d.name}" (score: ${d.score.toFixed(2)})`);
    }
  } else if (items.length > 0) {
    console.log(`🧠 [Relevance] All ${items.length} items relevant for "${searchTerm}"`);
  }

  return kept;
}

module.exports = { scoreRelevance, filterRelevantProducts, DEFAULT_THRESHOLD };
