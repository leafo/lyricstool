
// convert single text block of lyrics into an array of chunks
export function chunkLyrics(lyrics, maxLines=2) {
  // Split into lines and filter empty lines
  const lines = lyrics.split('\n').map(line => line.trim());
  const chunks = [];
  let currentChunk = [];

  const pushChunk = () => {
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      currentChunk.push(line);
    }

    // close out the chunk if:
    // - we've reached the max lines
    // - there's a manual line break
    if (currentChunk.length >= maxLines || line === '') {
      pushChunk();
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
      }
    }
  }

  // add remaining lines
  pushChunk();

  return chunks;
}


// "Hello my lyrics' HERE" -> ["hello", "my", "lyrics'", "here"]
export function extractWords(chunk) {
  return chunk.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);
}


// "Hello World" -> "H____ W____"
export function hideWords(line, visibleLetters=1, visibleWords=0) {
  let wordsSeen = 0;
  return line.replace(/\S+/g, word => {
    wordsSeen++;
    if (wordsSeen <= visibleWords) {
      return word;
    }
    if (word.length <= visibleLetters) {
      return word;
    }
    return word.substring(0, visibleLetters) + '_'.repeat(word.length - visibleLetters);
  });
}

