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

1. L'admin crée le salon, importe les 30 régions candidates (une région par ligne), partage le code
2. Les amis rejoignent avec le code + un pseudo
3. Début du direct : chacun coche ses 15 régions pendant les défilés/portraits
4. L'admin verrouille juste avant l'annonce → les picks se révèlent, les scores tombent en direct
5. L'admin saisit le top 15 réel, ouvre la fenêtre top 5 (~15-20 min)
6. L'admin saisit le top 5 réel (ordre du podium : gagnante, 1re dauphine, 2e dauphine, puis 4e/5e), ouvre la fenêtre classement
7. Couronnement → classement final + stats de la soirée

## Déployer

L'app nécessite un système de fichiers persistant pour la base SQLite (un petit VPS, Railway, Render ou Fly.io conviennent ; le stockage serverless type Vercel ne conserve pas `data/`). Sur Render par exemple :

- Build : `npm install && npm run build`
- Start : `npm run start`
- Ajouter un disk persistant monté sur le dossier de l'app et définir `DB_DIR`
