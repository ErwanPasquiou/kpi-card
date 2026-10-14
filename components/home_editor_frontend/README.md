# KPI-Card — hub, éditeur de tableaux de bord et catalogue KPI

Le composant est monté par `components/home_editor.py` sous le header existant.
Il est autonome : aucun serveur de développement JavaScript ni paquet npm requis.

Les pages `pages/accueil.py` et `pages/catalogue_kpi.py` sont enregistrées dans
`app.py`. Le header permet de passer de l'accueil au **Catalogue KPI** (route
`catalogue-kpi`). `components/page_frame.py` applique leur fond et leur en-tête communs.

Les liens CSS et JavaScript de `index.html` portent une version correspondant
aux 12 premiers caractères de leur SHA-256. Après modification d'une ressource,
actualiser son paramètre `?v=` pour éviter le mélange de versions dans le cache
du navigateur (Streamlit autorise la mise en cache de ces fichiers).

## Utilisation

1. L'accueil rassemble les tableaux enregistrés. **Ouvrir** affiche un tableau,
   **Modifier** ouvre son éditeur, et l'icône corbeille le supprime.
   **Annuler la suppression** restaure le dernier tableau supprimé tant que la page reste ouverte.
   L'étoile ajoute ou retire un **favori**. Le filtre **Favoris** les rassemble ;
   les favoris apparaissent également en tête de la collection complète.
2. **Nouveau tableau de bord** permet de nommer un tableau et de partir d'une
   page vierge ou de l'un des quatre modèles. Il rejoint la collection après **Enregistrer**.
3. Dans l'éditeur, modifier le nom, la description et la période par défaut dans le panneau latéral.
   Glisser **Texte**, **Graphique**, **Carte**, **Séparateur**, **Tableau** ou **Encadré** vers une case libre. Il est aussi
   possible de cliquer sur un type de bloc, puis sur une case (souris, clavier ou tactile).
4. Sélectionner un bloc pour changer son contenu et sa largeur dans le panneau.
   Les réglages sont regroupés en rubriques repliables : **Contenu**, **Données et
   période**, **Filtres**, **Objectif**, **Présentation** et **Disposition**, selon le type de bloc.
   Leur état ouvert ou fermé est conservé pendant la session pour chaque bloc.
   Les largeurs dépassant le prochain bloc ou la fin de ligne sont désactivées.
5. Utiliser la poignée pour le déplacer, ou **Déplacer** puis choisir une case.
   Au dépôt, la largeur est réduite si nécessaire pour tenir dans l'espace libre.
6. **Enregistrer** valide la disposition ; **Annuler** restaure la dernière version
   enregistrée. **Échap** annule un placement en cours.
   **Tous les tableaux** ramène ensuite à l'accueil.
7. Un bloc **Graphique** ou **Carte** permet de choisir son **KPI** parmi les trois
   tables et sa **période**. Une carte affiche la valeur agrégée ; un graphique
   affiche cette valeur et son évolution par mois ou par jour, en barres ou en courbe.
8. Cliquer sur un graphique ou une carte en lecture ouvre ses **données brutes**.
   En édition, utiliser **Voir les données** dans le bloc ou les réglages.
   La formule, les dates et le nombre de lignes sont affichés. **Télécharger en CSV**
   exporte toutes les lignes du calcul, au-delà des 50 lignes affichées par page.
   **Retour** ou **Échap** ferme cette vue sans perdre le travail en cours.
9. **Données de démo**, dans le hub, permet de parcourir et d'exporter les trois
   tables sources, en choisissant une période.
10. Dans les réglages d'un graphique ou d'une carte, renseigner une valeur
    **Objectif**, sa période (**mensuel** par défaut, **année**, **6 mois**, **3 mois**,
    **semaine**) et son sens (**minimum à atteindre** ou **plafond à respecter**).
    L'onglet **Simple** répète cette cible ; l'onglet **Avancé** utilise 12 valeurs
    personnalisées, de janvier à décembre. Son premier accès reprend la répartition
    de la cible simple si elle existe. Modifier ensuite chaque mois indépendamment.
    La cible adaptée au rapport est immédiatement affichée dans les réglages.
    **Retirer l'objectif** vide les deux modes.

## Exemples fournis

### Blocs éditoriaux

- **Texte** regroupe les anciens textes et titres. Dans Contenu, choisir **Titre 1**,
  **Titre 2** ou **Texte**, puis un alignement gauche, centré ou droite. Les retours
  à la ligne sont conservés ; le HTML saisi reste du texte.
