# KPI-Card

**Composer, consulter et documenter ses tableaux de bord KPI dans une interface commune.**

KPI-Card est une application Streamlit en français. Son accueil rassemble des tableaux
de bord personnalisables, composés de textes et titres, graphiques, cartes de chiffres clés,
séparateurs, tableaux de données brutes et encadrés modifiables en lecture.
Un catalogue explique la définition métier et technique des indicateurs.

> **État actuel : POC local avec données fictives.** L'éditeur, les objectifs et le
> catalogue sont implémentés. L'identification des utilisateurs, le partage et la
> sauvegarde centralisée dans Databricks restent à développer.
>
> **Cible confirmée : Databricks Apps, avec stockage et calcul des données dans Databricks.**

## Objectif et utilisateurs

L'application doit permettre aux équipes métier et aux responsables d'activité de :

- Retrouver leurs tableaux et, à terme, ceux partagés par leurs collègues.
- Composer leurs rapports sans écrire de code.
- Choisir des indicateurs, leur période et leurs objectifs.
- Comprendre les résultats et accéder aux données qui les composent.
- Consulter une définition commune de chaque KPI.

La cible de production comprend **plusieurs centaines d'indicateurs**, calculés sur
des dizaines de milliers à plusieurs millions de lignes. Cette volumétrie devra être
traitée dans Databricks ; le POC actuel sert à construire l'expérience utilisateur.

## Fonctionnalités réalisées

| Domaine | Disponible dans le POC |
| --- | --- |
| Accueil | Hub, recherche, ouverture, création, modification et suppression des tableaux ; annulation de la dernière suppression pendant la session. |
| Exemples | Quatre modèles : Vue d'ensemble, Performance commerciale, Suivi des projets, Satisfaction client. |
| Favoris | Ajout/retrait d'un favori et filtre des tableaux favoris. |
| Éditeur | Mode édition, panneau latéral, grille de six colonnes, ajout et déplacement par glisser-déposer ou par clic. |
| Blocs | Texte (Titre 1, Titre 2 ou paragraphe), Graphique, Carte, Séparateur, Tableau de données et Encadré ; largeur de une à six colonnes selon la place disponible. |
| Composition | Alignement du texte, séparateurs configurables, encadrés information/vigilance/décision et duplication indépendante des blocs. |
| Tableau | Sources Ventes, Opérations ou Retours clients ; pagination 10/25/50 lignes ; tri et filtres depuis les en-têtes en lecture. Les anciens tableaux manuels sont conservés. |
| Encadré vivant | Saisie du titre et de la note en lecture, avec Enregistrer la note et Annuler la saisie. |
| Filtres des blocs | Conditions sur les colonnes sources, appliquées avant calcul aux cartes, graphiques, données détaillées et CSV. |
| Paramétrage | Rubriques repliables : Contenu, Données et période, Filtres, Objectif, Présentation et Disposition, selon le bloc. |
| Graphiques | Barres ou courbes ; choix du KPI ; période héritée du tableau ou spécifique au bloc. |
| Objectifs | Mode simple et mode avancé avec douze valeurs mensuelles ; minimum à atteindre ou plafond à respecter. |
| Comparaison | Valeur cible, écart absolu et relatif, statut et jauge sur les cartes ; ligne d'objectif sur les graphiques. |
| Données brutes | Ouverture depuis une carte ou un graphique, pagination et téléchargement CSV des lignes du calcul. |
| Catalogue KPI | Recherche, filtre par source, définition métier, méthode de calcul, données utilisées, SQL documenté et implémentation JavaScript. |
| Présentation | Header KPI-Card, fond commun et navigation Accueil / Catalogue KPI. |
| Sauvegarde locale | Collection JSON dans le navigateur, copie en session Streamlit, récupération de certaines anciennes compositions. |

### Données de démonstration

Trois tables fictives alimentent douze KPI :

| Table | Indicateurs |
| --- | --- |
| Ventes | CA HT, ventes conclues, panier moyen HT, taux de marge sur CA. |
| Opérations | Opérations enregistrées, opérations livrées, livraisons dans les délais, projets concernés. |
| Retours clients | Clients satisfaits, note moyenne, délai moyen de réponse, retours recueillis. |

