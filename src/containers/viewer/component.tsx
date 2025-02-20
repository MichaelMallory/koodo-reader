import React from "react";
import { ViewerProps, ViewerState as IViewerState, WordWithPause } from "./interface";
import { withRouter } from "react-router-dom";
import BookUtil from "../../utils/file/bookUtil";
import PopupMenu from "../../components/popups/popupMenu";
import Background from "../../components/background";
import toast from "react-hot-toast";
import StyleUtil from "../../utils/reader/styleUtil";
import "./index.css";
import { HtmlMouseEvent } from "../../utils/reader/mouseEvent";
import ImageViewer from "../../components/imageViewer";
import { getIframeDoc } from "../../utils/reader/docUtil";
import PopupBox from "../../components/popups/popupBox";
import Note from "../../models/Note";
import PageWidget from "../pageWidget";
import { getPageWidth, scrollContents } from "../../utils/common";
import _ from "underscore";
import {
  BookHelper,
  ConfigService,
} from "../../assets/lib/kookit-extra-browser.min";
import * as Kookit from "../../assets/lib/kookit.min";
import SpeedReader from "../../components/speedReader/component";
import WordOverlay from "../../components/wordOverlay/component";
import MatrixSpeedReader from "../../components/matrixSpeedReader";
import MatrixToggleButton from "../../components/matrixSpeedReader/toggleButton";
declare var window: any;
let lock = false; //prevent from clicking too fasts

class Viewer extends React.Component<ViewerProps, IViewerState> {
  lock: boolean;
  handleCurrentChapter: (currentChapter: string) => void;
  handleCurrentChapterIndex: (currentChapterIndex: number) => void;

  constructor(props: ViewerProps) {
    super(props);
    this.state = {
      cfiRange: null,
      contents: null,
      rect: null,
      key: "",
      isFirst: true,
      scale: ConfigService.getReaderConfig("scale") || 1,
      chapterTitle: ConfigService.getObjectConfig(
        this.props.currentBook.key,
        "recordLocation",
        {}
      ).chapterTitle || "",
      isDisablePopup: ConfigService.getReaderConfig("isDisablePopup") === "yes",
      isTouch: ConfigService.getReaderConfig("isTouch") === "yes",
      margin: parseInt(ConfigService.getReaderConfig("margin")) || 0,
      chapterDocIndex: parseInt(
        ConfigService.getObjectConfig(
          this.props.currentBook.key,
          "recordLocation",
          {}
        ).chapterDocIndex || 0
      ),
      pageOffset: "",
      pageWidth: "",
      chapter: "",
      rendition: null,
      htmlBook: null,
      readerMode: props.readerMode,
      currentBook: null,
      isSpeedReaderActive: props.readerMode === "speed",
      speedReaderWPM: parseInt(ConfigService.getReaderConfig("speedReaderWPM") || "300"),
      isMatrixOverlayActive: false,
      currentWords: []
    };
    this.lock = false;
    this.handleCurrentChapter = props.handleCurrentChapter;
    this.handleCurrentChapterIndex = props.handleCurrentChapterIndex;
  }
  UNSAFE_componentWillMount() {
    this.props.handleFetchBookmarks();
    this.props.handleFetchNotes();
    this.props.handleFetchBooks();
    this.props.handleFetchPlugins();
  }
  componentDidMount() {
    this.handleRenderBook();
    //make sure page width is always 12 times, section = Math.floor(element.clientWidth / 12), or text will be blocked
    this.setState(
      getPageWidth(
        this.props.readerMode,
        this.state.scale.toString(),
        this.state.margin,
        this.props.isNavLocked
      )
    );
    this.props.handleRenderBookFunc(this.handleRenderBook);

    window.addEventListener("resize", () => {
      BookUtil.reloadBooks();
    });
  }

