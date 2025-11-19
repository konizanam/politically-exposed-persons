// Enhanced similarity: combines Levenshtein and token set ratio (for out-of-order/partial matches)
function levenshtein(a, b) {
  if (!a || !b) return 0;
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  if (a === b) return 100;
  const matrix = [];
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 100 : Math.round((1 - distance / maxLen) * 100);
}

// Token set ratio: handles out-of-order and partial matches (like fuzzywuzzy)
function tokenSetRatio(a, b) {
  if (!a || !b) return 0;
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  if (a === b) return 100;
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const diffA = new Set([...setA].filter(x => !setB.has(x)));
  const diffB = new Set([...setB].filter(x => !setA.has(x)));
  // Join sets for Levenshtein
  const sortedIntersection = [...intersection].sort().join(' ');
  const sortedA = [...intersection, ...diffA].sort().join(' ');
  const sortedB = [...intersection, ...diffB].sort().join(' ');
  // Score intersection vs. each
  const ratio1 = levenshtein(sortedIntersection, sortedA);
  const ratio2 = levenshtein(sortedIntersection, sortedB);
  const ratio3 = levenshtein(sortedA, sortedB);
  return Math.max(ratio1, ratio2, ratio3);
}

// Main similarity: combine Levenshtein and tokenSetRatio
export function similarity(a, b) {
  if (!a || !b) return 0;
  const aNorm = a.trim().toLowerCase();
  const bNorm = b.trim().toLowerCase();
  // If perfect match, always return 100
  if (aNorm === bNorm) return 100;
  // If one is a substring of the other, return 95 (very high, but not perfect)
  if (aNorm && bNorm && (aNorm.includes(bNorm) || bNorm.includes(aNorm))) return 95;
  // If last names match exactly, boost score
  const aLast = aNorm.split(' ').slice(-1)[0];
  const bLast = bNorm.split(' ').slice(-1)[0];
  let boost = 0;
  if (aLast && bLast && aLast === bLast) boost = 10;
  const lev = levenshtein(a, b);
  const token = tokenSetRatio(a, b);
  // Weighted: token set is more important for out-of-order
  let score = Math.round(0.4 * lev + 0.6 * token + boost);
  // Clamp to 0-100
  if (score > 100) score = 100;
  if (score < 0) score = 0;
  return score;
}
