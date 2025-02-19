/**
 * Utility for breaking text into manageable chunks while preserving context
 */

interface ChunkOptions {
  overlap?: number;
  preserveSentences?: boolean;
}

/**
 * Splits text into chunks of approximately the specified size while preserving sentence boundaries
 * @param text Text to split into chunks
 * @param maxChunkSize Maximum size of each chunk in characters
 * @param options Chunking options
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxChunkSize: number,
  options: ChunkOptions = {}
): string[] {
  const {
    overlap = 100,
    preserveSentences = true
  } = options;

  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length <= maxChunkSize) {
    return [cleanText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + maxChunkSize;
    
    if (preserveSentences && endIndex < cleanText.length) {
      // Find the next sentence boundary
      const nextSentence = cleanText.indexOf('.', endIndex);
      if (nextSentence !== -1 && nextSentence - endIndex < 100) {
        endIndex = nextSentence + 1;
      } else {
        // If no sentence boundary found, try to break at word boundary
        while (
          endIndex > startIndex &&
          cleanText[endIndex] !== ' ' &&
          cleanText[endIndex] !== '.'
        ) {
          endIndex--;
        }
      }
    }

    // Extract chunk
    const chunk = cleanText.slice(startIndex, endIndex).trim();
    chunks.push(chunk);

    // Move start index for next chunk, accounting for overlap
    startIndex = endIndex - overlap;
  }

  return chunks;
}

/**
 * Estimates the number of tokens in a text string
 * This is a rough estimate based on GPT tokenization rules
 * @param text Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // GPT models typically use ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Optimizes text chunks for token efficiency
 * @param chunks Array of text chunks
 * @param maxTokensPerChunk Maximum tokens per chunk
 * @returns Optimized chunks
 */
export function optimizeChunks(
  chunks: string[],
  maxTokensPerChunk: number
): string[] {
  return chunks.map(chunk => {
    const estimatedTokens = estimateTokenCount(chunk);
    if (estimatedTokens > maxTokensPerChunk) {
      // Recursively chunk if too large
      return chunkText(chunk, Math.floor(chunk.length * (maxTokensPerChunk / estimatedTokens)))[0];
    }
    return chunk;
  });
} 