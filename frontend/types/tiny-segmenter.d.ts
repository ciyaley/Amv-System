// types/tiny-segmenter.d.ts
declare module 'tiny-segmenter' {
  class TinySegmenter {
    constructor();
    segment(text: string): string[];
  }
  
  export = TinySegmenter;
}