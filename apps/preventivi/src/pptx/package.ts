import JSZip from 'jszip';

/** PptxGenJS 4.0.1 writes one slide-master content-type entry per slide but
 * only emits slideMaster1.xml. Remove just those dangling declarations so
 * the downloaded OPC package contains no nonexistent parts.
 */
export async function normalizePptxPackage(blob: Blob): Promise<Blob> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const entry = zip.file('[Content_Types].xml');
  if (!entry) throw new Error('Pacchetto PowerPoint incompleto.');
  const xml = await entry.async('string');
  const repaired = xml.replace(/<Override\b[^>]*\bPartName="(\/ppt\/slideMasters\/slideMaster\d+\.xml)"[^>]*\/>/g, (declaration, path: string) => zip.file(path.slice(1)) ? declaration : '');
  if (repaired === xml) return blob;
  zip.file('[Content_Types].xml', repaired);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', compression: 'DEFLATE' });
}
