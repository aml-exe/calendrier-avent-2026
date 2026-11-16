# Calendrier de l'Avent des bonnes nouvelles 2026

Un sapin de Noël décoré de 24 cadeaux, un par jour du 1er au 24 décembre, plus l'étoile du 25.
Chaque cadeau s'ouvre à minuit, heure de Paris, et livre une bonne nouvelle de 2026.

## Organisation

| Dossier / fichier      | Rôle                                                                 |
|------------------------|----------------------------------------------------------------------|
| `contenu/cases.json`   | Les 25 bonnes nouvelles (texte, titre, emoji). Seul fichier à éditer pour le contenu. |
| `src/`                 | La page (HTML, CSS, JavaScript), sans aucun contenu de case.         |
| `build.ps1`            | Fabrique le site dans `dist/` pour une date donnée.                  |
| `dist/`                | Le site généré, prêt à publier (non versionné).                      |

## Règle de sécurité : une case future n'est pas envoyée

Le navigateur du visiteur ne reçoit **que** le contenu des cases déjà ouvertes.
`build.ps1` lit la date du jour à Paris et n'écrit dans `dist/` que les cases dont le jour est arrivé.
Pour une case future, la page ne reçoit que son numéro et sa date d'ouverture : rien à fouiller dans le code source.

## Construire et regarder le calendrier

Depuis PowerShell, dans ce dossier :

```powershell
# Le calendrier tel qu'il est aujourd'hui (date de Paris)
.\build.ps1

# Le calendrier tel qu'il sera le 12 décembre, en mode construction
.\build.ps1 -Date 2026-12-12 -Dev
```

Puis ouvrir `dist/index.html` dans le navigateur.

En mode `-Dev`, un bandeau rappelle la date simulée et les cases sans contenu sont signalées par ⚠.
Le script les liste aussi dans le terminal.

## Mise en ligne (GitHub Actions + GitHub Pages)

Le robot `.github/workflows/mettre-en-ligne.yml` lance `robot.ps1` :

- à chaque point de sauvegarde envoyé sur `main` ;
- toutes les 5 minutes (planifié) : il ne publie que si quelque chose a changé ;
- chaque nuit à 23h01 UTC, soit 0h01 à Paris en hiver (UTC+1) ;
- à la demande, via le bouton « Run workflow » de l'onglet Actions (même traitement exact).

Les dates se comptent à l'heure de Paris. Le robot travaille en UTC : en décembre, minuit à Paris = 23h00 UTC.
Le passage toutes les 5 minutes rattrape un passage en retard ou sauté, et suit aussi l'heure d'été.

À chaque passage, le robot :
1. relit l'état publié (`etat.json` du site) ;
2. construit le calendrier ; les cadeaux déjà publiés restent ouverts ;
3. vérifie qu'aucun cadeau n'est publié trop tôt et qu'aucun texte de cadeau fermé n'est dans le site ;
4. publie seulement s'il y a du nouveau : le lancer deux fois de suite ne change rien ;
5. écrit le journal (heure, mode, cadeaux ouverts) dans le résumé du passage (onglet Actions) et dans `etat.json`.

Si une étape échoue, rien n'est publié : la version précédente reste en ligne et l'échec apparaît en rouge dans l'onglet **Actions**.

### Mode soirée et rythme normal

Un seul réglage, la variable de dépôt `MODE` (Settings > Secrets and variables > Actions > Variables) :

| `MODE`   | Rythme |
|----------|--------|
| `normal` (ou absente) | un cadeau par jour à minuit, heure de Paris |
| `soiree` | un cadeau toutes les 5 minutes à partir de `SOIREE_DEPART` (« AAAA-MM-JJ HH:mm », heure de Paris) |

Le mode en cours s'affiche en haut et en bas de la page, et dans le journal.

Après une soirée, les cadeaux ouverts restent ouverts et se relisent.
Pour les refermer avant le vrai mois de décembre : « Run workflow » en cochant « Refermer les cadeaux ouverts en avance ».

Le bas de la page affiche la version en ligne (les 7 premiers caractères du point de sauvegarde) et l'heure de construction.
`version.txt` à la racine du site donne la même information.

## Après le 24 décembre

Le 25, l'étoile au sommet du sapin s'ouvre avec la 25e nouvelle et les vœux.
Ensuite, toutes les cases restent ouvertes : le calendrier devient un souvenir à relire, avec les vœux de bonne année 2027.