- **Séparateur** occupe six colonnes par défaut. Son libellé est facultatif ; choisir
  un trait continu, en tirets ou en pointillés et un espacement compact, normal ou aéré.
- **Tableau** affiche les lignes brutes d’une source fictive, avec une période héritée
  ou propre au bloc et 10, 25 ou 50 lignes par page. Cliquer sur un en-tête ouvre le
  tri croissant/décroissant et les filtres de cette colonne. Le tri porte sur toutes
  les lignes filtrées, avant pagination ; les valeurs manquantes viennent à la fin.
  Les changements en lecture sont enregistrés localement, ceux en édition restent
  dans le brouillon. Changer de source réinitialise tri et filtres.
- Les anciens **Tableaux manuels** restent modifiables et duplicables (6 colonnes,
  20 lignes, 240 caractères par cellule). Ils ne sont plus proposés à l’ajout.
- **Encadré** met en évidence une information, un point de vigilance ou une décision.
  En lecture, seul le titre et le texte apparaissent comme un post-it. Cliquer sur la note
  (ou Entrée/Espace au clavier) ouvre les champs, puis **Enregistrer la note** revient
  au post-it. Annuler ou Échap ferme la saisie sans la conserver.
  **Annuler la saisie** restaure la dernière note enregistrée. Sans enregistrement,
  quitter le rapport perd la saisie. La sauvegarde appartient à ce navigateur.
- **Dupliquer**, dans Disposition, crée une copie indépendante avec la même largeur
  au prochain emplacement libre (puis recherche depuis le début si nécessaire).
  Les KPI et objectifs sont également copiés. Une grille pleine affiche un message.

Le modèle **Vue d'ensemble** inclut un séparateur, un tableau brut des opérations et un
encadré de décision. Pour les découvrir avec une collection existante, créer un
nouveau tableau à partir de ce modèle ; les tableaux enregistrés ne sont pas modifiés.

### Compatibilité

`content-blocks.js` centralise les champs éditoriaux et leurs limites. `layout.js`
transforme les anciens `type: "title"` en `type: "text", textStyle: "heading1"`.
Le contenu, la position, la largeur et les autres blocs sont préservés. Un texte
sans style reçoit `paragraph`. La normalisation est idempotente et refuse les
tableaux non rectangulaires ou hors limites. Les champs de présentation inconnus
reviennent à des valeurs sûres ; toutes les saisies sont rendues avec `textContent`.

Les versions restent collection 2 / layout 1 avec champs optionnels. La compatibilité
est ascendante : un ancien lecteur ne reconnaît pas les nouveaux types. Éviter un
retour à l'ancien frontend sur la même collection. Les tests sont dans
`tests/content-blocks.test.cjs` et se lancent avec `node --test tests/content-blocks.test.cjs tests/filters.test.cjs`.

### Modèles

- Vue d'ensemble : chiffres clés, activité et priorités.
- Performance commerciale : chiffre d'affaires et ventes conclues.
- Suivi des projets : portefeuille, livraisons et jalons.
- Satisfaction client : satisfaction et retours recueillis.

Les aperçus du hub sont générés à partir des blocs enregistrés. Chaque tableau
possède sa propre copie des blocs. Les quatre modèles utilisent les mêmes tables
de démonstration et les mêmes calculs que les tableaux créés par l'utilisateur.

## Tables et KPI de démonstration

`data.js` génère environ 30 mois de lignes fictives jusqu'à la date de chargement
(Europe/Paris). Une graine propre à chaque journée rend les données reproductibles
pour une même date. Aucune base de données, aucun service externe ni import ne sont requis.

| Table | Granularité | KPI disponibles |
| --- | --- | --- |
| Ventes | Une ligne par vente | CA HT, ventes conclues, panier moyen HT, taux de marge sur CA |
| Opérations | Une ligne par opération | Opérations enregistrées, opérations livrées, livraisons dans les délais, projets concernés |
| Retours clients | Une ligne par retour | Clients satisfaits, note moyenne, délai moyen de réponse, retours recueillis |

Les KPI commerciaux retiennent uniquement les ventes gagnées. Le taux de livraison
dans les délais retient uniquement les opérations livrées et compare leur date
d'activité à l'échéance. La satisfaction correspond aux notes de 4 ou 5 sur 5.
Le nombre de projets est un nombre distinct sur la période, hors opérations annulées.
Les formules détaillées sont consultables dans les réglages et la vue des données.