Les données sont générées localement sur environ dix-huit mois. Les calculs actuels
s'exécutent en JavaScript. **Les requêtes présentées dans le catalogue sont des
équivalents documentés ; elles ne sont pas exécutées sur une base.**

### Périodes et objectifs

- Périodes des rapports : **12 mois glissants**, **année en cours**, **6 mois**,
  **3 mois**, **1 mois** et **1 semaine**.
- La période « année en cours » va du 1er janvier à aujourd'hui inclus.
- Les périodes glissantes suivent les bornes définies dans `data.js` ; les graphiques
  utilisent des points mensuels ou journaliers selon la période.
- L'objectif simple est **mensuel par défaut**. Les horizons annuel, semestriel,
  trimestriel et hebdomadaire sont également disponibles.
- Pour les KPI additifs, 1 000 par mois donne 12 000 sur une année civile complète
  et 6 000 sur six mois complets. Les mois partiels sont proratisés selon les jours
  couverts ; une période glissante peut donc différer légèrement du multiple nominal.
- Le mode avancé contient douze objectifs, de janvier à décembre, reconduits chaque
  année. Dès qu'une valeur est renseignée, les douze mois sont requis.
- Les taux, moyennes et nombres distincts suivent une règle de seuil. En mode avancé,
  leurs cibles sont moyennées selon les jours couverts, sans addition des pourcentages.

Les règles détaillées figurent dans le [README du composant](components/home_editor_frontend/README.md).

## Démarrer le projet

### Prérequis

- Python et `pip`. **Python 3.11 est une base conseillée pour préparer l'environnement** ;
  ce README ne constitue pas une validation de toutes les versions de Python.
- Un navigateur récent.
- La dépendance déclarée est `streamlit~=1.38.0` dans [requirements.txt](requirements.txt).

Le POC se lance sans compte Databricks, sans connexion à une base et sans secret.
Le frontend est constitué de fichiers HTML, CSS et JavaScript locaux : aucun serveur
Node.js ni étape de compilation npm n'est nécessaire.

Depuis la racine du dépôt cloné :

### Windows / PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run app.py
```

### Linux / macOS / environnement cloud

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m streamlit run app.py --server.address 0.0.0.0 --server.port 8501 --server.headless true
```

En local, ouvrir `http://localhost:8501`. Dans un environnement cloud, utiliser
l'aperçu ou le port exposé par cet environnement. `0.0.0.0` est l'adresse d'écoute
du serveur, pas une adresse à ouvrir dans le navigateur.

Lancer une seule instance sur le port choisi. Un composant qui ne charge pas peut
venir d'une ancienne instance ou de ressources mises en cache : examiner les logs,
le port utilisé et les URL des fichiers avant de modifier le composant.

## Parcours de découverte

1. Ouvrir l'un des quatre tableaux de démonstration.
2. Cliquer sur **Modifier**, sélectionner un bloc et ouvrir les rubriques de réglages.
3. Ajouter une carte ou un graphique, choisir un KPI et ajuster sa largeur.
4. Définir un objectif mensuel, puis personnaliser les mois dans **Avancé**.
5. Enregistrer ; cliquer sur un bloc en lecture pour consulter ses données et son CSV.
6. Ouvrir **Catalogue KPI** pour consulter la formule et les sources de l'indicateur.

## Organisation du code

```text
.
├── app.py                         # Point d'entrée et navigation Streamlit
├── app.yaml                       # Commande de lancement pour Databricks Apps
├── manifest.yaml                  # Métadonnées du projet
├── requirements.txt               # Dépendances Python
├── .streamlit/config.toml         # Thème Streamlit
├── assets/                        # Logo, bannière et fond SVG
├── styles/accueil.css             # Styles de la page et du cadre commun
├── pages/
│   ├── accueil.py                 # Hub et éditeur
│   └── catalogue_kpi.py           # Page Catalogue KPI
└── components/
    ├── header.py                  # En-tête et navigation
    ├── page_frame.py              # Cadre visuel commun
    ├── home_editor.py             # Pont Python / composant Streamlit
    └── home_editor_frontend/
        ├── index.html            # Structure et chargement des ressources
        ├── editor.js             # Hub, édition, réglages, données brutes
        ├── editor.css            # Styles du hub et de l'éditeur
        ├── layout.js             # Grille, placement et normalisation des blocs
        ├── content-blocks.js     # Textes, séparateurs, tableaux manuels et encadrés
        ├── dashboards.js         # Collection, exemples et migrations
        ├── filters.js            # Validation, filtrage typé, tri et pagination
        ├── interactive-blocks.js # Tableaux bruts, filtres et notes en lecture
        ├── data.js               # Sources fictives, KPI, périodes et CSV
        ├── targets.js            # Objectifs, prorata, comparaison et formatage
        ├── catalogue-model.js    # Documentation métier, données et SQL
        ├── catalogue.js          # Interface du catalogue
        ├── catalogue.css         # Styles du catalogue
        └── README.md             # Documentation technique détaillée
```

