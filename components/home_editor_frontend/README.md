# KPI-Card — hub et éditeur de tableaux de bord

Le composant est monté par `components/home_editor.py` sous le header existant.
Il est autonome : aucun serveur de développement JavaScript ni paquet npm requis.

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

- **12 mois glissants**, **6 mois** et **1 mois** : du lendemain de la date située
  respectivement 12, 6 ou 1 mois plus tôt jusqu'à aujourd'hui inclus. Le jour est
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