La valeur totale est recalculée sur les lignes de la période : les taux et moyennes
ne sont pas calculés en faisant la moyenne des points du graphique. Les graphiques
comptent zéro pour une période sans ligne de comptage ; les moyennes et taux sans
ligne sont absents. La vue des données et le CSV utilisent exactement les lignes
filtrées utilisées par le KPI, triées de la date la plus récente à la plus ancienne.

Le CSV utilise UTF-8 avec BOM, un séparateur point-virgule, des décimales avec virgule,
des dates ISO et des champs entre guillemets. Les valeurs manquantes sont vides.
Les chaînes qui pourraient être interprétées comme des formules de tableur sont protégées.

## Filtres de blocs

`filters.js` valide et applique jusqu’à 20 conditions `{column, op, value}` combinées
avec ET. `interactive-blocks.js` porte le formulaire partagé, les tableaux et les notes.
Les cartes et graphiques proposent la rubrique **Filtres** dans leurs réglages.
Les colonnes proviennent de la source du KPI. Un changement de KPI conserve les filtres
si la source reste identique ; sinon ils sont retirés. Les objectifs restent inchangés
lors d’un changement de filtre ; adapter la cible au périmètre est un choix utilisateur.

**Est parmi** et **N’est pas parmi** proposent les valeurs distinctes de la source
sur la période du bloc, avant les autres filtres et les règles métier du KPI. Cocher
plusieurs valeurs, rechercher dans la liste et appliquer. Les choix d’une condition
sont combinés avec OU, les conditions entre elles avec ET. Une sélection vide est
refusée. Les valeurs nulles se filtrent avec Est vide / N’est pas vide. Jusqu’à 500
valeurs par condition ; listes rendues par lots de 100, avec Afficher davantage.
La recherche conserve les choix déjà cochés. Les anciens filtres scalaires restent lus.

Les types explicites du schéma sont prioritaires. Sinon `resolveTable` détecte les
nombres JavaScript finis, les dates ISO valides YYYY-MM-DD et le texte sur l’ensemble
des valeurs non nulles disponibles. Les colonnes mixtes ou entièrement vides restent
textuelles ; les chaînes numériques restent du texte pour préserver les identifiants
et leurs zéros initiaux. Aucun nom de colonne n’est utilisé pour décider du type.
La détection porte sur la source entière, avant restriction de période.

Les trois sources POC restent déclarées dans le registre. Un futur connecteur devra
fournir les lignes typées et/ou leur schéma à ce moteur : cette évolution ne réalise
pas un import universel ni une connexion Databricks. Les dates non ISO et timestamps
nécessiteront une normalisation explicite dans cet adaptateur. Pour les volumes de
production, la recherche des valeurs distinctes devra être paginée côté serveur.

Les textes sont comparés sans distinction de casse ou d’accents (`eq`, `ne`, `contains`).
Les nombres et dates acceptent `eq`, `ne`, `gte`, `lte`. Tous acceptent `empty` et
`notEmpty`. Une valeur nulle ou vide ne satisfait aucune autre comparaison, y compris
`ne`. Les dates sont des jours ISO valides, les bornes sont inclusives et les nombres
acceptent les espaces de groupement et la virgule décimale française.

Le filtrage précède le calcul métier, le total et les séries. Détail et CSV reprennent
exactement les lignes du calcul. Le cache distingue les configurations de filtres et
reste borné à 100 résultats. Sans observation, les comptages/sommes valent zéro,
les moyennes/taux restent indéfinis. Les filtres sont locaux au bloc, jamais globaux.

Les tableaux `table` enregistrent `sourceId`, `period`, `filters`, `sort`, `pageSize`.
Les anciens tableaux avec cellules migrent explicitement vers `manualTable`, avec
leur contenu conservé. Les blocs KPI sans `filters` reçoivent une liste vide.

## Périodes

- **12 mois glissants**, **6 mois**, **3 mois** et **1 mois** : du lendemain de la date située
  respectivement 12, 6, 3 ou 1 mois plus tôt jusqu'à aujourd'hui inclus. Le jour est
  ramené à la fin du mois lorsque nécessaire (février, par exemple).
- **Année en cours** : du 1er janvier jusqu'à aujourd'hui inclus.
- **1 semaine** : aujourd'hui et les six jours précédents.

