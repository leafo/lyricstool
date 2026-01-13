export const normalizeWord = (word) => {
  return word.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

export const wordsMatch = (input, expected) => {
  const normalizedInput = input.trim().toLowerCase().replace(/[^\w\s]/g, '');

  // If expected word has apostrophe, treat it as a wildcard
  if (expected.includes("'")) {
    // Build regex pattern: apostrophe becomes .? (optional single char)
    const pattern = expected
      .trim()
      .toLowerCase()
      .replace(/[^\w\s']/g, '')  // Keep apostrophes for now
      .replace(/'/g, '.?');       // Replace apostrophe with optional single char

    const regex = new RegExp(`^${pattern}$`);
    return regex.test(normalizedInput);
  }

  // Default: exact match after normalization
  return normalizedInput === normalizeWord(expected);
};