  handleHighlight = async (rendition: any) => {
    let highlighters: any = this.props.notes;
    if (!highlighters || !this.props.htmlBook?.rendition) return;
    
    let highlightersByChapter = highlighters.filter((item: Note) => {
      if (item.bookKey !== this.props.currentBook.key) {
        return false;
      }

      let cfi = JSON.parse(item.cfi);
      if (cfi.cfi) {
        // epub from 1.5.2 or older
        return (
          item.chapter ===
          rendition.getChapterDoc()[this.state.chapterDocIndex].label
        );
      } else if (cfi.fingerprint) {
        // pdf from 1.7.4 or older
        return cfi.page - 1 === this.state.chapterDocIndex;
      } else {
        return item.chapterIndex === this.state.chapterDocIndex;
      }
    });
    await this.props.htmlBook.rendition.renderHighlighters(
      highlightersByChapter,
      this.handleNoteClick
    );
  };
  handleNoteClick = (event: Event) => {
    this.props.handleNoteKey((event.target as any).dataset.key);
    this.props.handleMenuMode("note");
    this.props.handleOpenMenu(true);
  };
  handleRenderBook = async () => {
    console.log('[Viewer] Starting render book:', {
      currentState: {
        hasHtmlBook: !!this.state.htmlBook,
        readerMode: this.state.readerMode,
        currentBookKey: this.state.currentBook?.key
      }
    });

    if (lock) {
      console.log("[Viewer] Render locked, returning");
      return;
    }

    // We need to initialize the book even in speed reader mode
    let { key, path, format, name } = this.props.currentBook;
    console.log("[Viewer] Book info:", { key, format, name });

    this.props.handleHtmlBook(null);
    let doc = getIframeDoc();
    if (doc && this.state.rendition) {
      this.state.rendition.removeContent();
    }

    let isCacheExsit = await BookUtil.isBookExist("cache-" + key, "zip", path);
    console.log("[Viewer] Cache status:", { isCacheExsit, key });

    BookUtil.fetchBook(
      isCacheExsit ? "cache-" + key : key,
      isCacheExsit ? "zip" : format.toLowerCase(),
      true,
      path
    ).then(async (result: any) => {
      console.log("[Viewer] Book fetch result:", { 
        hasResult: !!result,
        format,
        defaultSyncOption: this.props.defaultSyncOption 
      });

      if (!result) {
        if (this.props.defaultSyncOption) {
          await BookUtil.downloadBook(key, format.toLowerCase());
        } else {
          toast.error(this.props.t("Book not exists"));
          return;
        }
      }

      let rendition = BookHelper.getRendtion(
        result,
        isCacheExsit ? "CACHE" : format,
        this.props.readerMode,
        this.props.currentBook.charset,
        ConfigService.getReaderConfig("isSliding") === "yes" ? "sliding" : "",
        ConfigService.getReaderConfig("isBionic"),
        ConfigService.getReaderConfig("convertChinese"),
        Kookit
      );

      // Detailed rendition inspection
      const renditionProps = Object.getOwnPropertyNames(rendition);
      const prototypeProps = Object.getOwnPropertyNames(Object.getPrototypeOf(rendition));
      const renditionMethods = Object.getOwnPropertyNames(rendition).filter(
        prop => typeof rendition[prop] === 'function'
      );
      
      console.log("[Viewer] Detailed rendition inspection:", {
        constructorName: rendition.constructor?.name,
        prototypeChain: Object.getPrototypeOf(rendition)?.constructor?.name,
        availableMethods: renditionMethods,
        renderMethods: prototypeProps.filter(p => p.toLowerCase().includes('render')),
        internalMethods: renditionProps.filter(p => p.startsWith('_')),
        hasRenderTo: typeof rendition.renderTo === 'function',
        hasInternalRender: typeof rendition._render === 'function',
        renderToImplementation: rendition.renderTo?.toString(),
        spineState: {
          hasSpine: !!rendition.spine,
          spineItems: rendition.spine?.items?.length,
          spinePosition: rendition.spine?.position
        }
      });

      // Original inspection
      console.log("[Viewer] Rendition inspection:", {
        hasRenderTo: typeof rendition.renderTo === 'function',
        initRelatedProps: renditionProps.filter(p => p.toLowerCase().includes('init')),
        initRelatedMethods: prototypeProps.filter(p => p.toLowerCase().includes('init')),
        constructorName: rendition.constructor?.name,
        hasInternalRender: typeof rendition._render === 'function',
        renderMethods: prototypeProps.filter(p => p.toLowerCase().includes('render'))
      });

      console.log("[Viewer] Post-rendition creation state:", {
        hasRendition: !!rendition,
        readerMode: this.props.readerMode,
        initState: rendition?.state,
        initSequence: "post-creation",
        contentMethods: {
          hasContent: !!rendition?.content,
          hasDoc: !!rendition?.doc,
          canGetContent: typeof rendition?.getContent === 'function',
          canRenderContent: typeof rendition?.renderContent === 'function'
        }
      });

      // Only render to page-area if not in speed reader mode
      if (this.props.readerMode === "speed") {
        console.log("[Viewer] Speed mode initialization:", {
          skipRenderTo: false,
          usingHiddenContainer: true,
          initSequence: "pre-render",
          spineData: {
            items: rendition.spine?.items?.length || 0,
            currentIndex: rendition.spine?.position || 0
          },
          manifestData: {
            items: rendition.manifest?.length || 0,
            firstItem: rendition.manifest?.[0]?.href
          }
        });
        
        // Create hidden container for initialization
        const hiddenContainer = document.createElement('div');
        hiddenContainer.id = 'speed-reader-hidden-container';
        hiddenContainer.style.cssText = 'position: fixed; width: 800px; height: 600px; top: -9999px; left: -9999px; visibility: hidden; overflow: hidden;';
        document.body.appendChild(hiddenContainer);
        
        try {
          // Initialize rendition in hidden container
          console.log('[Viewer] Starting speed reader initialization');
          
          // Create a promise to track full initialization
          const initializeRendition = new Promise<{
            key: string;
            chapters: any[];
            flattenChapters: any[];
            rendition: any;
            spine: any;
            getChapterContent: (index: number) => Promise<string>;
          }>(async (resolve, reject) => {
            try {
              // First attach the container
              await rendition.renderTo(hiddenContainer);
              
              // Wait for book parsing if needed
              if (!rendition.book) {
                console.log('[Viewer] Parsing book...');
                await rendition.parse();
              }
              
              // Set up content rendered handler
              let contentRendered = false;
              rendition.on("rendered", () => {
                console.log('[Viewer] Content rendered event received');
                contentRendered = true;
              });
              
              // Wait for initial render
              console.log('[Viewer] Waiting for content to render...');
              await new Promise(resolve => {
                const checkRendered = () => {
                  if (contentRendered) {
                    resolve(true);
                  } else {
                    setTimeout(checkRendered, 100);
                  }
                };
                checkRendered();
              });
              
              // Get chapter data
              console.log('[Viewer] Getting chapter data...');
              const chapterManager = new rendition.constructor.ChapterManager(rendition.book);
              const chapters = await chapterManager.getChapter(rendition.book.toc);
              const chapterDocs = await chapterManager.getChapterDoc();
              
              console.log('[Viewer] Chapter data loaded:', {
                hasChapters: !!chapters?.length,
                chapterCount: chapters?.length,
                docCount: chapterDocs?.length,
                firstChapterTitle: chapters?.[0]?.label,
                firstChapterContent: chapterDocs?.[0]?.textContent?.slice(0, 50)
              });
              
              if (!chapters?.length || !chapterDocs?.length) {
                throw new Error('Failed to load chapters');
              }
              
              // Create book structure with loaded content
              const speedReaderBook = {
                key: this.props.currentBook.key,
                chapters: chapters,
                flattenChapters: rendition.flatChapter(chapters),
                rendition: rendition,
                spine: rendition.spine,
                getChapterContent: async (index: number) => {
                  try {
                    if (!chapterDocs?.[index]) {
                      console.error('[Viewer] Chapter doc not found:', { index, totalDocs: chapterDocs?.length });
                      return '';
                    }

                    // Check for XML parsing errors
                    const doc = chapterDocs[index];
                    if (doc.querySelector?.('parsererror')) {
                      console.error('[Viewer] XML parsing error in chapter:', {
                        index,
                        error: doc.querySelector('parsererror')?.textContent
                      });
                      return '';
                    }

                    // Try to get content from different possible locations
                    let content = '';
                    if (doc.body?.textContent) {
                      content = doc.body.textContent;
                    } else if (doc.documentElement?.textContent) {
                      content = doc.documentElement.textContent;
                    } else if (doc.textContent) {
                      content = doc.textContent;
                    }

                    // Basic cleaning of the content
                    content = content
                      .replace(/<(style|script|xml|parsererror)[^>]*>[\s\S]*?<\/\1>/gi, '') // Remove problematic elements
                      .replace(/<[^>]+>/g, ' ') // Remove remaining tags
                      .replace(/\s+/g, ' ') // Normalize whitespace
                      .trim();

                    console.log('[Viewer] Retrieved chapter content:', {
                      index,
                      hasContent: !!content,
                      previewLength: content?.length,
                      preview: content?.slice(0, 50),
                      hasXMLErrors: content.includes('parsererror')
                    });

                    return content || '';
                  } catch (error) {
                    console.error('[Viewer] Error getting chapter content:', error);
                    return '';
                  }
                }
              };
              
              resolve(speedReaderBook);
            } catch (error) {
              reject(error);
            }
          });
          
          // Wait for full initialization
          const speedReaderBook = await initializeRendition;
          
          // Set the initialized book in state
          this.setState({ 
            htmlBook: speedReaderBook 
          }, () => {
            console.log('[Viewer] Speed reader book initialized:', {
              hasBook: !!speedReaderBook,
              chapterCount: speedReaderBook.chapters.length,
              hasContent: typeof speedReaderBook.getChapterContent === 'function',
              firstChapterPreview: speedReaderBook.chapters[0]?.label
            });
          });
          
        } catch (error) {
          console.error('[Viewer] Failed to initialize speed reader:', error);
          throw error;
        } finally {
          if (hiddenContainer.parentNode) {
            hiddenContainer.parentNode.removeChild(hiddenContainer);
          }
        }
      } else {
        // Original initialization for other reader modes
        await rendition.renderTo(document.getElementById("page-area"));
      }

      await this.handleRest(rendition);
      this.props.handleReadingState(true);

      ConfigService.setListConfig(this.props.currentBook.key, "recentBooks");
      document.title = name + " - Koodo Reader";

      // After setting htmlBook in state
      this.setState({ htmlBook: {
        key: this.props.currentBook.key,
        chapters: rendition.getChapter(),
        flattenChapters: rendition.flatChapter(rendition.getChapter()),
        rendition: rendition,
      } }, () => {
        console.log('[Viewer] HtmlBook set in state:', {
          hasHtmlBook: !!this.state.htmlBook,
          hasRendition: !!this.state.htmlBook?.rendition,
          readerMode: this.state.readerMode
        });
      });
    });
  };

