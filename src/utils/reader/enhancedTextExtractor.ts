import epub from 'epubjs';
import * as pdfjs from 'pdfjs-dist';
import Book from '../../models/Book';
import { Chapter } from '../../models/Chapter';
import localforage from 'localforage';

pdfjs.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.js';

interface EPUBContent {
  textContent: string;
  toString(): string;
  documentElement?: Element;
}

async function inspectStorage() {
  console.log('[Storage Inspector] Scanning storage...');
  
  // Get all keys
  const keys = await localforage.keys();
  console.log('[Storage Inspector] Found keys:', keys);
  
  // Inspect each stored item
  for (const key of keys) {
    try {
      const content = await localforage.getItem<ArrayBuffer>(key);
      if (content) {
        console.log(`[Storage Inspector] Item: ${key}`, {
          size: content.byteLength,
          isEPUB: new Uint8Array(content).slice(0, 4).every((byte, i) => [0x50, 0x4B, 0x03, 0x04][i] === byte),
          preview: new TextDecoder().decode(content.slice(0, 200)).replace(/[^\x20-\x7E]/g, '')
        });
      }
    } catch (error) {
      console.warn(`[Storage Inspector] Failed to inspect key ${key}:`, error);
    }
  }
}

export class EnhancedTextExtractor {
  private chapters: Chapter[] = [];
  private currentChapterIndex: number = 0;

  constructor() {
    this.chapters = [];
    this.currentChapterIndex = 0;
    // Run storage inspection on initialization
    inspectStorage().catch(console.error);
  }

  async extractFromFile(file: File, book: Book, signal?: AbortSignal): Promise<Chapter[]> {
    console.log('[TextExtractor] Starting extraction:', {
      fileName: book.name,
      fileSize: book.size,
      fileType: file.type,
      bookFormat: book.format.toUpperCase()
    });

    if (book.format.toLowerCase() === 'epub') {
      console.log('[TextExtractor] Processing EPUB file');
      // Get the stored book content
      const storedContent = await localforage.getItem<ArrayBuffer>(book.key);
      
      // Add detailed storage inspection
      console.log('[TextExtractor] Storage Information:', {
        storageType: localforage.driver(),
        databaseName: localforage.config().name,
        storageSize: storedContent?.byteLength,
        // Check if it's a valid EPUB
        isValidEPUB: storedContent ? 
          new Uint8Array(storedContent).slice(0, 4).every((byte, i) => [0x50, 0x4B, 0x03, 0x04][i] === byte) : 
          false,
        // Try to peek at text content
        textPreview: storedContent ? 
          new TextDecoder().decode(storedContent.slice(0, 1000)).replace(/[^\x20-\x7E]/g, '') : 
          null
      });
      
      // Add detailed logging for stored content
      console.log('[TextExtractor] Retrieved stored content:', {
        hasContent: !!storedContent,
        contentSize: storedContent?.byteLength,
        bookKey: book.key,
        // Log first few bytes to check for corruption
        contentPreview: storedContent ? Array.from(new Uint8Array(storedContent).slice(0, 20)) : null,
        // Check for ZIP/EPUB signature (PK..)
        hasValidSignature: storedContent ? 
          new Uint8Array(storedContent).slice(0, 2).every((byte, i) => [0x50, 0x4B][i] === byte) : 
          false
      });

      if (!storedContent) {
        throw new Error('No stored content found for book');
      }
      
      // Create a File object from the stored content
      const bookFile = new File([storedContent], book.name, {
        type: 'application/epub+zip'
      });
      
      // Verify file creation
      console.log('[TextExtractor] Created File object:', {
        fileName: bookFile.name,
        fileSize: bookFile.size,
        fileType: bookFile.type,
        lastModified: new Date(bookFile.lastModified).toISOString()
      });
      
      return this.extractEpubContent(bookFile, signal);
    } else if (book.format.toLowerCase() === 'pdf') {
      console.log('[TextExtractor] Processing PDF file');
      return this.extractPdfContent(file);
    }
    throw new Error('Unsupported file format');
  }

