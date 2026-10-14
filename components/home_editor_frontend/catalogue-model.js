/* Documentation des KPI existants. Libellés et formules viennent de KPIData. */
(function (root) {
  "use strict";
  const K = typeof module !== "undefined" && module.exports ? require("./data.js") : root.KPIData;
  const dateField = {date: "Filtre de période et regroupement temporel"};
  const salesFields = {...dateField, statut: "Périmètre : ventes gagnées uniquement"};
  const deliveryFields = {...dateField, statut: "Périmètre : opérations livrées uniquement"};
  const won = (q) => `${q("statut")} = 'Gagnée'`;
  const delivered = (q) => `${q("statut")} = 'Livrée'`;
  const docs = {
    revenue: {
      purpose: "Mesurer le montant hors taxe des ventes gagnées sur la période sélectionnée.",
      question: "Quel chiffre d’affaires notre activité commerciale a-t-elle généré ?",
      usage: "Suivre le volume d’affaires et comparer des périodes de même durée.",
      interpretation: "Une hausse indique un montant vendu plus élevé. Elle peut venir du nombre de ventes, du panier moyen ou du mix de produits.",
      aggregation: "Somme", unit: "EUR hors taxe", empty: "0 €", direction: "Hausse généralement recherchée",
      fields: {...salesFields, montant_ht: "Mesure : montant total HT de la vente"},
      limits: ["Le montant est déjà le total de la vente : ne pas le multiplier à nouveau par la quantité.", "Ce POC mesure les ventes gagnées, sans notion de facturation, d’encaissement, d’avoir ou de reconnaissance comptable."],
      sqlFilter: won, sqlExpression: (q) => `COALESCE(SUM(${q("montant_ht")}), 0)`,
    },
    sales_count: {
      purpose: "Compter les ventes conclues avec succès pendant la période.",
      question: "Combien de ventes avons-nous gagnées ?",
      usage: "Suivre le volume de ventes et le rapprocher du chiffre d’affaires et du panier moyen.",
      interpretation: "Une hausse traduit davantage de ventes gagnées, sans renseigner à elle seule sur leur montant ou leur rentabilité.",
      aggregation: "Nombre de lignes", unit: "Ventes", empty: "0", direction: "Hausse généralement recherchée",
      fields: salesFields,
      limits: ["Une ligne représente une vente. Il ne s’agit ni du nombre d’articles ni du nombre de clients distincts.", "Les ventes annulées sont exclues. Une ligne dupliquée serait comptée deux fois."],
      sqlFilter: won, sqlExpression: () => "COUNT(*)",
    },
    average_basket: {
      purpose: "Mesurer le montant HT moyen d’une vente gagnée.",
      question: "Quelle est la valeur moyenne de nos ventes ?",
      usage: "Observer l’évolution de la valeur des commandes, en complément du nombre de ventes.",
      interpretation: "Une hausse peut provenir de commandes plus importantes ou d’une évolution du mix de produits. Quelques grosses ventes peuvent déplacer la moyenne.",
      aggregation: "Moyenne par vente", unit: "EUR HT / vente", empty: "NULL, affiché —", direction: "À interpréter avec le volume de ventes",
      fields: {...salesFields, montant_ht: "Mesure : montant HT, une valeur par vente"},
      limits: ["Ne pas calculer la moyenne des paniers moyens mensuels : recalculer sur toutes les ventes de la période.", "En l’absence de vente gagnée, le panier moyen est indéfini."],
      sqlFilter: won, sqlExpression: (q) => `AVG(${q("montant_ht")})`,
    },
    margin: {
      purpose: "Mesurer la part du chiffre d’affaires HT restant après déduction du coût HT des ventes.",
      question: "Quelle part du montant vendu couvre la marge sur les coûts renseignés ?",
      usage: "Suivre la rentabilité commerciale des ventes gagnées et l’effet des prix ou des coûts.",
      interpretation: "Une hausse traduit une plus grande part de marge dans le chiffre d’affaires, selon le périmètre des coûts retenus.",
      aggregation: "Ratio de sommes × 100", unit: "% du CA HT", empty: "NULL si CA nul, affiché —", direction: "Hausse généralement recherchée",
      fields: {...salesFields, montant_ht: "Numérateur et dénominateur : chiffre d’affaires HT", cout_ht: "Montant soustrait au chiffre d’affaires HT"},
      limits: ["Le dénominateur est le chiffre d’affaires, pas le coût. Le périmètre des coûts est celui de cout_ht.", "Ne pas moyenner les taux de marge par vente ou par mois. Une somme de CA nulle rend ce ratio indéfini."],
      sqlFilter: won,
      sqlExpression: (q) => `100.0 * (SUM(${q("montant_ht")}) - SUM(${q("cout_ht")}))\n       / NULLIF(SUM(${q("montant_ht")}), 0)`,
    },
    operations_count: {
      purpose: "Mesurer le nombre d’opérations enregistrées pendant la période, tous statuts confondus.",
      question: "Quel volume d’opérations est représenté dans notre activité ?",
      usage: "Observer la charge d’activité et la rapprocher du volume de livraisons.",
      interpretation: "Une variation reflète le volume enregistré. Elle ne renseigne pas à elle seule sur l’avancement ou la qualité des opérations.",
      aggregation: "Nombre de lignes", unit: "Opérations", empty: "0", direction: "Pas de sens favorable automatique",
      fields: dateField,
      limits: ["Les opérations livrées, en cours et annulées sont toutes incluses.", "La date retenue est la date d’activité. Ce nombre ne représente pas le stock d’opérations ouvertes à une date donnée."],
      sqlExpression: () => "COUNT(*)",
    },
    delivered_count: {
      purpose: "Compter les opérations livrées dont la date d’activité appartient à la période.",
      question: "Combien d’opérations avons-nous livrées ?",
      usage: "Suivre le débit de livraison et le rapprocher du respect des échéances.",
      interpretation: "Une hausse traduit un volume de livraisons plus important, sans mesurer leur difficulté ou leur ponctualité.",
      aggregation: "Nombre de lignes", unit: "Livraisons", empty: "0", direction: "À interpréter avec la charge et la qualité",
      fields: deliveryFields,
      limits: ["Les opérations en cours et annulées sont exclues.", "Chaque opération livrée compte une fois, quelle que soit sa durée ou sa taille."],
      sqlFilter: delivered, sqlExpression: () => "COUNT(*)",
    },
    on_time: {
      purpose: "Mesurer la proportion des opérations livrées au plus tard à leur échéance.",
      question: "Respectons-nous les dates de livraison prévues ?",
      usage: "Suivre la ponctualité des livraisons et repérer une dégradation du respect des engagements.",
      interpretation: "Un taux élevé traduit une meilleure ponctualité parmi les opérations effectivement livrées sur la période.",
      aggregation: "Livraisons à l’heure / livraisons × 100", unit: "% des livraisons", empty: "NULL sans livraison, affiché —", direction: "Hausse recherchée",
      fields: {...deliveryFields, date: "Période et date de livraison à comparer à l’échéance", date_echeance: "Seuil de ponctualité inclusif"},
      limits: ["Une livraison le jour de l’échéance est à l’heure. La comparaison porte sur les dates, pas sur les heures travaillées.", "Les opérations encore en cours, même en retard, ne sont pas dans le dénominateur.", "Le taux global est recalculé sur toutes les livraisons, sans moyenne des taux mensuels."],
      sqlFilter: delivered,
      sqlExpression: (q) => `100.0 * SUM(CASE WHEN ${q("date")} <= ${q("date_echeance")} THEN 1 ELSE 0 END)\n       / NULLIF(COUNT(*), 0)`,
    },
    projects_count: {
      purpose: "Compter les projets distincts associés à au moins une opération non annulée pendant la période.",
      question: "Sur combien de projets l’activité de la période porte-t-elle ?",
      usage: "Mesurer l’étendue du portefeuille concerné par l’activité enregistrée.",
      interpretation: "Une hausse indique que davantage de projets sont représentés. Elle ne mesure ni leur avancement ni leur budget.",
      aggregation: "Nombre distinct de projets", unit: "Projets", empty: "0", direction: "Pas de sens favorable automatique",
      fields: {...dateField, statut: "Exclusion des opérations annulées", projet: "Clé du dénombrement distinct"},
      limits: ["Un projet peut apparaître dans plusieurs mois : les nombres mensuels ne doivent pas être additionnés.", "Ce KPI n’est pas le nombre de projets ouverts à une date donnée. Il porte sur les projets associés aux lignes de la période."],
      sqlFilter: (q) => `${q("statut")} <> 'Annulée'`, sqlExpression: (q) => `COUNT(DISTINCT ${q("projet")})`,
    },
    satisfaction: {
      purpose: "Mesurer la part des retours clients ayant une note de 4 ou 5 sur 5.",
      question: "Quelle proportion des retours exprime une satisfaction élevée ?",
      usage: "Suivre la satisfaction exprimée et la rapprocher du nombre de retours reçus.",
      interpretation: "Un taux élevé indique une plus grande proportion d’avis favorables parmi les retours collectés.",
      aggregation: "Retours notés ≥ 4 / retours × 100", unit: "% des retours", empty: "NULL sans retour, affiché —", direction: "Hausse recherchée",
      fields: {...dateField, note: "Numérateur : note supérieure ou égale à 4, sur une échelle de 1 à 5"},
      limits: ["Malgré le libellé « Clients satisfaits », le dénominateur est le nombre de retours, pas le nombre de clients distincts.", "Un client peut contribuer plusieurs retours. Le résultat ne mesure que les personnes ayant répondu.", "Ne pas faire la moyenne des taux mensuels : recalculer le ratio sur tous les retours."],
      sqlExpression: (q) => `100.0 * SUM(CASE WHEN ${q("note")} >= 4 THEN 1 ELSE 0 END)\n       / NULLIF(COUNT(*), 0)`,
    },
    average_rating: {
      purpose: "Mesurer la note moyenne donnée dans les retours clients, sur une échelle de 1 à 5.",
      question: "Quel est le niveau moyen des notes reçues ?",
      usage: "Suivre la qualité perçue et la rapprocher du taux de satisfaction et du nombre de retours.",
      interpretation: "Une note élevée reflète une meilleure appréciation moyenne. Une même moyenne peut toutefois masquer des distributions très différentes.",
      aggregation: "Moyenne par retour", unit: "Note / 5", empty: "NULL sans retour, affiché —", direction: "Hausse recherchée",
      fields: {...dateField, note: "Mesure : note de 1 à 5 par retour"},
      limits: ["Chaque retour a le même poids. Il n’y a pas de dédoublonnage par client.", "La moyenne de la période est calculée sur les retours, pas sur les moyennes mensuelles."],
      sqlExpression: (q) => `AVG(CAST(${q("note")} AS DECIMAL(18, 6)))`,
    },
    response_time: {
      purpose: "Mesurer le délai moyen de réponse aux retours clients enregistrés pendant la période.",
      question: "Combien de temps faut-il en moyenne pour répondre aux retours ?",
      usage: "Suivre la réactivité du service et la rapprocher de la satisfaction exprimée.",
      interpretation: "Une baisse indique des réponses plus rapides en moyenne. Quelques délais très longs peuvent déplacer la moyenne.",
      aggregation: "Moyenne par retour", unit: "Heures / retour", empty: "NULL sans retour, affiché —", direction: "Baisse généralement recherchée",
      fields: {...dateField, delai_reponse_heures: "Mesure : délai de réponse en heures décimales"},
      limits: ["Le délai est fourni directement par la table : aucun calcul d’heures ouvrées ni de calendrier de service n’est appliqué.", "La période filtre la date du retour. La table fictive comporte un délai renseigné pour chaque retour.", "Le délai moyen global n’est pas la moyenne des délais moyens mensuels."],
      sqlExpression: (q) => `AVG(${q("delai_reponse_heures")})`,
    },
    feedback_count: {
      purpose: "Compter les retours clients reçus pendant la période.",
      question: "Sur combien de retours reposent les indicateurs de satisfaction ?",
      usage: "Contextualiser les taux et moyennes de satisfaction avec leur volume de réponses.",
      interpretation: "Un volume plus important apporte davantage de retours à analyser. Une hausse n’est pas intrinsèquement favorable ou défavorable.",
      aggregation: "Nombre de lignes", unit: "Retours", empty: "0", direction: "Pas de sens favorable automatique",
      fields: dateField,
      limits: ["Un retour correspond à une ligne. Plusieurs retours d’un même client sont comptés séparément.", "Ce nombre n’est pas un taux de réponse : la population sollicitée n’est pas disponible."],
      sqlExpression: () => "COUNT(*)",
    },
  };
  const schemas = {
    sales: {domain: "Commercial", key: "vente_id", columns: {
      vente_id: ["VARCHAR(32)", "Identifiant unique d’une vente."],
      date: ["DATE", "Date de la vente, utilisée pour la période."],
      client: ["VARCHAR(120)", "Nom fictif du client ; plusieurs ventes possibles par client."],
      region: ["VARCHAR(80)", "Région de rattachement de la vente."],
      produit: ["VARCHAR(120)", "Produit ou offre concernée."],
      quantite: ["INTEGER", "Nombre d’unités vendues, strictement positif."],
      montant_ht: ["DECIMAL(14, 2)", "Montant total de la vente en euros HT, quantité déjà prise en compte."],
      cout_ht: ["DECIMAL(14, 2)", "Coût total de la vente en euros HT."],
      statut: ["VARCHAR(16)", "Gagnée ou Annulée."],
    }},
    operations: {domain: "Opérations", key: "operation_id", columns: {
      operation_id: ["VARCHAR(32)", "Identifiant unique d’une opération."],
      date: ["DATE", "Date d’activité ; pour une opération livrée, date de livraison."],
      projet: ["VARCHAR(80)", "Identifiant du projet associé ; une opération appartient à un projet."],
      equipe: ["VARCHAR(40)", "Équipe responsable de l’opération."],
      statut: ["VARCHAR(16)", "Livrée, En cours ou Annulée."],
      date_echeance: ["DATE", "Date limite prévue pour la livraison, incluse dans le délai."],
      heures_prevues: ["DECIMAL(10, 2)", "Charge prévue en heures."],
      heures_reelles: ["DECIMAL(10, 2)", "Charge réalisée ; absente pour les opérations non livrées.", true],
    }},
    feedback: {domain: "Relation client", key: "retour_id", columns: {
      retour_id: ["VARCHAR(32)", "Identifiant unique d’un retour."],
      date: ["DATE", "Date de réception du retour, utilisée pour la période."],
      client: ["VARCHAR(120)", "Nom fictif du client ; plusieurs retours possibles par client."],
      canal: ["VARCHAR(40)", "E-mail, Téléphone ou Portail."],
      note: ["INTEGER", "Note entière comprise entre 1 et 5."],
      delai_reponse_heures: ["DECIMAL(10, 2)", "Délai de réponse en heures décimales, positif ou nul."],
      commentaire: ["VARCHAR(500)", "Commentaire fictif associé au retour."],
    }},
  };

  function entries() {
    return K.KPIS.map((kpi) => ({...kpi, ...docs[kpi.id], source: K.TABLES.find((table) => table.id === kpi.table), schema: schemas[kpi.table]}));
  }
  function quote(name, dialect) {
    return dialect === "databricks" ? `\`${name}\`` : `"${name}"`;
  }
  function sqlFor(entry, range, dialect = "standard", mode = "value") {
    const q = (name) => quote(name, dialect);
    const conditions = [`${q("date")} >= DATE '${range.start}'`, `${q("date")} <= DATE '${range.end}'`];
    if (entry.sqlFilter) conditions.push(entry.sqlFilter(q));
    const where = conditions.join("\n  AND ");
    const columns = mode === "rows" ? entry.source.columns.map((column) => `  ${q(column.key)}`).join(",\n") :
      `  ${entry.sqlExpression(q)} AS ${q(entry.id)}`;
    const order = mode === "rows" ? `\nORDER BY ${q("date")} DESC, ${q(entry.schema.key)} DESC` : "";
    return `-- ${entry.label}\n-- ${K.rangeLabel(range)} (bornes incluses)\n-- Table logique du POC à raccorder à votre base\nSELECT\n${columns}\nFROM ${q(entry.table)}\nWHERE ${where}${order};`;
  }
  function javascriptFor(entry) {
    const {sum, mean, percent} = K.calculationHelpers;
    return `// Définition active : components/home_editor_frontend/data.js\n// KPI : ${entry.id}\nconst sum = ${sum.toString()};\nconst mean = ${mean.toString()};\nconst percent = ${percent.toString()};\nconst filter = ${entry.filter.toString()};\nconst calculate = ${entry.calculate.toString()};\n\nconst rows = sourceRows\n  .filter(row => row.date >= dateDebut && row.date <= dateFin)\n  .filter(filter);\nconst value = calculate(rows);`;
  }
  const api = {entries, sqlFor, javascriptFor};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KPICatalogueModel = api;
})(globalThis);