### Fonctionnement actuel

`app.py` ouvre une page Streamlit. Python monte le composant local déclaré dans
`components/home_editor.py`. Le frontend affiche l'interface, génère les données
de démonstration et gère les interactions.

La collection est enregistrée sous `kpi-card:dashboards:v2` dans le `localStorage`.
Le frontend la transmet aussi à Python via le protocole Streamlit Components v1 ;
Python la conserve dans `st.session_state["dashboard_collection"]`.

Cette sauvegarde appartient au navigateur et à l'origine de l'application. Elle
n'est pas associée à un compte et ne se synchronise pas entre ordinateurs.
Les compositions locales des utilisateurs ne font pas partie du dépôt GitHub.

### Contrat des blocs

Un bloc contient notamment `id`, `type`, `row`, `col`, `span` et `content`.
Les indices de position commencent à zéro. Un bloc KPI contient aussi `kpiId`,
`period`, `filters` et `target`. `period: "inherit"` suit la période du tableau.

```json
{
  "id": "carte-ca",
  "type": "card",
  "row": 0,
  "col": 0,
  "span": 2,
  "content": "Chiffre d’affaires HT",
  "kpiId": "revenue",
  "period": "inherit",
  "target": {
    "mode": "simple",
    "value": 1000,
    "period": "month",
    "direction": "at_least",
    "monthlyValues": [null, null, null, null, null, null, null, null, null, null, null, null]
  }
}
```

`target.mode` vaut `simple` ou `monthly`. Les objectifs appartiennent aux blocs :
enregistrer ou annuler un tableau inclut ses objectifs. La collection est en
version 2 ; la disposition interne `layout` est en version 1. Toute évolution du
format doit prévoir la reprise des sauvegardes existantes.

Les anciens blocs `title` sont repris en `text` avec `textStyle: "heading1"`,
sans changer leur contenu ni leur emplacement. Les champs éditoriaux sont optionnels :
`textStyle` et `align` pour les textes, `lineStyle` et `spacing` pour les séparateurs,
`table: {columns, rows}` pour les tableaux manuels, `tone` et `heading` pour les encadrés.
La collection reste en version 2 et la disposition en version 1. Le nouveau lecteur
accepte les anciens formats ; une ancienne version de l'application ne sait pas lire
les nouveaux types de blocs. Ne pas alterner anciennes et nouvelles versions sur
la même sauvegarde. Aucun contenu personnalisé existant n'est remplacé par un modèle.

### Filtres et interactions en lecture

Chaque carte, graphique et tableau brut accepte jusqu’à 20 conditions combinées avec ET,
en plus de sa période et des règles métier du KPI. Les filtres utilisent les colonnes
de la source : égalité, différence, texte contenant, bornes numériques ou dates, valeurs
vides/non vides. Les objectifs restent ceux saisis ; ils ne sont pas réduits par les filtres.

Les nouveaux blocs `table` enregistrent `sourceId`, `period`, `filters`, `sort` et
`pageSize`. Les anciens blocs avec `table: {columns, rows}` migrent vers `manualTable`
sans perte des saisies. Les tris et filtres changés en lecture sont sauvegardés localement ;
en édition, ils appartiennent au brouillon. Les notes se sauvegardent via **Enregistrer
la note** directement dans l’encadré. Aucune synchronisation entre utilisateurs.

## Cible de production Databricks

### Décisions confirmées et choix restants

