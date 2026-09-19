import pptxgen from 'pptxgenjs';
import type { Quote } from '../domain/types';
import { LOGO_DATA, LOGO_ASPECT } from './logo';

export const C = { petrol: '193E40', lime: 'D5ED90', paper: 'F8FAF6', ink: '263B3B', muted: '657774', border: 'DCE4DE', white: 'FFFFFF' };
export const PAGE = { w: 13.333333, h: 7.5, margin: 0.7, bodyY: 1.85, bodyEnd: 6.65 };
export type Slide = pptxgen.Slide;
export interface TextBlock { label?: string; text: string; keepWithNext?: boolean }
export const eur = (cents: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true }).format(cents / 100);
export const number = (value: number, digits = 3) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: digits }).format(value);
export const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : value;
export const customerName = (quote: Quote) => quote.customer.company || [quote.customer.firstName, quote.customer.lastName].filter(Boolean).join(' ') || 'Cliente';

/** Conservative Arial advance widths, with extra room for glyph and renderer variations.
 * Explicit lines, rather than shrink-to-fit, keep body copy readable on every page.
 */
function widthOf(value: string, fontSize: number): number {
  return [...value].reduce((sum, char) => sum + (/\s/.test(char) ? 0.32 : /[ilI.,:;'!|]/.test(char) ? 0.3 : /[MW@%&#]/.test(char) ? 1.0 : /[A-ZÀ-Ý]/.test(char) ? 0.75 : char.codePointAt(0)! > 0x2e80 ? 1.1 : 0.61), 0) * fontSize * 1.06 / 72;
}
export function wrapText(value: string, width: number, fontSize: number): string[] {
  const result: string[] = [];
  for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && widthOf(`${line} ${word}`, fontSize) <= width) { line += ` ${word}`; continue; }
      if (line) { result.push(line); line = ''; }
      if (widthOf(word, fontSize) <= width) { line = word; continue; }
      for (const char of word) {
        if (line && widthOf(line + char, fontSize) > width) { result.push(line); line = ''; }
        line += char;
      }
    }
    result.push(line);
  }
  return result.length ? result : [''];
}
export function chunks<T>(values: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size));
}
export function text(slide: Slide, value: string, x: number, y: number, w: number, h: number, size = 17, options: pptxgen.TextPropsOptions = {}) {
  slide.addText(value, { x, y, w, h, fontFace: 'Arial', fontSize: size, color: C.ink, margin: 0, breakLine: false, paraSpaceAfter: 0, valign: 'top', lineSpacingMultiple: 1.1, ...options });
}
export function logo(slide: Slide, x = 10.27, y = 0.45, w = 2.3) {
  slide.addImage({ data: LOGO_DATA, x, y, w, h: w / LOGO_ASPECT, altText: 'Green Flux, impianti tecnologici' });
}

/** Native PowerPoint line art; transparency intentionally limited to background decoration. */
export function energyArt(slide: Slide, variant = 0, x = 9.25, y = 3.75, size = 2.7, transparency = 94) {
  const line = { color: C.petrol, transparency, width: 2.2 };
  const s = size;
  if (variant % 3 === 0) {
    slide.addShape('line', { x, y, w: s * 0.5, h: s * 0.5, flipV: true, line });
    slide.addShape('line', { x: x + s * 0.5, y, w: s * 0.5, h: s * 0.5, line });
    slide.addShape('rect', { x: x + s * 0.16, y: y + s * 0.49, w: s * 0.68, h: s * 0.49, line, fill: { color: C.petrol, transparency: 100 } });
    slide.addShape('rect', { x: x + s * 0.43, y: y + s * 0.67, w: s * 0.15, h: s * 0.31, line, fill: { color: C.petrol, transparency: 100 } });
  } else if (variant % 3 === 1) {
    slide.addShape('roundRect', { x, y, w: s, h: s * 0.72, line, fill: { color: C.petrol, transparency: 100 } });
    slide.addShape('ellipse', { x: x + s * 0.13, y: y + s * 0.12, w: s * 0.47, h: s * 0.47, line, fill: { color: C.petrol, transparency: 100 } });
    for (let i = 0; i < 4; i++) slide.addShape('line', { x: x + s * 0.73, y: y + s * (0.2 + i * 0.1), w: s * 0.15, h: 0, line });
  } else {
    slide.addShape('rect', { x, y: y + s * 0.2, w: s, h: s * 0.62, line, fill: { color: C.petrol, transparency: 100 } });
    for (let i = 1; i < 4; i++) slide.addShape('line', { x: x + s * i / 4, y: y + s * 0.2, w: 0, h: s * 0.62, line });
    slide.addShape('line', { x, y: y + s * 0.51, w: s, h: 0, line });
    slide.addShape('line', { x: x + s * 0.2, y: y + s * 0.96, w: s * 0.6, h: 0, line });
    slide.addShape('line', { x: x + s * 0.5, y: y + s * 0.82, w: 0, h: s * 0.14, line });
  }
}

