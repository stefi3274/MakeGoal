// Interrupteurs de fonctionnalités. Paris est en veille : passer à true pour le réactiver partout
// (menu, accueil, pages liées et routes serveur).
export const PARIS_ACTIF = false;

// Le format 11 joueurs est retiré : MakeGoal Fantasy se joue uniquement à 7 joueurs.
// Les données existantes sont conservées, mais plus aucune équipe de 11 ne peut être enregistrée.
export const FANTASY_11_ACTIF = false;

// Paris en caisse (tickets imprimés, argent réel encaissé au comptoir). Indépendant de PARIS_ACTIF
// (qui concerne l'ancien système en Gourdes virtuelles, toujours en veille).
export const CAISSE_ACTIVE = true;
