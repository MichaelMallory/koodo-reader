import { BookHelper } from "../../assets/lib/kookit-extra-browser.min";
import * as Kookit from "../../assets/lib/kookit.min";
import BookUtil from "../file/bookUtil";

export class SimpleTextExtractor {
  private hiddenContainer: HTMLDivElement | null = null;

  constructor() {
    // Create hidden container for EPUB rendering
    this.hiddenContainer = document.createElement('div');
    this.hiddenContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:800px;height:600px;';
    document.body.appendChild(this.hiddenContainer);
  }

  cleanup() {
    if (this.hiddenContainer?.parentNode) {
      this.hiddenContainer.parentNode.removeChild(this.hiddenContainer);
      this.hiddenContainer = null;
    }
  }

  async extractBookContent(book: any) {
    try {
      console.log('Fetching book data...', book.key);
      const bookData = await BookUtil.fetchBook(
        book.key,
        book.format.toLowerCase(),
        true,
        book.path
      );

      if (!bookData) {
        throw new Error('Failed to fetch book data');
      }

      console.log('Creating rendition...');
      const rendition = BookHelper.getRendtion(
        bookData,
        book.format,
        'speed',
        book.charset,
        '',
        false,
        false,
        Kookit
      );

      if (!rendition) {
        throw new Error('Failed to create rendition');
      }

      if (!this.hiddenContainer) {
        throw new Error('Hidden container not available');
      }

      console.log('Initializing rendition...');
      await rendition.renderTo(this.hiddenContainer);

      const bookContent = rendition.book;
      if (!bookContent || !bookContent.spine || !bookContent.spine.items) {
        throw new Error('Invalid book content structure');
      }

      // Extract chapters information
      const chapters = bookContent.spine.items.map((item: any, index: number) => ({
        index,
        title: `Chapter ${index + 1}`,
        href: item.href,
        content: null as string | null
      }));

      // Get chapter documents
      console.log('Getting chapter documents...');
      const chapterDocs = rendition.getChapterDoc();

      // Extract text content from each chapter
      for (let i = 0; i < chapters.length; i++) {
        if (chapterDocs[i]) {
          chapters[i].content = chapterDocs[i].textContent || '';
          console.log(`Chapter ${i + 1} content length:`, chapters[i].content.length);
        }
      }

      return {
        title: book.name,
        author: book.author,
        chapters: chapters.map(chapter => ({
          ...chapter,
          wordCount: chapter.content ? chapter.content.trim().split(/\s+/).length : 0
        }))
      };

    } catch (error) {
      console.error('Error extracting book content:', error);
      throw error;
    }
  }

  async getChapterText(book: any, chapterIndex: number): Promise<string[]> {
    try {
      const bookContent = await this.extractBookContent(book);
      const chapter = bookContent.chapters[chapterIndex];
      
      if (!chapter || !chapter.content) {
        throw new Error(`Chapter ${chapterIndex} not found or empty`);
      }

      // Split into words and clean up
      return chapter.content
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0);

    } catch (error) {
      console.error(`Error getting chapter ${chapterIndex} text:`, error);
      throw error;
    }
  }
} 