Les bornes sont toujours affichées. Les périodes longues sont regroupées par mois
calendaire : les mois de début et de fin peuvent donc être partiels. Les périodes
**1 mois** et **1 semaine** sont regroupées par jour. Les données et la date de référence
sont actualisées au rechargement du composant.

Chaque tableau possède une période par défaut, également modifiable en lecture.
Chaque graphique ou carte peut la suivre ou choisir sa propre période. En édition,
ces changements sont enregistrés ou annulés avec les autres modifications du tableau.

## Objectifs des blocs

Chaque graphique ou carte enregistre son propre objet `target` :

- `mode` : `simple` ou `monthly` (onglet Avancé) ; seul le mode actif participe au calcul.
- `value` : valeur numérique simple ou `null`.
- `period` : `month` par défaut, `year`, `semester`, `quarter` ou `week`.
- `monthlyValues` : 12 valeurs numériques ou `null`, dans l'ordre janvier–décembre.
- `direction` : `at_least` ou `at_most`.

Les objectifs déjà enregistrés conservent leur valeur, leur période et leur sens,
en mode simple. Les blocs sans objectif reçoivent une cible mensuelle vide.
La virgule décimale et les espaces de groupement sont acceptés dans les champs.
Un objectif invalide bloque l'enregistrement, ouvre sa rubrique et pointe le champ
à corriger. Changer de KPI réinitialise les deux modes afin de ne pas réutiliser une
cible d'une autre unité. Changer d'onglet conserve les saisies de l'autre mode.

En avancé, les 12 valeurs sont reconduites chaque année, sans millésime. Dès qu'un
mois est renseigné, les 12 sont requis ; une valeur absente n'est jamais assimilée
à zéro. Pour un montant ou un comptage, saisir explicitement 0 pour un mois sans
objectif. Les 12 valeurs vides désactivent l'objectif avancé. **Reprendre l'objectif
simple** remplace les valeurs mensuelles par sa répartition ; pour une cible
hebdomadaire, ce préremplissage utilise les jours des mois de l'année de référence.

`targets.js` centralise la normalisation, le prorata, la comparaison et le formatage.
Le registre `data.js` indique la politique d'adaptation de chaque KPI :

- **CA HT et comptages de ventes, opérations, livraisons ou retours, mode simple** :
  la valeur mensuelle est utilisée directement ; une valeur annuelle est divisée
  par 12, semestrielle par 6 et trimestrielle par 3. Pour chaque mois civil couvert,
  calculer `base mensuelle × jours inclus / jours du mois`, puis additionner les
  contributions. Un objectif hebdomadaire utilise `valeur × jours inclus / 7`.
- **Les mêmes KPI, mode avancé** : remplacer la base commune par la valeur saisie
  pour chaque mois, puis appliquer le même prorata. Les objectifs d'une année
  civile complète sont la somme des 12 valeurs mensuelles.
- **Taux, moyennes et nombre de projets distincts, mode simple** : cible fixe,
  car ces mesures ne s'additionnent pas au cours du temps. Une satisfaction cible
  à 95 % reste 95 % sur une semaine ou une année.
- **Les mêmes KPI, mode avancé** : la cible globale est la moyenne des seuils
  mensuels, pondérée par les jours inclus : `Σ(cible du mois × jours inclus) / Σ(jours
  inclus)`. Ce choix concerne la cible uniquement ; le KPI réel continue d'être
  calculé sur ses lignes sources. Les pourcentages et moyennes ne sont jamais sommés.

Exemples : une cible mensuelle de 1 000 donne 12 000 sur une année civile complète,
6 000 sur six mois complets, 3 000 sur trois mois complets et 500 sur 15 jours d'un
mois de 30 jours. Une cible annuelle de 12 000 donne la même base mensuelle de 1 000.
Si janvier vaut 1 000 et février 2 000 en avancé, le cumul des deux mois complets
vaut 3 000. Un objectif hebdomadaire de 700 donne 100 par jour.

Les dates utilisent des jours civils UTC et tiennent compte des années bissextiles.
Le rapport « année en cours » n'inclut que les jours écoulés jusqu'à aujourd'hui.
Les périodes glissantes comprennent souvent deux mois partiels : elles utilisent
leurs fractions calendaires exactes, qui peuvent différer légèrement du nombre
nominal de mois lorsque les mois aux bornes n'ont pas la même longueur.

