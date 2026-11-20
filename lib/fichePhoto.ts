// Fiche photo d'un joueur (image PNG 1080 x 1440) : fond beige clair, chiffres violets, détails noirs.
// Inspirée des visuels de performance : nom en bandeau, photo détourée avec halo et éclairs, statistiques
// dans des cartes autour du joueur. Générée dans le navigateur (canvas), comme la vidéo.
import { chargerImage, type VideoPost } from './video';
import { groupesPourPeriode, libellePeriode, periodeAvecAdversaire, colonnesActives } from './statsJoueur';

const L = 1080, H = 1440;
const POLICE = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';
const BEIGE = '#efe4cf', BEIGE_CLAIR = '#f9f3e5', CREME = '#fffaf0';
const VIOLET = '#6a1bd1', VIOLET_VIF = '#9b3dff', NOIR = '#111111';

// Statistiques mises en avant en premier quand il y en a plus de six.
const PRIORITE = ['minutes', 'buts', 'passesDec', 'passesCles', 'tirs', 'tirsCadres', 'note', 'dribbles', 'tacles', 'interceptions', 'duelsGagnes', 'arrets', 'matchsJoues', 'cleanSheet'];
const MAX_STATS = 6;

type Stat = { cle: string; label: string; valeur: string };

function statsDuJoueur(post: VideoPost): { joueur: NonNullable<VideoPost['stats_joueur']>['joueurs'][number]; stats: Stat[] } | null {
  const st = post.stats_joueur;
  if (!st || st.mode === 'comparaison' || !st.joueurs?.length) return null;
  if (colonnesActives(st.competitions).length > 0) return null; // mode « par compétition » : pas de fiche
  const j = st.joueurs[0];
  const champs = groupesPourPeriode(post.sport, st.poste, st.periode?.type).flatMap(g => g.champs);
  const tous: Stat[] = champs.filter(c => j.valeurs?.[c.cle] && String(j.valeurs[c.cle]).trim())
    .map(c => ({ cle: c.cle, label: c.label, valeur: String(j.valeurs[c.cle]).trim() }));
  if (!tous.length) return null;
  const rang = (cle: string) => { const i = PRIORITE.indexOf(cle); return i < 0 ? 999 : i; };
  const choisis = tous.length <= MAX_STATS ? tous : [...tous].sort((a, b) => rang(a.cle) - rang(b.cle)).slice(0, MAX_STATS);
  // Ordre d'affichage stable : celui du catalogue.
  const ordre = tous.map(s => s.cle);
  choisis.sort((a, b) => ordre.indexOf(a.cle) - ordre.indexOf(b.cle));
  return { joueur: j, stats: choisis };
}

export function fichePhotoPossible(post: VideoPost): boolean { return !!statsDuJoueur(post); }

