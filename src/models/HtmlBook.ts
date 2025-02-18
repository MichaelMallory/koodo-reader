class HtmlBook {
  key: string;
  chapters: { label: string; id: string; href: string; index: number }[];
  flattenChapters: { label: string; id: string; href: string; index: number }[];
  rendition: any;
  spine?: any;

  constructor(
    key: string,
    chapters: { label: string; id: string; href: string; index: number }[],
    flattenChapters: {
      label: string;
      id: string;
      href: string;
      index: number;
    }[],
    rendition: any
  ) {
    this.key = key;
    this.chapters = chapters;
    this.flattenChapters = flattenChapters;
    this.rendition = rendition;
    this.spine = rendition?.spine;
  }
}

export default HtmlBook;
