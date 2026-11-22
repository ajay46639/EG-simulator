import { ProjectData } from '../types/engineering';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProjectAsJSON(data: ProjectData) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const safeName = data.name.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
  downloadBlob(blob, `${safeName || 'eg_simulator_project'}.json`);
}

export function exportSVGElement(svgEl: SVGSVGElement | null, filename: string) {
  if (!svgEl) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgEl);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

export function exportSVGAsPNG(svgEl: SVGSVGElement | null, filename: string) {
  if (!svgEl) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgEl);
  const img = new Image();
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svgEl.clientWidth * 2 || 1600;
    canvas.height = svgEl.clientHeight * 2 || 1000;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, filename);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else {
      URL.revokeObjectURL(url);
    }
  };
  img.src = url;
}

export function exportDrawingSheetPDF() {
  window.print();
}