// Générateur pseudo-aléatoire reproductible : la même fiche donne toujours les mêmes éclairs.
function graine(texte: string) {
  let h = 1779033703 ^ texte.length;
  for (let i = 0; i < texte.length; i++) { h = Math.imul(h ^ texte.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Ctx = CanvasRenderingContext2D;

function ajuster(ctx: Ctx, txt: string, taille: number, maxLarg: number, mini: number, poids = 900, italique = false) {
  let t = taille;
  ctx.font = `${italique ? 'italic ' : ''}${poids} ${t}px ${POLICE}`;
  while (ctx.measureText(txt).width > maxLarg && t > mini) { t -= 2; ctx.font = `${italique ? 'italic ' : ''}${poids} ${t}px ${POLICE}`; }
  return t;
}

function parallelogramme(ctx: Ctx, x: number, y: number, w: number, h: number, pente: number) {
  ctx.beginPath(); ctx.moveTo(x + pente, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - pente, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}

function hexagone(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}

// Pictogrammes simples, dessinés en trait beige dans l'hexagone noir.
function icone(ctx: Ctx, cle: string, cx: number, cy: number) {
  ctx.save(); ctx.strokeStyle = BEIGE_CLAIR; ctx.fillStyle = BEIGE_CLAIR; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (cle === 'minutes' || cle === 'matchsJoues' || cle === 'titularisations') {
    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy); ctx.lineTo(cx + 8, cy + 5); ctx.stroke();
  } else if (cle === 'buts' || cle === 'penaltysMarques' || cle === 'butsTete' || cle === 'butsCoupFranc') {
    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * 2 / 5 * i - Math.PI / 2; const px = cx + 7 * Math.cos(a), py = cy + 7 * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
  } else if (cle === 'passesDec' || cle === 'passesCles' || cle === 'occasionsCreees' || cle === 'tirs' || cle === 'prePasseDec') {
    ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.quadraticCurveTo(cx, cy - 18, cx + 20, cy); ctx.quadraticCurveTo(cx, cy + 18, cx - 20, cy); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
  } else if (cle === 'tirsCadres') {
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (cle === 'note') {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2; const r = i % 2 ? 8 : 19; const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
  } else if (cle === 'tacles' || cle === 'interceptions' || cle === 'recuperations' || cle === 'duelsGagnes' || cle === 'arrets' || cle === 'cleanSheet') {
    ctx.beginPath(); ctx.moveTo(cx, cy - 19); ctx.lineTo(cx + 16, cy - 12); ctx.lineTo(cx + 14, cy + 6); ctx.quadraticCurveTo(cx + 10, cy + 15, cx, cy + 20); ctx.quadraticCurveTo(cx - 10, cy + 15, cx - 14, cy + 6); ctx.lineTo(cx - 16, cy - 12); ctx.closePath(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx + 4, cy - 20); ctx.lineTo(cx - 10, cy + 3); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 4, cy + 20); ctx.lineTo(cx + 10, cy - 3); ctx.lineTo(cx, cy - 3); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function carte(ctx: Ctx, x: number, y: number, w: number, h: number, s: Stat) {
  ctx.save();
  // Ombre portée nette, puis carte crème bordée de noir avec un coin biseauté.
  const b = 26;
  const chemin = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w - b, y); ctx.lineTo(x + w, y + b); ctx.lineTo(x + w, y + h); ctx.lineTo(x + b, y + h); ctx.lineTo(x, y + h - b); ctx.closePath(); };
  ctx.translate(8, 8); chemin(); ctx.fillStyle = 'rgba(17,17,17,0.85)'; ctx.fill(); ctx.translate(-8, -8);
  chemin(); ctx.fillStyle = CREME; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = NOIR; ctx.stroke();
  // Filet violet à gauche.
  ctx.fillStyle = VIOLET; ctx.fillRect(x + 4, y + 4, 8, h - 8 - 0);
  // Libellé (jusqu'à deux lignes), en noir.
  ctx.fillStyle = NOIR; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const txt = s.label.toUpperCase();
  const largMax = w - 64;
  let t = 26; ctx.font = `800 ${t}px ${POLICE}`;
  let lignes = [txt];
  if (ctx.measureText(txt).width > largMax) {
    const mots = txt.split(' '); let best = [txt]; let meilleur = Infinity;
    for (let i = 1; i < mots.length; i++) { const a = mots.slice(0, i).join(' '), c = mots.slice(i).join(' '); const m = Math.max(ctx.measureText(a).width, ctx.measureText(c).width); if (m < meilleur) { meilleur = m; best = [a, c]; } }
    lignes = best;
    while (Math.max(...lignes.map(l => ctx.measureText(l).width)) > largMax && t > 16) { t -= 1; ctx.font = `800 ${t}px ${POLICE}`; }
  } else {
    t = ajuster(ctx, txt, 26, largMax, 16, 800);
  }
  const yLib = y + 58;
  lignes.forEach((l, i) => ctx.fillText(l, x + w / 2 + 6, yLib + i * (t + 4)));
  // Valeur en violet.
  const vy = y + h - 24;
  const tv = ajuster(ctx, s.valeur, 84, w - 70, 36, 900);
  ctx.fillStyle = VIOLET; ctx.fillText(s.valeur, x + w / 2 + 6, vy);
  void tv;
  ctx.restore();
  // Badge hexagonal noir avec pictogramme.
  ctx.save();
  const hx = x + 44, hy = y - 6;
  hexagone(ctx, hx, hy, 40); ctx.fillStyle = NOIR; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = VIOLET_VIF; ctx.stroke();
  icone(ctx, s.cle, hx, hy);
  ctx.restore();
}

function aDeLaTransparence(img: HTMLImageElement): boolean {
  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
  const g = c.getContext('2d'); if (!g) return false;
  g.drawImage(img, 0, 0, 48, 48);
  const d = g.getImageData(0, 0, 48, 48).data; let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) n++;
  return n > 48 * 48 * 0.12;
}

// Dessine la photo du joueur dans (bx, by, bw, bh). Photo détourée (PNG transparent) : halo violet autour de la silhouette.
// Photo ordinaire : portrait aux bords fondus dans le beige.
function dessinerJoueur(ctx: Ctx, img: HTMLImageElement | null, initiale: string, bx: number, by: number, bw: number, bh: number) {
  if (!img) {
    ctx.save(); ctx.fillStyle = VIOLET; ctx.shadowColor = VIOLET_VIF; ctx.shadowBlur = 60;
    ctx.beginPath(); ctx.arc(bx + bw / 2, by + bh / 2, 230, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = BEIGE_CLAIR; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 320px ${POLICE}`; ctx.fillText(initiale, bx + bw / 2, by + bh / 2 + 14);
    ctx.restore(); return;
  }
  if (aDeLaTransparence(img)) {
    const r = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
    const w = img.naturalWidth * r, h = img.naturalHeight * r, x = bx + (bw - w) / 2, y = by + bh - h;
    ctx.save();
    ctx.shadowColor = VIOLET_VIF; ctx.shadowBlur = 55; ctx.drawImage(img, x, y, w, h);
    ctx.shadowColor = VIOLET; ctx.shadowBlur = 18; ctx.drawImage(img, x, y, w, h);
    ctx.shadowBlur = 0; ctx.drawImage(img, x, y, w, h);
    ctx.restore(); return;
  }
  const c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const g = c.getContext('2d'); if (!g) return;
  const r = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  const w = img.naturalWidth * r, h = img.naturalHeight * r;
  g.drawImage(img, (bw - w) / 2, Math.min(0, (bh - h) * 0.2), w, h); // cadrage vers le haut (visage)
  g.globalCompositeOperation = 'destination-in';
  const fond = Math.round(bw * 0.18);
  const gx = g.createLinearGradient(0, 0, bw, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(fond / bw, 'rgba(0,0,0,1)'); gx.addColorStop(1 - fond / bw, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gx; g.fillRect(0, 0, bw, bh);
  const gy = g.createLinearGradient(0, 0, 0, bh); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.1, 'rgba(0,0,0,1)'); gy.addColorStop(0.82, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, bw, bh);
  ctx.save(); ctx.shadowColor = 'rgba(155,61,255,0.55)'; ctx.shadowBlur = 40; ctx.drawImage(c, bx, by); ctx.shadowBlur = 0; ctx.drawImage(c, bx, by); ctx.restore();
}

function eclair(ctx: Ctx, rnd: () => number, x0: number, y0: number, x1: number, y1: number) {
  const n = 7; const pts: [number, number][] = [[x0, y0]];
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (rnd() - 0.5) * 70, y0 + (y1 - y0) * t + (rnd() - 0.5) * 70]); }
  pts.push([x1, y1]);
  const trace = () => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); };
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = VIOLET_VIF; ctx.shadowBlur = 22; ctx.strokeStyle = VIOLET_VIF; ctx.lineWidth = 6; trace(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = CREME; ctx.lineWidth = 2; trace(); ctx.stroke();
  ctx.restore();
}

export async function genererFichePhoto(post: VideoPost): Promise<Blob> {
  const d = statsDuJoueur(post);
  if (!d) throw new Error('Cette fiche photo existe pour un post « Stats joueur » avec un seul joueur et au moins une statistique.');
  const { joueur: j, stats } = d;
  const st = post.stats_joueur!;
  const img = j.photo && /^https:\/\//i.test(j.photo) ? await chargerImage(j.photo) : null;

  const cv = document.createElement('canvas'); cv.width = L; cv.height = H;
  const ctx = cv.getContext('2d'); if (!ctx) throw new Error('Image impossible à créer sur cet appareil.');
  ctx.imageSmoothingQuality = 'high';
  const rnd = graine(j.nom + stats.map(s => s.valeur).join(','));

  // Fond beige clair, lumière centrale et fines diagonales.
  const fond = ctx.createRadialGradient(L / 2, 640, 80, L / 2, 700, 980);
  fond.addColorStop(0, BEIGE_CLAIR); fond.addColorStop(1, BEIGE);
  ctx.fillStyle = fond; ctx.fillRect(0, 0, L, H);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = NOIR; ctx.lineWidth = 2;
  for (let x = -H; x < L; x += 46) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
  ctx.restore();
  const halo = ctx.createRadialGradient(L / 2, 760, 20, L / 2, 760, 520);
  halo.addColorStop(0, 'rgba(155,61,255,0.30)'); halo.addColorStop(1, 'rgba(155,61,255,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, L, H);

  // Éclairs et étincelles derrière le joueur.
  const cx = L / 2;
  for (let i = 0; i < 9; i++) {
    const cote = i % 2 ? 1 : -1;
    const ya = 330 + rnd() * 620;
    eclair(ctx, rnd, cx + cote * (170 + rnd() * 60), ya, cx + cote * (330 + rnd() * 90), ya + (rnd() - 0.4) * 260);
  }

  // Joueur.
  dessinerJoueur(ctx, img, (j.nom.trim()[0] || '?').toUpperCase(), 230, 250, 620, 1060);

  // Étincelles par-dessus.
  for (let i = 0; i < 150; i++) {
    const a = rnd() * Math.PI * 2, r = 190 + rnd() * 330;
    const x = cx + Math.cos(a) * r * 0.95, y = 800 + Math.sin(a) * r * 1.3;
    if (y < 250 || y > 1310) continue;
    ctx.fillStyle = rnd() > 0.45 ? VIOLET_VIF : NOIR; ctx.globalAlpha = 0.25 + rnd() * 0.6;
    const t = 2 + rnd() * 5; ctx.fillRect(x, y, t, t * (rnd() > 0.6 ? 3 : 1));
  }
  ctx.globalAlpha = 1;

  // Bandeau du nom (noir) et sous-bandeau club | pays (crème bordé de noir).
  ctx.save();
  parallelogramme(ctx, 50, 60, 780, 112, 36); ctx.fillStyle = NOIR; ctx.fill();
  parallelogramme(ctx, 50, 60, 18, 112, 36); ctx.fillStyle = VIOLET_VIF; ctx.fill();
  ctx.fillStyle = BEIGE_CLAIR; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ajuster(ctx, j.nom.toUpperCase(), 76, 670, 34, 900, true); ctx.fillText(j.nom.toUpperCase(), 108, 118);
  const sous = [j.equipe, j.pays].filter(Boolean).join('  |  ').toUpperCase();
  if (sous) {
    parallelogramme(ctx, 50, 184, 600, 64, 24); ctx.fillStyle = CREME; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = NOIR; ctx.stroke();
    ctx.fillStyle = NOIR; ajuster(ctx, sous, 38, 500, 22, 900); ctx.fillText(sous, 96, 217);
  }
  // Pastille de contexte : adversaire ou période.
  const periode = libellePeriode(st.periode, st.nbMatchs);
  const pastille = periodeAvecAdversaire(st.periode?.type) && j.adversaire ? 'FACE À ' + j.adversaire.toUpperCase() : (periode || '').toUpperCase();
  if (pastille) {
    ctx.font = `900 28px ${POLICE}`; const w = Math.min(ctx.measureText(pastille).width + 56, 560);
    const px = L - 50 - w;
    ctx.beginPath(); ctx.roundRect(px, 80, w, 56, 28); ctx.fillStyle = VIOLET; ctx.fill();
    ctx.fillStyle = BEIGE_CLAIR; ctx.textAlign = 'center'; ajuster(ctx, pastille, 28, w - 40, 16, 900); ctx.fillText(pastille, px + w / 2, 109);
  }
  ctx.restore();

  // Cartes de statistiques : réparties à gauche et à droite du joueur.
  const nG = Math.floor(stats.length / 2), nD = stats.length - nG;
  const cw = 300, ch = 160, esp = 44, zoneTop = 700, zoneBas = 1300;
  const colonne = (liste: Stat[], x: number) => {
    const total = liste.length * ch + (liste.length - 1) * esp;
    const y0 = zoneTop + (zoneBas - zoneTop - total) / 2;
    liste.forEach((s, i) => carte(ctx, x, y0 + i * (ch + esp), cw, ch, s));
  };
  colonne(stats.slice(0, nG), 44);
  colonne(stats.slice(nG, nG + nD), L - 44 - cw);

  // Pied de page.
  ctx.fillStyle = NOIR; ctx.fillRect(0, H - 80, L, 80);
  ctx.fillStyle = VIOLET_VIF; ctx.fillRect(0, H - 84, L, 6);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = BEIGE_CLAIR; ctx.font = `900 38px ${POLICE}`; ctx.fillText('MAKE', 50, H - 38);
  const wMake = ctx.measureText('MAKE').width; ctx.fillStyle = VIOLET_VIF; ctx.fillText('GOAL', 50 + wMake, H - 38);
  ctx.textAlign = 'right'; ctx.fillStyle = BEIGE_CLAIR; ctx.font = `700 28px ${POLICE}`; ctx.fillText('makegoal.vercel.app', L - 50, H - 38);

  return await new Promise<Blob>((ok, ko) => cv.toBlob(b => b ? ok(b) : ko(new Error('Image impossible à enregistrer.')), 'image/png'));
}
