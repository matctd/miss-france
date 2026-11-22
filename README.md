# 👑 Miss Pronos

Web app de pronostics Miss France entre amis. Chacun sélectionne son top 15 pendant les défilés, puis les 5 finalistes en direct, puis le podium — et le classement des amis se met à jour à chaque étape.

## Les règles

| Étape | Fenêtre | Pronostic | Points |
|---|---|---|---|
| 1. Top 15 | Début du direct → verrouillage admin | 15 miss (sélection seule) | 2 pts / miss trouvée (max 30) |
| 2. Top 5 | Fenêtre live ouverte par l'admin (~15-20 min) | 5 finalistes | 6 pts / finaliste trouvé (max 30) |
| 3. Classement | Fenêtre live ouverte par l'admin (~10-15 min) | Top 5 ordonné | Gagnante 15 · 1re dauphine 10 · 2e dauphine 5 · 4e/5e 2,5 (max 35) |

**Total max : 95 points.** Les places 4 et 5 n'étant pas ordonnées officiellement, l'ordre entre elles n'affecte pas le score.

**Départage des ex æquo** (dans l'ordre) : gagnante trouvée → podium complet → score du top 15 → soumission la plus précoce.

**Anti-triche** :
- Les picks des autres sont masqués jusqu'au verrouillage de chaque étape (vérifié côté serveur).
- Toute soumission est refusée après verrouillage.
- Les fenêtres live ne se ferment que par le verrouillage manuel de l'admin.

Le barème complet est centralisé dans [`lib/rules.ts`](lib/rules.ts).

> **Astuce** : la taille de la 1ʳᵉ étape est paramétrable — pour passer à un top 12 au lieu d'un top 15, il suffit de changer `size: 15` en `size: 12` dans `RULES.top15` ([`lib/rules.ts`](lib/rules.ts)). Le maximum de points, les écrans joueur/admin et les vérifications serveur suivent automatiquement.

## Photos des candidates

Les portraits officiels des 31 candidates sont affichés au-dessus de leur nom de région (grille de sélection et podium), et celui de la miss élue dans l'encart final — avec son **prénom et nom** (source : tableau des candidatures de la page Wikipédia « Miss France 2027 »). Ces images sont **sous droits** (crédit : B. Decoin / Sipa / TF1) : [`lib/photos.ts`](lib/photos.ts) ne stocke que des **liens** vers les photos telles que publiées par 20 Minutes — aucun fichier image n'est embarqué dans ce dépôt. L'usage est réservé au cercle privé des joueurs du salon. En cas d'indisponibilité d'une photo, un repli discret (initiale de la région) s'affiche.

## Lancer en local

```bash
npm install
npm run dev
# http://localhost:3000
```

La base SQLite est créée automatiquement dans `data/` (chemin configurable via `DB_DIR`).

## Tests

```bash
npm test          # tests unitaires du moteur de scoring
npm run build     # vérification TypeScript + build
node tests/e2e.mjs  # simulation complète d'une soirée (serveur requis sur :3112)
```

## Déroulé d'une soirée

1. L'admin crée le salon — les 31 candidates Miss France 2027 sont préchargées (ajustables dans la console admin)
2. L'admin copie le lien d'invitation (bouton sur l'écran salon) et l'envoie à ses amis ; chacun rejoint avec un pseudo
3. Début du direct : chacun coche ses 15 régions pendant les défilés/portraits
4. L'admin verrouille juste avant l'annonce → les picks se révèlent, les scores tombent en direct
5. L'admin saisit le top 15 réel au fil des annonces (ajout incrémental, par région dans une liste déroulante), ouvre la fenêtre top 5 (~15-20 min)
6. L'admin saisit le top 5 réel (l'ordre n'importe pas à cette étape), ouvre la fenêtre classement
7. Pendant le couronnement, l'admin saisit le classement des 5 finalistes dans l'ordre (gagnante, 1re dauphine, 2e dauphine, puis 4ᵉ et 5ᵉ — l'ordre officiel des deux dernières n'étant pas annoncé, il est à l'appréciation de l'admin et le score des places 4-5 reste indulgent), puis verrouille et termine la soirée → classement final + stats

## Déployer

L'app nécessite un système de fichiers persistant pour la base SQLite (un petit VPS, Railway, Render ou Fly.io conviennent ; le stockage serverless type Vercel ne conserve pas `data/`). Sur Render par exemple :

- Build : `npm install && npm run build`
- Start : `npm run start`
- Ajouter un disk persistant monté sur le dossier de l'app et définir `DB_DIR`