| Sujet | Orientation |
| --- | --- |
| Hébergement | Databricks Apps, application Streamlit. |
| Stockage | Dans Databricks ; les données analytiques seront gouvernées dans Unity Catalog. |
| Volumétrie | Plusieurs centaines de KPI sur des volumes pouvant atteindre des millions de lignes. |
| Calcul | Préparations réutilisables et requêtes SQL paramétrées exécutées dans un SQL Warehouse. |
| Métadonnées des rapports | Stockage central à implémenter ; Lakebase PostgreSQL est une option proposée, le choix Lakebase ou tables Delta reste à confirmer. |
| Identité et partage | Identité authentifiée Databricks, propriétaire et droits de lecture/modification par tableau. À implémenter. |

`app.yaml` définit actuellement la commande `streamlit run app.py`. Il ne configure
pas à lui seul l'identité applicative, les ressources SQL, les permissions ou une
base de sauvegarde. Le déploiement de production reste à préparer.

### Calcul des indicateurs

L'architecture envisagée prépare les jointures et agrégats coûteux dans des tables
Gold ou vues matérialisées. Un grain quotidien, avec les dimensions nécessaires,
permet de calculer plusieurs périodes à partir d'une même préparation.

L'application demande uniquement les KPI visibles dans le rapport, avec les dates
et filtres sélectionnés. Elle regroupe les calculs compatibles et reçoit les totaux
et séries à afficher. Les données brutes sont demandées au clic, avec pagination
côté serveur ; les exports volumineux nécessiteront un traitement adapté.

Règles à conserver lors du passage au SQL :

- Additionner les montants et comptages lorsque leur grain le permet.
- Recalculer les taux avec la somme des numérateurs et dénominateurs.
- Recalculer les moyennes avec les sommes et effectifs correspondants.
- Prévoir un traitement spécifique pour les distincts, stocks et percentiles.
- Définir la date métier, le fuseau, la fraîcheur attendue et les dimensions de chaque KPI.
- Répercuter aussi les corrections historiques dans les préparations.