  private async extractEpubContent(file: File, signal?: AbortSignal): Promise<Chapter[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const startTime = Date.now();
      let timeout: NodeJS.Timeout | null = null;
      
      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          console.log('[TextExtractor] Extraction aborted');
          reader.abort();
          if (timeout) {
            clearTimeout(timeout);
          }
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
      
      reader.onload = async (e) => {
        try {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }

          if (!e.target?.result) {
            console.error('[TextExtractor] FileReader failed: No result');
            reject(new Error('Failed to read file'));
            return;
          }

          const arrayBuffer = e.target.result as ArrayBuffer;
          console.log('[TextExtractor] FileReader loaded file:', {
            duration: Date.now() - startTime,
            dataSize: arrayBuffer.byteLength,
            fileSize: file.size,
            isPartial: arrayBuffer.byteLength !== file.size
          });

          try {
            console.log('[TextExtractor] Creating EPUB book object...');
            const book = epub(arrayBuffer);
            console.log('[TextExtractor] Created EPUB book object');

            console.log('[TextExtractor] Waiting for book to be ready...');
            await book.ready;
            
            if (signal?.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }

            console.log('[TextExtractor] EPUB book ready, inspecting contents:', {
              hasSpine: !!book.spine,
              hasNavigation: !!book.navigation,
              spineLength: book.spine?.length
            });
            
            console.log('[TextExtractor] Retrieving TOC...');
            const toc = await book.navigation.toc;
            
            if (signal?.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }

            console.log('[TextExtractor] Retrieved TOC:', {
              tocLength: toc.length,
              duration: Date.now() - startTime,
              tocItems: toc.map(item => ({
                label: item.label,
                href: item.href
              }))
            });
            
            const extractedChapters: Chapter[] = [];
            
            // Add timeout mechanism
            timeout = setTimeout(() => {
              console.error('[TextExtractor] Extraction timed out after 30 seconds');
              reject(new Error('EPUB extraction timed out after 30 seconds'));
            }, 30000);

            try {
              // Extract all chapters
              console.log('[TextExtractor] Starting extraction of all chapters');
              
              // Instead of using TOC, directly use spine items for content
              const spineItems = book.spine.items || book.spine.spineItems;
              console.log('[TextExtractor] Using spine items:', {
                itemCount: spineItems?.length,
                firstItem: spineItems?.[0]
              });
              
              if (spineItems && spineItems.length > 0) {
                for (let i = 0; i < spineItems.length; i++) {
                  if (signal?.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                    return;
                  }

                  try {
                    const section = book.spine.get(spineItems[i].href);
                    if (section) {
                      console.log(`[TextExtractor] Processing spine item ${i + 1}/${spineItems.length}`);
                      
                      try {
                        // Add detailed logging for content loading
                        console.log(`[TextExtractor] Pre-load validation for ${spineItems[i].href}:`, {
                          sectionType: typeof section,
                          hasLoadMethod: typeof section.load === 'function',
                          spineItemProperties: Object.keys(spineItems[i])
                        });

                        // Load the section content
                        console.log(`[TextExtractor] Loading content for ${spineItems[i].href}`);

                        // Add DOM environment check
                        console.log('[TextExtractor] DOM Environment Check:', {
                          hasWindow: typeof window !== 'undefined',
                          hasDocument: typeof document !== 'undefined',
                          hasDOMParser: typeof DOMParser !== 'undefined',
                          hasQuerySelector: typeof document?.querySelector === 'function',
                          documentElement: document?.documentElement ? {
                            namespaceURI: document.documentElement.namespaceURI,
                            nodeName: document.documentElement.nodeName
                          } : null
                        });

                        // Get the base URL for resources
                        const baseUrl = new URL('/', window.location.href).href;
                        console.log('[TextExtractor] Base URL:', baseUrl);

                        // First try to get the raw content
                        let content;
                        try {
                          // Construct absolute URL for the spine item
                          const itemUrl = new URL(spineItems[i].href, baseUrl).href;
                          console.log('[TextExtractor] Loading content from:', itemUrl);
                          
                          const response = await fetch(itemUrl);
                          const rawXml = await response.text();
                          
                          console.log('[TextExtractor] Raw content retrieved:', {
                            href: spineItems[i].href,
                            contentLength: rawXml.length,
                            preview: rawXml.slice(0, 100)
                          });
                          
                          // Create a new parser and parse the content
                          const parser = new DOMParser();
                          const xmlDoc = parser.parseFromString(rawXml, 'application/xhtml+xml');
                          
                          // Check for parsing errors
                          const parseError = xmlDoc.querySelector('parsererror');
                          if (parseError) {
                            console.warn('[TextExtractor] XML parsing failed:', parseError.textContent);
                            // Try loading through section as fallback
                            content = await section.load();
                          } else {
                            // Create a proper document with base URL for resource resolution
                            const doc = parser.parseFromString(
                              `<?xml version="1.0" encoding="UTF-8"?>
                              <!DOCTYPE html>
                              <html xmlns="http://www.w3.org/1999/xhtml">
                                <head>
                                  <base href="${baseUrl}" />
                                  ${xmlDoc.head?.innerHTML || ''}
                                </head>
                                <body>
                                  ${xmlDoc.body?.innerHTML || xmlDoc.documentElement.innerHTML}
                                </body>
                              </html>`,
                              'application/xhtml+xml'
                            );
                            
                            content = {
                              textContent: doc.documentElement.textContent || '',
                              toString: () => doc.documentElement.outerHTML,
                              documentElement: doc.documentElement
                            } as EPUBContent;
                            
                            console.log('[TextExtractor] Successfully created document with base URL');
                          }
                        } catch (error) {
                          console.warn('[TextExtractor] Direct content fetch failed, falling back to section.load():', error);
                          content = await section.load();
                        }

                        // Add parsing attempt logging
                        if (content && typeof content === 'object') {
                          console.log('[TextExtractor] Content Parse Inspection:', {
                            prototype: Object.getPrototypeOf(content),
                            constructorName: content.constructor?.name,
                            hasToString: typeof content.toString === 'function',
                            stringified: content.toString?.() || 'no toString available',
                            ownKeys: Object.getOwnPropertyNames(content),
                            symbols: Object.getOwnPropertySymbols(content)
                          });
                        }

                        // Add detailed XML validation logging
                        if (typeof content === 'string') {
                          const xmlContent = content as string;
                          console.log(`[TextExtractor] Analyzing XML content for ${spineItems[i].href}:`, {
                            contentLength: xmlContent.length,
                            // Check for common XML issues
                            hasXMLDeclaration: xmlContent.includes('<?xml'),
                            hasDoctype: xmlContent.includes('<!DOCTYPE'),
                            hasNamespaces: xmlContent.includes('xmlns'),
                            // Look for potential malformation indicators
                            unpairedTags: (xmlContent.match(/<[^/>][^>]*>/g) || []).length - 
                                          (xmlContent.match(/<\/[^>]+>/g) || []).length,
                            malformedClosings: (xmlContent.match(/[^<]\/>/g) || []).length,
                            // Preview around line 44 (where error occurs)
                            lineFortyFour: xmlContent.split('\n')[43]?.slice(0, 100),
                            surroundingLines: xmlContent.split('\n').slice(42, 45)
                          });
                        }

                        // Add detailed content inspection
                        console.log(`[TextExtractor] Content loaded for ${spineItems[i].href}:`, {
                          contentType: typeof content,
                          isNull: content === null,
                          isUndefined: content === undefined,
                          hasDocumentElement: content && typeof content === 'object' && 'documentElement' in content,
                          hasBody: content && typeof content === 'object' && 'body' in content,
                          contentKeys: content && typeof content === 'object' ? Object.keys(content) : [],
                          rawContent: typeof content === 'string' ? (content as string).slice(0, 200) : 'non-string content'
                        });

                        if (!content) {
                          console.warn(`[TextExtractor] No content loaded for spine item ${i + 1}`);
                          continue;
                        }
                        
                        // Get the text content
                        let text = '';
                        if (typeof content === 'string') {
                          text = content;
                        } else if (typeof content === 'object') {
                          const contentObj = content as { 
                            documentElement?: { textContent?: string },
                            body?: { textContent?: string },
                            textContent?: string 
                          };
                          
                          // Try different ways to get text content
                          if (contentObj.documentElement?.textContent) {
                            text = contentObj.documentElement.textContent;
                          } else if (contentObj.body?.textContent) {
                            text = contentObj.body.textContent;
                          } else if (contentObj.textContent) {
                            text = contentObj.textContent;
                          }
                        }
                        
                        console.log(`[TextExtractor] Raw content from spine item ${i + 1}:`, {
                          textLength: text.length,
                          preview: text.slice(0, 100)
                        });
                        
                        if (text && !text.includes('parsererror')) {
                          const cleanedText = this.cleanText(text);
                          const words = this.processWords(cleanedText);
                          
                          if (words.length > 0) {
                            // Only add if we got meaningful content
                            extractedChapters.push({
                              index: i,
                              title: spineItems[i].href.split('/').pop()?.replace('.xhtml', '') || `Chapter ${i + 1}`,
                              text: cleanedText,
                              words
                            });
                            
                            console.log(`[TextExtractor] Successfully extracted spine item ${i + 1}:`, {
                              wordCount: words.length,
                              firstWords: words.slice(0, 5),
                              lastWords: words.slice(-5)
                            });
                          } else {
                            console.log(`[TextExtractor] No meaningful content in spine item ${i + 1}`);
                          }
                        } else {
                          console.log(`[TextExtractor] Skipping spine item ${i + 1} - invalid content`);
                        }
                      } catch (error) {
                        console.warn(`[TextExtractor] Error processing spine item ${i + 1}, skipping:`, error);
                        continue;
                      }
                    }
                  } catch (error) {
                    console.warn(`[TextExtractor] Error processing spine item ${i + 1}, skipping:`, error);
                    continue;
                  }
                }
              }

              if (extractedChapters.length === 0) {
                throw new Error('No chapters could be extracted from the EPUB');
              }

              console.log('[TextExtractor] Completed chapter extraction:', {
                totalChapters: extractedChapters.length,
                totalWords: extractedChapters.reduce((sum, ch) => sum + ch.words.length, 0),
                duration: Date.now() - startTime
              });

              // Clear timeout since we're done
              if (timeout) {
                clearTimeout(timeout);
              }

              // Store chapters in class property and resolve
              this.chapters = extractedChapters;
              resolve(extractedChapters);

            } catch (error) {
              console.error('[TextExtractor] Error during chapter extraction:', error);
              reject(error);
            }
          } catch (error) {
            console.error('[TextExtractor] Error processing EPUB:', error);
            reject(error);
          }
        } catch (error) {
          console.error('[TextExtractor] Error reading file:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('[TextExtractor] FileReader error:', error);
        reject(error);
      };

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
    return this.chapters.reduce((total, chapter) => total + chapter.words.length, 0);
  }

  setCurrentChapter(index: number): boolean {
    if (index >= 0 && index < this.chapters.length) {
      this.currentChapterIndex = index;
      return true;
    }
    return false;
  }

  private cleanText(text: string): string {
    if (!text) return '';
    
    // Remove XML/HTML entities
    let cleaned = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#?\w+;/g, ' ');
    
    // Remove XML/HTML tags
    cleaned = cleaned
      .replace(/<(style|script|xml|parsererror)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    
    // Clean up whitespace and special characters
    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  }

  private processWords(text: string): string[] {
    if (!text) return [];
    
    return text
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => {
        if (!word || word.length === 0) return false;
        if (/^[.,!?;:"'()[\]{}]+$/.test(word)) return false;
        return true;
      })
      .map(word => word.replace(/^[.,!?;:"'()[\]{}]+|[.,!?;:"'()[\]{}]+$/g, ''))
      .filter(word => word.length > 0);
  }
} 