Les cartes affichent la cible adaptée, `réalisé − objectif`, l'écart relatif en %,
le statut et une jauge. Un écart de taux ou de note s'affiche en points. Le sens
de l'objectif détermine le statut favorable : le délai de réponse est proposé par
défaut comme plafond, les autres KPI comme minimum. Un objectif nul reste possible
(sauf une note, comprise entre 1 et 5) ; il ne produit pas de division par zéro.
Sans valeur calculable, la comparaison est indisponible.

Les graphiques affichent une ligne pointillée distincte du réalisé. Chaque point
de cette ligne est calculé sur les dates exactes du jour ou du mois représenté,
y compris les mois partiels en début et en fin de rapport. Pour les KPI répartis,
la somme des cibles des points correspond à la cible de la période complète, aux
arrondis numériques près. La cible est incluse dans l'échelle verticale du graphique.
La période du tableau et les éventuelles périodes propres aux blocs s'appliquent
également à ces comparaisons. Enregistrer / Annuler conserve ou restaure les objectifs.

## Catalogue KPI

La page **Catalogue KPI** présente les 12 KPI du registre `KPIData.KPIS`, avec
recherche par nom, définition, identifiant, table ou colonne et filtre par source.
La période de consultation est indépendante des périodes enregistrées dans les tableaux.

Chaque fiche possède trois sections :

- **Définition métier** : finalité, question métier, usage, interprétation, formule,
  unité, agrégation, limites, règles de temps et politique d'adaptation des objectifs.
  Le responsable métier est laissé à renseigner ; les objectifs sont définis par bloc.
- **Données & règles** : table logique, granularité, clé, filtre, dictionnaire des
  colonnes avec types SQL cibles, champs participant au calcul, contraintes sur les
  valeurs et extrait de cinq lignes réellement retenues pour la période.
- **SQL & implémentation** : requête donnant la valeur du KPI, requête des lignes
  sources, dates inclusives et code JavaScript actif. Les deux requêtes SQL sont
  copiables, avec variantes SQL standard, Databricks / Spark SQL et PostgreSQL.
  Si le navigateur bloque le presse-papiers dans l'iframe, le code est sélectionné
  pour permettre une copie manuelle.

La valeur de démonstration utilise `KPIData.createModel().evaluate`, comme les blocs
du hub. Les libellés, formules et fonctions de calcul proviennent du même registre.
Les informations métier, dictionnaires et expressions SQL sont définis dans
`catalogue-model.js` ; `catalogue.js` et `catalogue.css` constituent la vue.
Les nouvelles définitions ajoutées au registre doivent recevoir leur documentation
et leur expression SQL dans `catalogue-model.js`.

Le POC continue à calculer en JavaScript sur des données fictives. Le SQL est un
équivalent documenté, **il n'est pas exécuté dans l'application**. Pour l'utiliser
sur une base, raccorder les noms de tables logiques et respecter les types, les
contraintes de non-nullité et la granularité documentés. Les ratios sont protégés
contre une division par zéro ; les montants totaux et comptages sans ligne valent
zéro, les moyennes et ratios indéfinis restent NULL. La requête de valeur porte sur
la période complète, sans arrondi d'affichage ; elle ne produit pas la série temporelle.

Les deux pages utilisent les mêmes ressources frontend et des clés Streamlit
distinctes. Le mode catalogue ne lit ni ne réécrit la collection locale de tableaux.

## Portée du POC

- Les données sont fictives et générées localement. Elles ne sont pas connectées à des données métier réelles.
- La collection est enregistrée en `localStorage` sous `kpi-card:dashboards:v2`,
  par navigateur et par origine, et transmise à la session Streamlit. Elle inclut
  les favoris, les périodes, les KPI sélectionnés et les dispositions ; les lignes
  sources sont régénérées à chaque chargement.
- Les quatre exemples sont initialisés une seule fois. Une collection vide après
  suppression reste vide au prochain chargement.
- Une ancienne composition du premier POC est récupérée automatiquement sous
  **Mon premier tableau**, sans supprimer l'ancienne sauvegarde.
- Les graphiques déjà enregistrés reçoivent un KPI correspondant à leur exemple,
  ou le CA HT par défaut. Les anciens chiffres d'exemple sous forme de texte sont
  convertis en cartes uniquement si leur contenu n'a pas été personnalisé.
