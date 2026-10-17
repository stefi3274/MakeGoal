// Redimensionne une image choisie dans le navigateur (PNG pour garder la transparence des logos).
export const redimensionnerImage = (file: File, max = 1200, png = false): Promise<Blob> => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const ratio = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * ratio);
    c.height = Math.round(img.height * ratio);
    const ctx = c.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas indisponible')); return; }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob(b => (b ? resolve(b) : reject(new Error('conversion impossible'))), png ? 'image/png' : 'image/jpeg', 0.92);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
  img.src = url;
});
