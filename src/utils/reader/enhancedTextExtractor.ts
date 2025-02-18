import epub from 'epubjs';
import * as pdfjs from 'pdfjs-dist';
import Book from '../../models/Book';
import { Chapter } from '../../models/Chapter';

pdfjs.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.js';

export class EnhancedTextExtractor {
  private chapters: Chapter[] = [];
  private currentChapterIndex: number = 0;

  async extractFromFile(file: File, book: Book): Promise<Chapter[]> {
    console.log('[TextExtractor] Starting extraction:', {
      fileName: book.name,
      fileSize: book.size,
      fileType: file.type,
      bookFormat: book.format.toUpperCase()
    });

    if (book.format.toLowerCase() === 'epub') {
      console.log('[TextExtractor] Processing EPUB file');
      return this.extractEpubContent(file);
    } else if (book.format.toLowerCase() === 'pdf') {
      console.log('[TextExtractor] Processing PDF file');
      return this.extractPdfContent(file);
    }
    throw new Error('Unsupported file format');
  }

  private async extractEpubContent(file: File): Promise<Chapter[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const startTime = Date.now();
      let timeout: NodeJS.Timeout | null = null;
      
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            console.error('[TextExtractor] FileReader failed: No result');
            reject(new Error('Failed to read file'));
            return;
          }

          const arrayBuffer = e.target.result as ArrayBuffer;
          console.log('[TextExtractor] FileReader loaded file:', {
            duration: Date.now() - startTime,
            dataSize: arrayBuffer.byteLength
          });

          try {
            console.log('[TextExtractor] Creating EPUB book object...');
            const book = epub(arrayBuffer);
            console.log('[TextExtractor] Created EPUB book object');

            console.log('[TextExtractor] Waiting for book to be ready...');
            await book.ready;
            console.log('[TextExtractor] EPUB book ready');
            
            console.log('[TextExtractor] Retrieving TOC...');
            const toc = await book.navigation.toc;
            console.log('[TextExtractor] Retrieved TOC:', {
              tocLength: toc.length,
              duration: Date.now() - startTime
            });
            
            const extractedChapters: Chapter[] = [];
            
            // Add timeout mechanism
            timeout = setTimeout(() => {
              console.error('[TextExtractor] Extraction timed out after 30 seconds');
              reject(new Error('EPUB extraction timed out after 30 seconds'));
            }, 30000);

            try {
              if (toc.length > 0) {
                for (let i = 0; i < toc.length; i++) {
                  const chapter = toc[i];
                  console.log(`[TextExtractor] Processing chapter ${i + 1}/${toc.length}:`, {
                    title: chapter.label,
                    href: chapter.href
                  });

                  const section = book.spine.get(chapter.href);
                  if (section) {
                    console.log(`[TextExtractor] Loading content for chapter ${i + 1}...`);
                    const content = await section.load();
                    const text = content.textContent.trim();
                    
                    extractedChapters.push({
                      title: chapter.label || `Chapter ${i + 1}`,
                      text: text,
                      wordCount: text.split(/\s+/).length
                    });

                    console.log(`[TextExtractor] Completed chapter ${i + 1}/${toc.length}:`, {
                      title: chapter.label,
                      wordCount: text.split(/\s+/).length,
                      duration: Date.now() - startTime
                    });
                  } else {
                    console.warn(`[TextExtractor] No section found for chapter ${i + 1}`);
                  }
                }
              }

              // If no chapters were found in TOC, try to extract content directly
              if (extractedChapters.length === 0) {
                console.log('[TextExtractor] No chapters found in TOC, trying spine items');
                
                const spineItems = book.spine.items || book.spine.spineItems;
                if (spineItems && spineItems.length > 0) {
                  console.log('[TextExtractor] Found spine items:', {
                    count: spineItems.length
                  });

                  for (let i = 0; i < spineItems.length; i++) {
                    console.log(`[TextExtractor] Processing spine item ${i + 1}/${spineItems.length}`);
                    
                    const section = book.spine.get(spineItems[i].href);
                    if (section) {
                      console.log(`[TextExtractor] Loading content for spine item ${i + 1}...`);
                      const content = await section.load();
                      const text = content.textContent.trim();
                      
                      extractedChapters.push({
                        title: `Chapter ${i + 1}`,
                        text: text,
                        wordCount: text.split(/\s+/).length
                      });

                      console.log(`[TextExtractor] Completed spine item ${i + 1}/${spineItems.length}:`, {
                        wordCount: text.split(/\s+/).length,
                        duration: Date.now() - startTime
                      });
                    } else {
                      console.warn(`[TextExtractor] No section found for spine item ${i + 1}`);
                    }
                  }
                } else {
                  console.log('[TextExtractor] No spine items found, using spine length');
                  const spineLength = book.spine.length;
                  
                  for (let i = 0; i < spineLength; i++) {
                    console.log(`[TextExtractor] Processing spine index ${i + 1}/${spineLength}`);
                    
                    const section = book.spine.get(`${i}`);
                    if (section) {
                      console.log(`[TextExtractor] Loading content for spine index ${i + 1}...`);
                      const content = await section.load();
                      const text = content.textContent.trim();
                      
                      extractedChapters.push({
                        title: `Chapter ${i + 1}`,
                        text: text,
                        wordCount: text.split(/\s+/).length
                      });

                      console.log(`[TextExtractor] Completed spine index ${i + 1}/${spineLength}:`, {
                        wordCount: text.split(/\s+/).length,
                        duration: Date.now() - startTime
                      });
                    } else {
                      console.warn(`[TextExtractor] No section found for spine index ${i + 1}`);
                    }
                  }
                }
              }

              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }

              console.log('[TextExtractor] Extraction complete:', {
                chapterCount: extractedChapters.length,
                totalDuration: Date.now() - startTime
              });

              this.chapters = extractedChapters;
              resolve(extractedChapters);
            } catch (error) {
              console.error('[TextExtractor] Error during chapter extraction:', error);
              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }
              reject(error);
            }
          } catch (error) {
            console.error('[TextExtractor] Error creating/loading EPUB:', error);
            reject(error);
          }
        } catch (error) {
          console.error('[TextExtractor] Error in FileReader onload:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('[TextExtractor] FileReader error:', error);
        reject(error);
      };

      console.log('[TextExtractor] Starting FileReader');
      reader.readAsArrayBuffer(file);
    });
  }

  private async extractPdfContent(_file: File): Promise<Chapter[]> {
    // PDF extraction implementation
    throw new Error('PDF extraction not implemented yet');
  }

  getChapterWords(chapterIndex: number): string[] {
    if (chapterIndex >= 0 && chapterIndex < this.chapters.length) {
      return this.chapters[chapterIndex].text.split(/\s+/).filter(word => word.length > 0);
    }
    return [];
  }

  getCurrentChapter(): Chapter | null {
    return this.chapters[this.currentChapterIndex] || null;
  }

  getChapterCount(): number {
    return this.chapters.length;
  }

  getTotalWordCount(): number {
    return this.chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
  }

  setCurrentChapter(index: number): boolean {
    if (index >= 0 && index < this.chapters.length) {
      this.currentChapterIndex = index;
      return true;
    }
    return false;
  }
} 