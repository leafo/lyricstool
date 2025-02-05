
// convert single text block of lyrics into an array of chunks
export function chunkLyrics(lyrics) {
  // Split into lines and filter empty lines
  const lines = lyrics.split('\n').filter(line => line.trim());
  const chunks = [];
  let currentChunk = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentChunk.push(line);

    // Start new chunk on these conditions:
    // - Current chunk has 2+ lines
    // - We're at a blank line
    // - We're at the last line
    if (
      currentChunk.length >= 2 || 
      (i < lines.length - 1 && lines[i + 1].trim() === '') ||
      i === lines.length - 1
    ) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
      }
    }
  }

  // Add any remaining lines
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n')); 
  }

  return chunks;
}


// "Hello World" -> "H____ W____"
export function hideWords(line, visibleLetters=1) {
  return line.replace(/\S+/g, word => {
    if (word.length <= visibleLetters) {
      return word;
    }
    return word.substring(0, visibleLetters) + '_'.repeat(word.length - visibleLetters);
  });
}

