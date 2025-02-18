# Speed Reader Expected Log Sequence

This document outlines the expected sequence of logs during speed reader initialization and chapter loading. Use this as a reference when debugging the speed reader functionality.

## 1. Initial SpeedReader Component Setup
```typescript
[Viewer] SpeedReader render: {
  viewerProps: {
    readerMode: "speed",
    hasHtmlBook: false,
    hasTranslation: true
  },
  speedReaderProps: {
    htmlBook: false,
    currentBook: true,
    handleCurrentChapter: true,
    handleCurrentChapterIndex: true
  }
}

[SpeedReader] Constructor: {
  hasProps: true,
  hasHtmlBook: false,
  hasCurrentBook: true
}

[SpeedReader:Extractor] Initialized

[SpeedReader] Component mounted: {
  hasHtmlBook: false,
  currentBook: "<book_key>",
  hasRendition: false
}
```

## 2. Book Loading Process
```typescript
[Viewer] Starting render book: {
  currentState: {
    hasHtmlBook: false,
    readerMode: "speed",
    currentBookKey: "<book_key>"
  }
}

[Viewer] Book info: {
  key: "<book_key>",
  format: "EPUB",
  name: "<book_name>"
}

[Viewer] Cache status: {
  isCacheExsit: false,
  key: "<book_key>"
}

[Viewer] Book fetch result: {
  hasResult: true,
  format: "EPUB",
  defaultSyncOption: ""
}
```

## 3. Rendition Setup
```typescript
[Viewer] Rendition inspection: {
  hasRenderTo: true,
  initRelatedProps: [],
  initRelatedMethods: [],
  constructorName: "Ft",
  hasInternalRender: true,  // Critical: Should be true
  renderMethods: ["renderTo", "render", "_render"]  // Should have these methods
}

[Viewer] Post-rendition creation state: {
  hasRendition: true,
  readerMode: "speed",
  initState: "initialized",  // Should have a state
  initSequence: "post-creation",
  contentMethods: {
    hasContent: true,  // Should be true
    hasDoc: true,      // Should be true
    canGetContent: true,
    canRenderContent: true
  }
}
```

## 4. Speed Reader Initialization
```typescript
[Viewer] Speed mode initialization: {
  skipRenderTo: false,
  usingHiddenContainer: true,
  initSequence: "pre-render",
  spineData: {
    items: ">0",  // Should have items
    currentIndex: 0
  },
  manifestData: {
    items: ">0",  // Should have items
    firstItem: "present"  // Should have first item
  }
}
```

## 5. Chapter Loading
```typescript
[Viewer] Loading first chapter for speed reader: {
  firstChapter: "present",  // Should have chapter info
  spineItem: "present",     // Should have spine item
  manifestItem: "present",  // Should have manifest item
  timing: "<timestamp>"
}

[Viewer] Content rendered event  // Critical: This should appear

[Viewer] Chapter load result: {
  loaded: true,  // Should be true
  hasDocument: true,  // Should be true
  documentState: {
    readyState: "complete",
    hasBody: true,
    contentLength: ">0"  // Should have content
  }
}
```

## 6. Render Completion
```typescript
[Viewer] After renderTo: {
  contentLoaded: true,
  renderComplete: true,
  state: "rendered",
  spinePosition: 0,
  currentContent: {
    hasDoc: true,
    docLength: ">0"
  }
}

[Viewer] Speed mode render complete: {
  hasContent: true,
  hasDoc: true,
  state: "rendered",
  initSequence: "post-render",
  contentDetails: {
    docLength: ">0",
    hasStyles: true,
    isLoaded: true,
    contentLoaded: true,
    renderComplete: true,
    spinePosition: 0
  }
}
```

## 7. HtmlBook State Update
```typescript
[Viewer] HtmlBook set in state: {
  hasHtmlBook: true,
  hasRendition: true,
  readerMode: "speed"
}
```

## 8. SpeedReader Component Update
```typescript
[SpeedReader] Component updated: {
  prevHadHtmlBook: false,
  nowHasHtmlBook: true,
  prevHadRendition: false,
  nowHasRendition: true,
  currentBookKey: "<book_key>"
}
```

## Debugging Notes

### Critical Checkpoints
1. Rendition must have `hasInternalRender: true`
2. Must see `Content rendered event` log
3. Chapter load result must show `loaded: true`
4. Final state must have both `contentLoaded: true` and `renderComplete: true`

### Common Issues
1. Missing `hasInternalRender` indicates incomplete rendition initialization
2. Missing `Content rendered event` suggests event binding failure
3. Missing chapter load result suggests chapter loading process failure
4. Missing final state updates suggest render process interruption

### Resolution Steps
1. Verify rendition initialization and method availability
2. Check event binding implementation
3. Validate chapter loading process
4. Ensure render process completes fully 