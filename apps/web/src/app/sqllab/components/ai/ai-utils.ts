/**
 * @file ai-utils.ts
 * @description Utility functions for AI components, such as content cleaning and metadata extraction.
 */

/**
 * Logic to extract confidence score and clean content from AI responses.
 * Scans for <confidence> tags or uses provided metadata.
 * 
 * @param content - Raw message content
 * @param msgConfidence - Explicit confidence score if available
 * @returns Object containing the cleaned text and the numeric score (1-5)
 */
export const extractConfidence = (content: string, msgConfidence?: number) => {
  // If it's an error message, AI confidence is logically Zero
  if (content.startsWith("AI Error:") || content.startsWith("Error:")) {
    return { score: 0, cleaned: content };
  }

  // If we have a direct confidence score from the Agent, use it
  if (msgConfidence !== undefined) {
    return { score: msgConfidence, cleaned: content };
  }

  const match = content.match(/<confidence>([1-5])<\/confidence>/i);
  const score = match ? parseInt(match[1]) : 4; // Default to 4 if not found
  const cleaned = content.replace(/<confidence>[1-5]<\/confidence>/gi, "").trim();
  return { score, cleaned };
};
