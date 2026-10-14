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
   Glisser **Texte**, **Titre**, **Graphique** ou **Carte** vers une case libre. Il est aussi
   possible de cliquer sur un type de bloc, puis sur une case (souris, clavier ou tactile).
4. Sélectionner un bloc pour changer son contenu et sa largeur dans le panneau.
   Les réglages sont regroupés en rubriques repliables : **Contenu**, **Données et
   période**, **Objectif**, **Présentation** et **Disposition**, selon le type de bloc.
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

- Vue d'ensemble : chiffres clés, activité et priorités.
- Performance commerciale : chiffre d'affaires et ventes conclues.
- Suivi des projets : portefeuille, livraisons et jalons.
- Satisfaction client : satisfaction et retours recueillis.

Les aperçus du hub sont générés à partir des blocs enregistrés. Chaque tableau
possède sa propre copie des blocs. Les quatre modèles utilisent les mêmes tables
de démonstration et les mêmes calculs que les tableaux créés par l'utilisateur.

## Tables et KPI de démonstration

`data.js` génère environ 18 mois de lignes fictives jusqu'à la date de chargement
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