export class DeckTemplate {
  readonly pptx = new pptxgen();
  private pageCount = 0;
  constructor(readonly quote: Quote) {
    this.pptx.layout = 'LAYOUT_WIDE';
    this.pptx.author = quote.companySnapshot.legalName || 'GREEN FLUX';
    this.pptx.company = quote.companySnapshot.legalName || 'GREEN FLUX';
    this.pptx.subject = `Preventivo ${quote.number}`;
    this.pptx.title = `Proposta Green Flux ${quote.number}`;
    this.pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
  }
  slide(section: string, title: string, continued = false): Slide {
    const slide = this.pptx.addSlide();
    this.pageCount++;
    slide.background = { color: C.white };
    energyArt(slide, this.pageCount, 9.6, 4.1, 2.7);
    text(slide, section.toUpperCase() + (continued ? ' / CONTINUA' : ''), 0.7, 0.47, 8.6, 0.25, 10, { color: C.muted, bold: true, charSpacing: 1.3 });
    logo(slide);
    text(slide, title, 0.7, 1.03, 11.9, 0.62, 30, { color: C.petrol, bold: true });
    slide.addShape('rect', { x: 0.7, y: 1.69, w: 0.65, h: 0.05, line: { transparency: 100 }, fill: { color: C.lime } });
    slide.addShape('line', { x: 0.7, y: 6.96, w: 11.93, h: 0, line: { color: C.border, width: 0.6 } });
    // User-controlled identifiers are intentionally kept out of fixed footer geometry.
    if (this.quote.isDemo) {
      slide.addShape('rect', { x: 0.7, y: 7.02, w: 5.5, h: 0.29, line: { transparency: 100 }, fill: { color: C.lime } });
      text(slide, 'GREEN FLUX / DEMO: DATI E PREZZI NON REALI', 0.82, 7.075, 5.25, 0.2, 9, { color: C.petrol, bold: true });
    } else text(slide, 'GREEN FLUX / PROPOSTA COMMERCIALE', 0.7, 7.07, 9.9, 0.2, 9, { color: C.muted });
    text(slide, String(this.pageCount).padStart(2, '0'), 12.03, 7.05, 0.6, 0.24, 10, { color: C.muted, align: 'right' });
    return slide;
  }
  flow(section: string, title: string, blocks: TextBlock[], fontSize = 17): void {
    let slide = this.slide(section, title);
    let y = PAGE.bodyY + 0.12;
    const lineH = fontSize * 1.32 / 72;
    const visible = blocks.filter(block => block.text.trim());
    for (const [index, block] of visible.entries()) {
      const lines = wrapText(block.text, 11.7, fontSize);
      const next = block.keepWithNext ? visible[index + 1] : undefined;
      const required = lines.length * lineH + (block.label ? 0.29 : 0) + 0.24 + (next ? (next.label ? 0.29 : 0) + Math.min(3, wrapText(next.text, 11.7, fontSize).length) * lineH : 0);
      if (required <= PAGE.bodyEnd - PAGE.bodyY - 0.12 && required > PAGE.bodyEnd - y && y > PAGE.bodyY + 0.12) { slide = this.slide(section, title, true); y = PAGE.bodyY + 0.12; }
      let cursor = 0;
      while (cursor < lines.length) {
        const labelH = block.label ? 0.29 : 0;
        if (PAGE.bodyEnd - y < labelH + lineH + 0.05) { slide = this.slide(section, title, true); y = PAGE.bodyY + 0.12; }
        if (block.label) text(slide, block.label.toUpperCase() + (cursor ? ' / CONTINUA' : ''), 0.7, y, 11.7, 0.24, 10.5, { color: C.muted, bold: true });
        y += labelH;
        const take = Math.max(1, Math.floor((PAGE.bodyEnd - y - 0.08) / lineH));
        const part = lines.slice(cursor, cursor + take);
        text(slide, part.join('\n'), 0.7, y, 11.9, part.length * lineH + 0.035, fontSize);
        y += part.length * lineH + 0.24;
        cursor += part.length;
      }
    }
  }
}
