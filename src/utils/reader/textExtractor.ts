import Book from "../../models/Book";
import HtmlBook from "../../models/HtmlBook";

export interface ChapterContent {
  chapterIndex: number;
  title: string;
  words: string[];
  totalWords: number;
}

export interface ReadingProgress {
  chapterIndex: number;
  wordIndex: number;
  totalProgress: number;
}

export class SpeedReaderExtractor {
  protected cache: Map<string, ChapterContent[]> = new Map();

  constructor() {
    console.log('[SpeedReader:Extractor] Initialized');
  }

  async extractSingleChapter(book: Book, htmlBook: HtmlBook | null, chapterIndex: number): Promise<ChapterContent> {
    console.log('[SpeedReader:Extractor] Starting extraction:', {
      bookKey: book.key,
      bookName: book.name,
      chapterIndex,
      hasHtmlBook: !!htmlBook,
      hasRendition: !!htmlBook?.rendition,
      renditionState: htmlBook?.rendition ? {
        hasChapterDoc: !!htmlBook.rendition.getChapterDoc,
        hasSpine: !!htmlBook.rendition.spine,
        hasBook: !!htmlBook.rendition.book
      } : null
    });

    if (!htmlBook || !htmlBook.rendition) {
      console.error('[SpeedReader:Extractor] Missing book or rendition:', {
        hasHtmlBook: !!htmlBook,
        renditionState: htmlBook ? {
          isNull: htmlBook.rendition === null,
          isUndefined: htmlBook.rendition === undefined
        } : 'htmlBook is null'
      });
      throw new Error("Book not properly loaded");
    }

    try {
      const rendition = htmlBook.rendition;
      console.log('[SpeedReader:Extractor] Rendition check:', {
        hasChapterDoc: !!rendition.getChapterDoc,
        spine: rendition.spine ? {
          items: rendition.spine.items?.length,
          position: rendition.spine.position
        } : null
      });
      
      // Get chapter documents
      console.log('[SpeedReader:Extractor] Fetching chapter docs...');
      const chapterDocs = rendition.getChapterDoc();
      console.log('[SpeedReader:Extractor] Chapter docs retrieved:', {
        totalChapters: chapterDocs.length,
        requestedIndex: chapterIndex,
        hasRequestedChapter: !!chapterDocs[chapterIndex],
        chapterTypes: chapterDocs.map(doc => doc?.constructor?.name || 'unknown').slice(0, 3)
      });

      if (!chapterDocs[chapterIndex]) {
        console.error('[SpeedReader:Extractor] Chapter not found:', {
          index: chapterIndex,
          totalChapters: chapterDocs.length
        });
        throw new Error(`Chapter ${chapterIndex} not found`);
      }

      const doc = chapterDocs[chapterIndex];
      console.log('[SpeedReader:Extractor] Chapter document inspection:', {
        type: doc?.constructor?.name,
        hasTextContent: !!doc.textContent,
        hasInnerText: !!doc.innerText,
        nodeType: doc.nodeType,
        childNodes: doc.childNodes?.length
      });

      const title = htmlBook.flattenChapters[chapterIndex]?.label || `Chapter ${chapterIndex + 1}`;
      console.log('[SpeedReader:Extractor] Chapter metadata:', {
        title,
        hasContent: !!doc.textContent,
        contentLength: doc.textContent?.length || 0,
        flattenChaptersLength: htmlBook.flattenChapters?.length
      });

      // Extract text content
      const rawText = doc.textContent || doc.innerText || "";
      console.log('[SpeedReader:Extractor] Raw text retrieved:', {
        length: rawText.length,
        preview: rawText.slice(0, 50)
      });

      const text = this.cleanText(rawText);
      console.log('[SpeedReader:Extractor] Text cleaned:', {
        originalLength: rawText.length,
        cleanedLength: text.length
      });

      const words = this.processIntoWords(text);
      console.log('[SpeedReader:Extractor] Words processed:', {
        wordCount: words.length,
        firstFewWords: words.slice(0, 5),
        lastFewWords: words.slice(-5)
      });

      if (words.length === 0) {
        console.error('[SpeedReader:Extractor] No words found:', {
          textLength: text.length,
          rawTextLength: rawText.length
        });
        throw new Error("No words found in chapter");
      }

      const result = {
        chapterIndex,
        title,
        words,
        totalWords: words.length
      };

      console.log('[SpeedReader:Extractor] Chapter extraction complete:', {
        title,
        wordCount: words.length,
        textLength: text.length
      });

      return result;

    } catch (error) {
      console.error("[SpeedReader:Extractor] Extraction failed:", {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        chapterIndex,
        bookKey: book.key
      });
      throw error;
    }
  }

  async getChapterWordStream(book: Book, htmlBook: HtmlBook | null, chapterIndex: number) {
    console.log('[SpeedReader:Extractor] Stream request:', {
      bookKey: book.key,
      bookName: book.name,
      chapterIndex,
      hasHtmlBook: !!htmlBook,
      hasRendition: !!htmlBook?.rendition
    });
    
    try {
      console.log('[SpeedReader:Extractor] Starting chapter extraction for stream');
      const chapter = await this.extractSingleChapter(book, htmlBook, chapterIndex);
      
      console.log('[SpeedReader:Extractor] Stream preparation complete:', {
        chapterTitle: chapter.title,
        wordCount: chapter.words.length,
        firstWord: chapter.words[0],
        lastWord: chapter.words[chapter.words.length - 1]
      });

      const stream = {
        words: chapter.words,
        totalWords: chapter.totalWords,
        title: chapter.title,
        getProgress: (wordIndex: number): ReadingProgress => {
          const progress = wordIndex / chapter.totalWords;
          console.log('[SpeedReader:Extractor] Progress update:', {
            wordIndex,
            totalWords: chapter.totalWords,
            progress: progress.toFixed(2)
          });
          return {
            chapterIndex,
            wordIndex,
            totalProgress: progress
          };
        }
      };

      console.log('[SpeedReader:Extractor] Stream ready:', {
        title: chapter.title,
        totalWords: chapter.totalWords,
        hasProgressTracker: !!stream.getProgress
      });

      return stream;
    } catch (error) {
      console.error('[SpeedReader:Extractor] Stream creation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        chapterIndex,
        bookKey: book.key
      });
      throw error;
    }
  }

  private processIntoWords(text: string): string[] {
    const words = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => this.cleanWord(word));
    return words;
  }

  private cleanWord(word: string): string {
    return word
      .replace(/["""]/g, '"')  // Normalize quotes
      .replace(/['']/g, "'")   // Normalize apostrophes
      .trim();
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
} 