- Il n'y a pas encore de stockage serveur ni de gestion par utilisateur.
- Une nouvelle session d'édition conserve au moins une ligne libre sous les blocs,
  avec un plafond de 100 lignes.
- `layout.js` centralise les contraintes de placement et la validation des sauvegardes.
- `dashboards.js` définit les exemples, les opérations sur la collection et sa validation.
- `data.js` centralise les tables fictives, les KPI, les périodes et la génération du CSV.
- Le POC accepte jusqu'à 200 tableaux, avec des dispositions de 100 lignes maximum.
- `editor.js` gère les interactions et les échanges avec Streamlit Components v1 :
  https://docs.streamlit.io/develop/concepts/custom-components/components-v1/intro

## Panneau replié et présentations des graphiques

À chaque entrée en modification (y compris création), **Votre tableau**, **Ajouter
un bloc** et **Réglages** sont fermés. Sélectionner un bloc ouvre ses réglages ; les
sous-rubriques restent fermées sauf celle contenant le champ ciblé. Leur état est
conservé pendant cette session d’édition, puis réinitialisé à la suivante.

Dans **Réglages → Présentation**, un graphique propose cinq formes :
- **Barres** : comparer les valeurs par période.
- **Courbe** : suivre une évolution continue entre les observations.
- **Aire** : la même courbe avec un remplissage jusqu’à zéro (pas un cumul).
- **Paliers** : relier les observations par segments horizontaux puis verticaux ;
  ce rendu ne suppose aucune observation supplémentaire entre deux dates.
- **Points** : afficher chaque observation sans relier les périodes.

Les cinq formes utilisent les mêmes calculs, filtres, périodes, détails CSV et
objectifs pointillés. Les valeurs manquantes interrompent les courbes et les aires ;
les zéros restent visibles. `chart-styles.js` centralise les formes et la géométrie.
Les anciens `bar`/`line` sont conservés, une forme inconnue revient à `bar`.

## Répartition par catégorie

Choisir **Anneau** ou **Barres horizontales** dans **Réglages → Présentation**,
puis **Répartir par** : les colonnes textuelles de la source sont proposées, dont
Région/Produit pour les ventes et Équipe pour les opérations. `groupBy` enregistre
la colonne ; changer de source sélectionne une colonne compatible. Les anciennes
sauvegardes reçoivent une dimension par défaut sans changer leur présentation.

Les groupes utilisent les lignes retenues après période, filtres du bloc et règles
métier du KPI. Chaque valeur est recalculée par le même calcul métier, y compris les
taux, moyennes et distincts. Le total du bloc reste calculé sur toutes ses lignes.
Le classement est décroissant ; au-delà de huit catégories, sept sont affichées et
les autres regroupées dans **Autres**, recalculé sur leurs lignes réunies. Les valeurs
manquantes forment **Non renseigné**. Le détail/CSV du bloc conserve toutes les lignes.

L’anneau est disponible pour les montants et comptages déclarés `additive` dans le
registre, avec un total positif et aucune catégorie négative. Les parts sont des
pourcentages du total filtré. Un taux, une moyenne ou un distinct ne forme pas un
partage du total : utiliser les barres horizontales. Un changement vers un tel KPI
remplace automatiquement l’anneau par des barres. Les anneaux invalides déjà sauvés
ou sans total positif affichent une explication et les valeurs en barres.

L’objectif reste global au bloc, visible dans son résumé ; aucune répartition
arbitraire de la cible entre catégories. `chart-styles.js` groupe les lignes et
`category-charts.js` rend l’anneau, les barres et leurs légendes lisibles au clavier.

## Comparaison, filtres globaux et exploration

**Comparer les indicateurs** active par défaut la période précédente, ou permet
**Sans comparaison**. Pour chaque carte/graphique, cette période précède immédiatement
celle du bloc et contient exactement le même nombre de jours inclusifs. Ce n’est pas
nécessairement un mois civil ni l’année précédente. Les dates sont visibles et les
blocs ayant leur propre période conservent celle-ci. Trente mois de données fictives
couvrent les deux fenêtres de douze mois, sans tronquer la période de référence.

Le total, la moyenne, le taux ou le distinct est recalculé séparément sur chaque
fenêtre. L’écart absolu respecte l’unité (points pour taux/notes) ; la variation
relative vaut (actuel − précédent) / abs(précédent). Une base nulle donne un écart
absolu, sans pourcentage ; une période sans observation donne une comparaison
indisponible. Aucun sens favorable/défavorable n’est déduit de la seule variation.
**Voir la période précédente** ouvre ses lignes exactes et leur export CSV.

