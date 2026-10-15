# AGENTS.md — consignes pour Codex

## Démarrer une tâche

- Lire `README.md` et, pour toute modification du hub, de l’éditeur, des KPI, des objectifs ou du catalogue, lire aussi `components/home_editor_frontend/README.md`.
- Vérifier les fichiers et le comportement existants avant de modifier. Suivre la structure du dépôt et garder les changements ciblés.
- Le projet est un POC Streamlit en français. Préserver son mode de démonstration, qui doit fonctionner sans compte Databricks, secrets, base de données ni service externe.
- Ne pas présenter comme livrée une fonction décrite comme cible ou prochaine étape dans le README.

## Architecture à respecter

- `app.py` configure Streamlit et enregistre les pages. `pages/accueil.py` et `pages/catalogue_kpi.py` composent le cadre commun (`components/page_frame.py`) et le composant correspondant.
- `components/home_editor.py` est le pont Python vers le composant Streamlit Components v1 déclaré depuis `components/home_editor_frontend/`. Il transmet la collection à la session Streamlit. Le frontend est du HTML, CSS et JavaScript natif : aucun build npm n’est configuré.
- Dans le frontend, conserver les responsabilités existantes : `editor.js` gère les interactions et le pont Streamlit ; `layout.js` valide et place les blocs ; `dashboards.js` valide et gère les tableaux ; `data.js` définit les sources fictives, le registre KPI, les périodes et le CSV ; `targets.js` porte les règles d’objectifs ; `catalogue-model.js` documente le métier et produit les exemples SQL ; `catalogue.js` et les feuilles CSS portent la présentation.
- Garder les ressources frontend locales. Ne pas ajouter de dépendance réseau nécessaire au chargement de l’application.
- Les styles communs de page sont dans `styles/accueil.css`, le thème Streamlit dans `.streamlit/config.toml`, et les ressources visuelles dans `assets/`.

## Contrats fonctionnels et données

- Garder les textes d’interface en français et respecter l’identité visuelle KPI-Card.
- Préserver la grille de six colonnes, les blocs texte (Titre 1, Titre 2, paragraphe), graphique, carte, séparateur, tableau brut (et anciens tableaux manuels) et encadré, les alternatives au glisser-déposer (clic, clavier ou tactile), et l’accessibilité clavier. Les anciens blocs `title` sont migrés en `text` de niveau 1. `content-blocks.js` centralise les schémas et la présentation des blocs éditoriaux.
- La collection enregistrée est actuellement en version 2 sous `kpi-card:dashboards:v2` dans le `localStorage`. La disposition des blocs est en version 1. Les tableaux, favoris, périodes, KPI et objectifs y sont enregistrés ; les lignes de démonstration sont régénérées.
- Toute évolution du format sauvegardé doit accepter les données antérieures, prévoir une migration explicite, préserver les saisies personnalisées et rester compatible avec les limites et validations centralisées dans `dashboards.js` et `layout.js`. Ne jamais supposer que la collection du navigateur est valide.
- Un bloc KPI possède notamment `kpiId`, `period`, `filters` et `target`. `period: "inherit"` suit la période du tableau. Les changements de KPI doivent conserver les règles du projet sur la réinitialisation des objectifs, leurs unités et leur validation.
- Ajouter ou modifier un KPI de façon cohérente dans le registre de `data.js`, sa définition et son calcul, sa documentation et son SQL dans `catalogue-model.js`, ainsi que les éventuels exemples et migrations concernés. Garder cohérents les libellés, unités, filtres, granularités et agrégations.
- Ne pas additionner les taux, moyennes ou nombres distincts pour produire un total : recalculer selon la définition du KPI. Documenter les règles de dates inclusives, périodes partielles, fuseau et valeurs sans observation quand elles sont concernées.
- Le CSV est une sortie utilisateur : préserver le format attendu (UTF-8 avec BOM, séparateur point-virgule, décimales françaises) et la protection contre l’injection de formules dans les tableurs.

- `filters.js` centralise la validation, le filtrage typé, le tri et la pagination ; `interactive-blocks.js` porte leurs interfaces et les notes en lecture. Préserver les filtres scalaires et les sélections multiples `in`/`notIn` (OU entre valeurs, ET entre conditions). Utiliser le schéma explicite en priorité, sinon la détection de type conservatrice sans dépendre des noms de colonnes. Appliquer les filtres avant les calculs et conserver le même périmètre dans le détail et le CSV. Préserver la migration des anciennes tables vers `manualTable`. Les interactions en lecture sauvegardent localement, en édition elles restent dans le brouillon.

- `chart-styles.js` centralise les présentations des séries et préserve les ruptures sur données manquantes. Les répartitions catégorielles recalculent les agrégats par groupe ; les anneaux sont réservés aux KPI additifs, positifs et sans catégorie négative. Ne pas répartir implicitement un objectif global. Les trois sections du panneau et leurs sous-rubriques sont fermées au début de chaque session d’édition ; les actions de sélection et erreurs ouvrent les rubriques nécessaires.

- `report-analysis.js` valide les filtres globaux par source. Ne jamais les appliquer à une autre source implicitement. Comparer des fenêtres inclusives, contiguës et de même durée, avec les mêmes filtres. Les exports de catégorie ou de période précédente doivent reprendre exactement les lignes du détail. Préserver `globalFilters` et `comparison` lors de toute sauvegarde du rapport.