Les Metric Views peuvent servir de couche commune de définition des mesures.
Leur intégration dépendra des capacités de l'environnement retenu.
[Documentation Databricks sur les Metric Views](https://docs.databricks.com/aws/en/uc-semantics/metric-views/query).

### Sauvegarde et partage à développer

Le modèle envisagé comprend quatre entités :

- `users` : identifiant interne, identité externe et email d'affichage/recherche.
- `dashboards` : propriétaire, nom, configuration JSON, révision et dates de modification.
- `dashboard_members` : utilisateurs autorisés et rôle lecteur/éditeur.
- `dashboard_preferences` : favoris et préférences propres à chaque utilisateur.

La configuration JSON contient la disposition et les objectifs de chaque bloc.
Le partage donne accès au même tableau. La sauvegarde contrôle les droits et la
révision côté serveur pour éviter les écrasements entre éditeurs.

Le type `JSONB` concerne l'option PostgreSQL/Lakebase. Une implémentation sur Delta
doit adapter les types, les contraintes et les opérations d'écriture. Le backend
devra également appliquer les droits sur les données sources et les exports.

## Reprendre le développement avec Codex depuis GitHub

### Préparer le dépôt

Publier le code Python, les pages, les fichiers du composant frontend, les SVG,
les styles, les configurations non secrètes, `requirements.txt` et les README.
Le projet doit pouvoir être lancé depuis un clone sans dépendre de chemins Windows
personnels ni des fichiers de configuration de PyCharm.

Le `.gitignore` actuel exclut notamment `.venv`, les caches Python, `.env`, `.idea`
et `.databricks`. Avant publication, exclure également tout fichier de secrets
éventuel, notamment `.streamlit/secrets.toml`, et examiner les fichiers à publier.
Le fichier `.streamlit/config.toml` contient le thème et peut être versionné.

### Préparer l'environnement cloud

1. Connecter le dépôt GitHub à l'environnement Codex autorisé pour ce projet.
2. Préparer Python et les dépendances avec les commandes Linux ci-dessus.
3. Configurer le lancement de Streamlit sur le port exposé par l'environnement.
4. Enregistrer/publier la configuration de l'environnement, puis démarrer une tâche
   sur le dépôt et la branche de travail souhaités.
5. Relire les modifications et les intégrer via le workflow GitHub de l'équipe.

Les modalités de configuration et d'accès dépendent de l'environnement disponible
dans votre compte. Voir la [documentation officielle des environnements Codex cloud](https://learn.chatgpt.com/docs/environments/cloud-environments).

Pour travailler sur le POC, aucun accès Databricks ni secret n'est nécessaire.
Le raccordement réel demandera ensuite les ressources, permissions et accès réseau
de développement appropriés. Conserver les identifiants hors du dépôt.

### Contexte à transmettre à Codex

```text
Tu travailles sur KPI-Card, un POC Streamlit destiné à Databricks Apps.
Lis README.md et components/home_editor_frontend/README.md avant de modifier le projet.
Le frontend est en HTML/CSS/JavaScript natif, sans build npm.
Préserve le hub, tous les types de blocs, la grille de six colonnes, les favoris,
les objectifs simples et mensuels avancés, le catalogue KPI et les exports CSV.
La sauvegarde actuelle est locale ; l'identité, le partage et le stockage Databricks
sont des évolutions à réaliser, pas des fonctionnalités déjà présentes.
Conserve un mode démonstration utilisable sans secrets ni connexion à Databricks.
Pour cette tâche, réalise : [décrire précisément l'évolution attendue].
Explique les fichiers modifiés, les éventuelles migrations et les vérifications
effectivement réalisées. N'annonce pas un accès ou un déploiement qui n'a pas eu lieu.
```

### Repères pour les contributions

- Garder les textes d'interface en français et l'identité visuelle KPI-Card.
- Étendre les modules existants selon leur responsabilité, en préservant les sauvegardes.
- Centraliser les règles KPI, périodes et objectifs ; maintenir leur documentation cohérente.
- Préserver l'accessibilité clavier et les alternatives au glisser-déposer.
- Éviter les requêtes réseau externes nécessaires au chargement du frontend local.
- Actualiser les paramètres `?v=` de `index.html` après modification d'un asset :
  ils correspondent aux douze premiers caractères du SHA-256 du fichier concerné.
- Lors du raccordement au serveur, traiter les données du navigateur comme des entrées
  à valider et conserver les contrôles d'accès dans Python.
- Le composant initialise actuellement sa collection une seule fois et privilégie
  le stockage local : adapter ce comportement pour recevoir les réponses serveur,
  les changements de compte et les nouvelles révisions.

## Prochaines étapes

1. Définir les ressources Databricks et le stockage des métadonnées.
2. Ajouter un accès aux données avec une implémentation de démonstration et une implémentation Databricks.
3. Identifier les utilisateurs et centraliser la sauvegarde des tableaux et objectifs.
4. Ajouter le partage, les rôles et la gestion des modifications concurrentes.
5. Raccorder quelques KPI représentatifs au SQL Warehouse, puis mesurer leurs performances.
6. Étendre le catalogue, les préparations et les règles de données aux autres KPI.
7. Préparer les migrations, les vérifications automatisées et le déploiement de production.

## Vérifications et limites

Les commandes de démarrage ci-dessus sont des instructions de mise en route.
Le dépôt fournit des tests ciblés des blocs et de leur compatibilité. Depuis la
racine, avec une version récente de Node.js (20 ou supérieure), exécuter :

```bash
node --test tests/content-blocks.test.cjs tests/filters.test.cjs
```

Node.js sert uniquement à ces tests : il n'est pas nécessaire au lancement de l'application.
Aucun pipeline CI ni benchmark Databricks n'est fourni ici.

Lors d'une tâche de validation, couvrir notamment : création/édition/annulation,
collisions de blocs, rechargement des sauvegardes, objectifs nuls ou invalides,
mois partiels, changement de KPI, catalogue et export des lignes filtrées.
La production devra aussi couvrir l'isolation entre comptes, les droits de partage,
les conflits de révision et les performances sous charge.

## Documentation complémentaire

- [Guide technique du composant et règles détaillées](components/home_editor_frontend/README.md)
- [Point d'entrée](app.py)
- [Dépendances Python](requirements.txt)
- [Commande de lancement Databricks Apps](app.yaml)

Ce README est le point d'entrée du projet pour les contributeurs et les agents de
développement. Il distingue le code livré des décisions d'architecture et des
fonctionnalités restant à implémenter.