  handleRest = async (rendition: any) => {
    try {
      // Log initial rendition state
      console.log("[Viewer] Starting handleRest with rendition:", {
        hasRendition: !!rendition,
        methods: rendition ? Object.keys(rendition) : [],
        state: rendition?.state,
        isContentReady: rendition?.isContentReady,
        readerMode: this.props.readerMode,
        internalState: rendition?._state,
        contentLoaded: rendition?.isContentLoaded?.(),
        hasChapters: !!rendition?.getChapter?.(),
        hasChapterDocs: !!rendition?.getChapterDoc?.()
      });

      // Wait for rendition to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check rendition state after delay
      console.log("[Viewer] Rendition state after delay:", {
        state: rendition?.state,
        isContentReady: rendition?.isContentReady,
        internalState: rendition?._state,
        contentLoaded: rendition?.isContentLoaded?.(),
        hasChapters: !!rendition?.getChapter?.(),
        hasChapterDocs: !!rendition?.getChapterDoc?.()
      });

      console.log("[Viewer] Setting up rendition:", {
        startingSetup: true,
        hasMouseEvents: !!HtmlMouseEvent,
        willGetChapters: true
      });

      HtmlMouseEvent(
        rendition,
        this.props.currentBook.key,
        this.props.readerMode
      );

      let chapters = rendition.getChapter();
      let chapterDocs = rendition.getChapterDoc();
      let flattenChapters = rendition.flatChapter(chapters);

      // Only set htmlBook once we have all the data
      this.props.handleHtmlBook({
        key: this.props.currentBook.key,
        chapters,
        flattenChapters,
        rendition: rendition,
      });

      this.setState({ rendition });

      StyleUtil.addDefaultCss();
      rendition.tsTransform();
      rendition.bionicReadingProcess();

      let bookLocation: {
        text: string;
        count: string;
        chapterTitle: string;
        chapterDocIndex: string;
        chapterHref: string;
        percentage: string;
        cfi: string;
        page: string;
      } = ConfigService.getObjectConfig(
        this.props.currentBook.key,
        "recordLocation",
        {}
      );

      // Ensure we have chapter docs before proceeding
      if (chapterDocs && chapterDocs.length > 0) {
        await rendition.goToPosition(
          JSON.stringify({
            text: bookLocation.text || "",
            chapterTitle: bookLocation.chapterTitle || "",
            page: bookLocation.page || "1", // Default to page 1 if not set
            chapterDocIndex: bookLocation.chapterDocIndex || 0,
            chapterHref: bookLocation.chapterHref || "",
            count: bookLocation.hasOwnProperty("cfi")
              ? "ignore"
              : bookLocation.count || 0,
            percentage: bookLocation.percentage || 0,
            cfi: bookLocation.cfi,
            isFirst: true,
          })
        );
      }

      rendition.on("rendered", async () => {
        try {
          this.handleLocation();
          let bookLocation: {
            text: string;
            count: string;
            chapterTitle: string;
            chapterDocIndex: string;
            chapterHref: string;
          } = ConfigService.getObjectConfig(
            this.props.currentBook.key,
            "recordLocation",
            {}
          );

          let chapter =
            bookLocation.chapterTitle ||
            (this.props.htmlBook && this.props.htmlBook.flattenChapters[0]
              ? this.props.htmlBook.flattenChapters[0].label
              : "Unknown chapter");
          let chapterDocIndex = 0;
          if (bookLocation.chapterDocIndex) {
            chapterDocIndex = parseInt(bookLocation.chapterDocIndex);
          } else {
            chapterDocIndex =
              bookLocation.chapterTitle && this.props.htmlBook
                ? _.findLastIndex(
                    this.props.htmlBook.flattenChapters.map((item) => {
                      item.label = item.label.trim();
                      return item;
                    }),
                    {
                      label: bookLocation.chapterTitle.trim(),
                    }
                  )
                : 0;
          }
          this.props.handleCurrentChapter(chapter);
          this.props.handleCurrentChapterIndex(chapterDocIndex);
          this.props.handleFetchPercentage(this.props.currentBook);
          this.setState({
            chapter,
            chapterDocIndex,
          });
          scrollContents(chapter, bookLocation.chapterHref);
          StyleUtil.addDefaultCss();
          rendition.tsTransform();
          rendition.bionicReadingProcess();
          this.handleBindGesture();
          await this.handleHighlight(rendition);
          lock = true;
          setTimeout(function () {
            lock = false;
          }, 1000);
          return false;
        } catch (error) {
          console.error("[Viewer] Error in rendered callback:", error);
        }
      });
    } catch (error) {
      console.error("[Viewer] Error in handleRest:", error);
    }
  };