## Frontend et cache

- Après toute modification d’un fichier CSS ou JavaScript chargé par `components/home_editor_frontend/index.html`, recalculer son SHA-256 et remplacer le paramètre `?v=` correspondant par ses 12 premiers caractères hexadécimaux. Faire de même pour tout nouvel asset chargé avec cette convention.
- Conserver l’ordre de chargement des scripts dans `index.html` : les modules partagés doivent précéder les modules qui les utilisent.
- Si le composant ne se recharge pas, vérifier d’abord le port, les logs et les URL versionnées des ressources avant de modifier le code ; éviter de lancer plusieurs instances Streamlit sur le même port.

## Databricks Apps et sécurité

- `app.yaml` lance actuellement `streamlit run app.py`, et `requirements.txt` ne déclare que `streamlit~=1.38.0`. Toute nouvelle dépendance Python doit être nécessaire, documentée et ajoutée à `requirements.txt`.
- La cible Databricks Apps n’est pas encore un backend de production : il n’existe pas actuellement de connexion SQL, stockage centralisé, identité applicative, partage de tableaux ou contrôle serveur des rôles. Le SQL montré dans le catalogue est un équivalent documenté, non exécuté.
- Ne pas ajouter de secrets, jetons, données réelles, fichiers locaux utilisateur ou identifiants au dépôt. Utiliser le mécanisme de secrets approprié à l’environnement si un raccordement Databricks est demandé.
- Lors d’un futur raccordement serveur, valider côté serveur toutes les entrées reçues du navigateur et appliquer les autorisations aux tableaux, données et exports. Ne pas traiter le `localStorage` comme une source fiable.
- Pour des taux, moyennes, distincts, stocks ou percentiles côté Databricks, respecter la définition métier et le grain de données ; ne pas agréger des résultats pré-calculés de façon mathématiquement incorrecte.
- Ne pas affirmer qu’un déploiement Databricks ou un accès à des données réelles a été réalisé sans preuve de cette action.

## Conventions et workflows du dépôt

- Garder les noms de fichiers et modules existants et utiliser les chemins relatifs au dépôt. Éviter les chemins personnels ou les dépendances à PyCharm.
- Le lancement local documenté est : créer un environnement virtuel, installer `requirements.txt`, puis lancer `streamlit run app.py`. Aucune étape npm n’est requise.
- Les tests ciblés des blocs se lancent avec `node --test tests/content-blocks.test.cjs tests/filters.test.cjs` (Node.js 20+ ; inutile pour lancer l'application). Aucun workflow CI ni build npm n'est configuré. Pour une validation, effectuer les vérifications adaptées à l’environnement disponible, puis distinguer clairement ce qui a été vérifié de ce qui ne l’a pas été.
- `.gitignore` exclut notamment les environnements virtuels, caches Python et fichiers `.env`. Avant toute contribution, ne pas ajouter de secrets ni de configuration locale ; garder les configurations de déploiement non sensibles.
- Pour une contribution, résumer les fichiers touchés, les changements de format ou migrations, les vérifications réellement effectuées et les limites restantes. Ne pas déclarer une fonctionnalité terminée si elle n’est que documentée ou simulée.


- `report-blocks.js` porte les sections, séparateurs verticaux et plans d’action.
  Préserver les sections pleine largeur, sans imbrication, les replis sans mutation
  des coordonnées et les actions bornées à 50 avec dates civiles valides. Les
  catégories de palette se ferment au début de l’édition. En présentation, aucune
  interaction ne sauvegarde un changement ; conserver exploration et sortie clavier.
  Le lien d’information KPI ouvre le catalogue ciblé dans un nouvel onglet.

- Les badges sont centralisés dans `Dashboards.BADGES` ; conserver les catégories
  historiques et combiner le filtre Badge avec recherche et favoris. Le plan
  d’action est fusionné avec les encadrés dans « Notes et actions ». Les colonnes
  se configurent dans l’inspecteur ; le CRUD des post-it fonctionne en lecture
  via `updateInteractiveBlock`, avec sauvegarde locale et annulation des saisies.
  En présentation et en édition du rapport, les actions restent en consultation.

- `postit-board.js` porte les colonnes et les post-it. Au plus `span` colonnes,
  deux par défaut (une si largeur 1). Réduire la largeur ou le nombre de colonnes
  regroupe les notes dans la dernière colonne sans les supprimer. Les anciens
  encadrés migrent dans `layout.js` sans perdre texte, titre ni badge ; les anciens
  statuts sont conservés. La colonne seule indique l’avancement ; le statut historique ne sert qu’à la migration.
- Les poignées de largeur suivent les mêmes contraintes que les réglages :
  six colonnes, pas de chevauchement, section toujours 6, séparateur vertical 1.
  Préserver le clavier, la capture pointeur, Échap et Annuler le brouillon.


Le suivi des post-it repose uniquement sur leur colonne : la case « Action terminée »,
le badge de statut et la progression globale sont retirés. Le filtre d’avancement
est remplacé par un filtre sur les colonnes configurées.