**Filtres globaux du rapport** propose une source puis les mêmes conditions typées
et multisélections que les blocs. Le panneau nomme les blocs de données concernés.
Ces conditions affectent tous les blocs de cette source, y compris les tableaux
bruts, mais jamais les autres sources sur la seule base d’un nom de colonne identique.
Les filtres globaux et locaux se combinent avec ET et sont appliqués identiquement
aux deux fenêtres de comparaison. Une condition de date absolue reste absolue : elle
peut donc exclure les observations précédentes, ce qui est signalé par la comparaison.
Les objectifs restent ceux définis par l’utilisateur, sans ajustement automatique.

La collection v2 conserve `globalFilters: {sourceId: conditions}` et `comparison`
(`previous` ou `none`) au niveau du rapport. Les anciennes sauvegardes reçoivent
une liste de filtres vide et la comparaison précédente. La comparaison et les filtres
globaux sont modifiables uniquement en édition, puis enregistrés ou annulés avec le
brouillon. En lecture, seul leur résumé est affiché et leurs effets restent appliqués.
Jusqu’à 20 conditions globales par source et 20 locales par bloc.
`report-analysis.js` centralise leur validation, portée et les écarts calculés.

Les parts d’anneau, barres horizontales et lignes de légende sont accessibles au clic
et avec Entrée/Espace. Le détail affiche la catégorie sélectionnée, son calcul et
ses seules lignes, déjà soumises aux filtres du rapport et du bloc. **Autres** ouvre
exactement les lignes regroupées. La pagination et le CSV respectent ce sous-ensemble.
Le retour restaure le focus sur l’élément déclencheur sans modifier le rapport.
**Voir toutes les données** conserve l’accès à toutes les lignes du bloc.


## Présentation, sections et suivi d’actions

`report-blocks.js` centralise la validation des nouveaux blocs, les lignes visibles
lors d’un repli et le suivi d’actions. Il est chargé avant `content-blocks.js`.
Les nouveaux types sont `section`, `actionPlan` et `verticalSeparator` ; les
versions collection v2 et disposition v1 restent inchangées. Les anciens blocs
ne changent pas de format et les séparateurs existants restent horizontaux.

Une section a un `subtitle` (500 caractères) et un booléen `collapsed` (faux par
défaut), occupe six colonnes depuis la colonne zéro sur une ligne libre et ne
s’imbrique pas. La section suivante marque la fin du groupe. Les replis en lecture
sont temporaires ; les lignes cachées sont retirées de la grille affichée sans
modifier leurs coordonnées sauvegardées. En édition, toutes les sections sont
ouvertes. Déplacer un titre redéfinit son groupe, sans déplacer son contenu ;
supprimer le titre conserve les blocs. Le séparateur vertical reste large d’une
colonne et s’étire sur sa ligne, avec `lineStyle` continu, tirets ou pointillés.

Le plan possède `actions` (maximum 50), chacune avec `id` unique dans ce bloc,
`title` (240 caractères), `owner` (120), `due` (date civile ISO valide ou vide) et
`status` (`todo`, `doing`, `done`). Les responsables sont de simples libellés,
sans identité ni notification. Le statut se sauvegarde localement en lecture.
En édition, tous les champs suivent Enregistrer / Annuler. La duplication conserve
les valeurs sans partager les objets d’actions entre blocs.

Le mode présentation est temporaire et utilise Fullscreen API, avec repli vers une
vue épurée si elle est refusée. Quitter ou Échap restaure les commandes ; les
explorations restent possibles. Notes et statuts sont statiques, les commandes
de tri et de filtre des tables sont masquées ; leur pagination reste disponible.
Les filtres et la comparaison du rapport continuent de s’appliquer.

Les liens d’information utilisent `catalogue-kpi?kpi=<identifiant>` dans un nouvel
onglet (`noopener noreferrer`). Le pont Python transmet `selected_kpi` ; le
frontend peut aussi lire le paramètre dans l’URL référente du composant, pour les
sessions locales dont le pont Python n’a pas encore été rechargé. Le registre
valide la sélection et un identifiant inconnu affiche un message puis le catalogue.

Validation ciblée : `node --test tests/*.test.cjs`.