  handleLocation = () => {
    if (!this.props.htmlBook) {
      return;
    }
    let position = this.props.htmlBook.rendition.getPosition();
    ConfigService.setObjectConfig(
      this.props.currentBook.key,
      position,
      "recordLocation"
    );
  };

  // Update the getChapterWords method return type
  getChapterWords = (): WordWithPause[] => {
    console.log('[Viewer] Starting getChapterWords:', {
      hasHtmlBook: !!this.state.htmlBook,
      hasRendition: !!this.state.htmlBook?.rendition,
      chapterDocIndex: this.state.chapterDocIndex
    });

    if (!this.state.htmlBook?.rendition) {
      console.error('[Viewer] No rendition available for word extraction');
      return [];
    }

    try {
      // Get the current chapter's content
      const iframe = document.querySelector("#page-area iframe") as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) {
        console.error('[Viewer] No iframe or content document found');
        return [];
      }

      console.log('[Viewer] Found iframe document:', {
        hasIframe: !!iframe,
        hasContentDocument: !!iframe.contentDocument,
        hasBody: !!iframe.contentDocument.body,
        bodyContent: iframe.contentDocument.body.textContent?.slice(0, 100)
      });

      // Create a temporary div to parse the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = iframe.contentDocument.body.innerHTML;

      // Get all text nodes
      const textNodes: Node[] = [];
      const walk = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Node) => {
            const parentElement = (node.parentNode as Element);
            if (
              parentElement?.tagName === 'SCRIPT' ||
              parentElement?.tagName === 'STYLE' ||
              parentElement?.tagName === 'NOSCRIPT'
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            return node.textContent?.trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        }
      );

