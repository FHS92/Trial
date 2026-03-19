import { toBlob, toPng } from 'html-to-image';

export async function exportInfographic(element: HTMLElement, title: string): Promise<void> {
  // Prepare options for high-resolution export
  const options = {
    quality: 1.0,
    pixelRatio: 2,
    cacheBust: true,
    style: {
      // Ensure fonts are rendered
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    filter: (node: HTMLElement) => {
      // Exclude buttons and controls from export
      const excludedClasses = ['export-exclude', 'no-export'];
      return !excludedClasses.some(cls => node.classList?.contains(cls));
    },
  };

  try {
    const dataUrl = await toPng(element, options);

    // Create download link
    const link = document.createElement('a');
    const safeName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    link.download = `factcanvas-${safeName}-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export infographic. Please try again.');
  }
}

export async function copyInfographicToClipboard(element: HTMLElement): Promise<void> {
  const options = {
    quality: 1.0,
    pixelRatio: 2,
    cacheBust: true,
  };

  try {
    const blob = await toBlob(element, options);
    if (!blob) throw new Error('Failed to generate image blob');

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    throw new Error('Failed to copy to clipboard.');
  }
}
