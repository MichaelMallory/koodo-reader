declare module 'epubjs' {
  interface SpineItem {
    href: string;
    id: string;
    index: number;
  }

  interface EpubBook {
    ready: Promise<void>;
    navigation: {
      toc: Promise<Array<{
        label: string;
        href: string;
      }>>;
    };
    spine: {
      get: (href: string) => {
        load: () => Promise<{
          textContent: string;
        }>;
      } | null;
      items: SpineItem[];
      spineItems: SpineItem[];  // Some versions use this name
      length: number;
    };
  }

  interface EpubOptions {
    width?: number;
    height?: number;
    spreads?: boolean;
    flow?: string;
  }

  function epub(data: ArrayBuffer | string, options?: EpubOptions): EpubBook;
  export = epub;
} 