      let node: Node | null;
      while ((node = walk.nextNode())) {
        textNodes.push(node);
      }

      // Process text into words with punctuation
      const processedWords = textNodes
        .map((node) => node.textContent || '')
        .join(' ')
        // Split into words but preserve punctuation
        .match(/[\w\u4e00-\u9fff]+[.,!?;:)}\]]*|[({[\]]/g)
        ?.map((wordWithPunct): WordWithPause => {
          // Extract punctuation and determine pause factor
          const punctMatch = wordWithPunct.match(/([\w\u4e00-\u9fff]+)([.,!?;:)}\]]*)$/);
          if (!punctMatch) {
            // Handle opening brackets/parentheses
            if (/[({[]/.test(wordWithPunct)) {
              return {
                word: wordWithPunct,
                pauseFactor: 1.0,
                punctuation: ''
              };
            }
            return {
              word: wordWithPunct,
              pauseFactor: 1.0,
              punctuation: ''
            };
          }

          const [, word, punct] = punctMatch;
          let pauseFactor = 1.0;

          // Determine pause factor based on punctuation
          if (punct.includes('.') || punct.includes('!') || punct.includes('?')) {
            pauseFactor = 1.5; // End of sentence
          } else if (punct.includes(',')) {
            pauseFactor = 1.2; // Comma pause
          } else if (punct.includes(';') || punct.includes(':')) {
            pauseFactor = 1.3; // Mid-sentence break
          }

          return {
            word: word + punct, // Keep punctuation with word
            pauseFactor,
            punctuation: punct
          };
        }) || [];

      console.log('[Viewer] Processed words with punctuation:', {
        wordCount: processedWords.length,
        sampleWords: processedWords.slice(0, 5).map(w => ({
          word: w.word,
          pause: w.pauseFactor
        }))
      });

      return processedWords;
    } catch (error) {
      console.error('[Viewer] Error extracting words:', error);
      return [];
    }
  };

  handleBindGesture = () => {
    let doc = getIframeDoc();
    if (!doc) return;
    doc.addEventListener("click", () => {
      this.props.handleLeaveReader("left");
      this.props.handleLeaveReader("right");
      this.props.handleLeaveReader("top");
      this.props.handleLeaveReader("bottom");
    });
    doc.addEventListener("mouseup", () => {
      if (this.state.isDisablePopup) {
        if (doc!.getSelection()!.toString().trim().length === 0) {
          let rect = doc!.getSelection()!.getRangeAt(0).getBoundingClientRect();
          this.setState({ rect });
        }
      }
      if (this.state.isDisablePopup) return;
      let selection = doc!.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      var rect = selection.getRangeAt(0).getBoundingClientRect();
      this.setState({ rect });
    });
    doc.addEventListener("contextmenu", (event) => {
      if (document.location.href.indexOf("localhost") === -1) {
        event.preventDefault();
      }

      if (!this.state.isDisablePopup && !this.state.isTouch) return;

      if (
        !doc!.getSelection() ||
        doc!.getSelection()!.toString().trim().length === 0
      ) {
        return;
      }
      let selection = doc!.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      var rect = selection.getRangeAt(0).getBoundingClientRect();
      this.setState({ rect });
    });
  };

  // Add speed reader state management methods
  handleSpeedReaderToggle = () => {
    const currentMode = ConfigService.getReaderConfig("readerMode");
    const newMode = currentMode === "speed" ? "double" : "speed";
    
    ConfigService.setReaderConfig("readerMode", newMode);
    this.setState({ 
      isSpeedReaderActive: newMode === "speed",
      speedReaderWPM: this.state.speedReaderWPM || 300 // Default WPM
    });
    
    this.props.handleRenderBookFunc(() => this.handleRenderBook());
  };

  handleSpeedReaderWPMChange = (wpm: number) => {
    this.setState({ speedReaderWPM: wpm });
    ConfigService.setReaderConfig("speedReaderWPM", wpm.toString());
  };

  toggleMatrixOverlay = () => {
    if (!this.state.isMatrixOverlayActive) {
      // Getting words before activating overlay
      const words = this.getChapterWords();
      console.log('[Viewer] Toggling matrix overlay ON:', {
        wordCount: words.length,
        sampleWords: words.slice(0, 5),
        hasHtmlBook: !!this.state.htmlBook,
        chapterDocIndex: this.state.chapterDocIndex,
        chapterTitle: this.state.chapter
      });

      if (words.length === 0) {
        toast.error(this.props.t("No words found in current chapter"));
        return;
      }

      this.setState({
        isMatrixOverlayActive: true,
        currentWords: words
      });
    } else {
      console.log('[Viewer] Toggling matrix overlay OFF');
      this.setState({ isMatrixOverlayActive: false });
    }
  };

  render() {
    return (
      <>
        {this.props.htmlBook ? (
          <PopupMenu
            {...{
              rendition: this.props.htmlBook.rendition,
              rect: this.state.rect,
              chapterDocIndex: this.state.chapterDocIndex,
              chapter: this.state.chapter,
            }}
          />
        ) : null}
        {this.props.isOpenMenu &&
        this.props.htmlBook &&
        (this.props.menuMode === "dict" ||
          this.props.menuMode === "trans" ||
          this.props.menuMode === "note") ? (
          <PopupBox
            {...{
              rendition: this.props.htmlBook.rendition,
              rect: this.state.rect,
              chapterDocIndex: this.state.chapterDocIndex,
              chapter: this.state.chapter,
            }}
          />
        ) : null}
        {this.props.htmlBook && (
          <ImageViewer
            {...{
              isShow: this.props.isShow,
              rendition: this.props.htmlBook.rendition,
              handleEnterReader: this.props.handleEnterReader,
              handleLeaveReader: this.props.handleLeaveReader,
            }}
          />
        )}
        {this.props.htmlBook && (
          <WordOverlay
            rendition={this.props.htmlBook.rendition}
            readerMode={this.props.readerMode}
          />
        )}
        <div
          className={
            this.props.readerMode === "scroll"
              ? "html-viewer-page scrolling-html-viewer-page"
              : "html-viewer-page"
          }
          id="page-area"
          style={
            this.props.readerMode === "scroll" &&
            document.body.clientWidth >= 570
              ? {
                  paddingLeft: "20px",
                  paddingRight: "15px",
                  left: this.state.pageOffset,
                  width: this.state.pageWidth,
                }
              : {
                  left: this.state.pageOffset,
                  width: this.state.pageWidth,
                }
          }
        ></div>
        <PageWidget />
        {ConfigService.getReaderConfig("isHideBackground") ===
        "yes" ? null : this.props.currentBook.key ? (
          <Background />
        ) : null}

        <MatrixToggleButton
          isActive={this.state.isMatrixOverlayActive}
          onToggle={this.toggleMatrixOverlay}
          t={this.props.t}
        />

        {this.state.isMatrixOverlayActive && this.state.htmlBook && this.state.currentWords && (
          <MatrixSpeedReader
            text={this.state.currentWords}
            initialWPM={this.state.speedReaderWPM || 300}
            onClose={this.toggleMatrixOverlay}
            bookName={this.props.currentBook.name}
            chapterTitle={this.state.chapter}
            onComplete={() => {
              // Move to next chapter
              if (this.state.htmlBook?.rendition) {
                this.state.htmlBook.rendition.next().then(() => {
                  // After moving to next chapter, get new words
                  const newWords: WordWithPause[] = this.getChapterWords();
                  if (newWords.length > 0) {
                    this.setState({ 
                      currentWords: newWords,
                      isMatrixOverlayActive: true 
                    });
                  } else {
                    this.setState({ isMatrixOverlayActive: false });
                    toast.error(this.props.t("No more chapters available"));
                  }
                });
              }
            }}
            onProgressUpdate={(progress) => {
              if (this.state.htmlBook) {
                ConfigService.setObjectConfig(
                  this.props.currentBook.key,
                  {
                    percentage: progress,
                    chapterTitle: this.state.chapter,
                    chapterDocIndex: this.state.chapterDocIndex,
                  },
                  "recordLocation"
                );
              }
            }}
          />
        )}
      </>
    );
  }

  renderSpeedReader() {
    console.log('[Viewer] Preparing SpeedReader props:', {
      hasHtmlBook: !!this.props.htmlBook,
      htmlBookState: this.props.htmlBook ? {
        hasRendition: !!this.props.htmlBook.rendition,
        hasSpine: !!this.props.htmlBook.spine,
        hasFlattenChapters: !!this.props.htmlBook.flattenChapters
      } : null,
      currentBookKey: this.props.currentBook?.key
    });

    const viewerProps = {
      readerMode: this.props.readerMode,
      hasHtmlBook: !!this.props.htmlBook,
      hasTranslation: this.props.t !== undefined,
    };

    const speedReaderProps = {
      htmlBook: this.props.htmlBook,
      currentBook: this.props.currentBook,
      handleCurrentChapter: this.handleCurrentChapter,
      handleCurrentChapterIndex: this.handleCurrentChapterIndex,
    };

    console.log('[Viewer] SpeedReader props prepared:', {
      viewerProps,
      speedReaderProps: {
        hasHtmlBook: !!speedReaderProps.htmlBook,
        hasCurrentBook: !!speedReaderProps.currentBook,
        hasHandlers: {
          chapter: !!speedReaderProps.handleCurrentChapter,
          index: !!speedReaderProps.handleCurrentChapterIndex
        }
      }
    });

    return (
      <SpeedReader {...speedReaderProps} />
    );
  }
}
export default withRouter(Viewer as any);
