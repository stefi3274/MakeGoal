// Images téléversées : AUCUNE perte de qualité visible, même pour une photo très longue.
// - Une photo déjà au bon format (JPEG pour une photo, PNG pour un logo) et de taille raisonnable
//   part telle quelle : mêmes octets, zéro recompression.
// - Sinon elle est convertie en haute qualité, jamais réduite en dessous de 4096 px (photo) / 2000 px (logo)
//   sur son plus grand côté. Le paramètre « max » est conservé pour compatibilité mais n'écrase plus la qualité.
const LIMITE_PHOTO = 4096;
const LIMITE_LOGO = 2000;
const POIDS_MAX_ORIGINAL = 8 * 1024 * 1024;

export const redimensionnerImage = (file: File, _max = 0, png = false): Promise<Blob> => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const limite = png ? LIMITE_LOGO : LIMITE_PHOTO;
    const cote = Math.max(img.width, img.height);
    const ratio = Math.min(1, limite / cote);
    const bonFormat = png ? file.type === 'image/png' : file.type === 'image/jpeg';
    if (ratio === 1 && bonFormat && file.size <= POIDS_MAX_ORIGINAL) { URL.revokeObjectURL(url); resolve(file); return; }
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * ratio);
    c.height = Math.round(img.height * ratio);
    const ctx = c.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas indisponible')); return; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob(b => (b ? resolve(b) : reject(new Error('conversion impossible'))), png ? 'image/png' : 'image/jpeg', 0.98);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
  img.src = url;
});
