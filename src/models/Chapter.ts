export interface Chapter {
  index: number;
  title: string;
  text: string;
  words: string[];
  wordCount?: number; // Making this optional since we can calculate it from words
} 