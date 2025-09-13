# Plan de réalisation : Compteur de tokens et estimation de coût

Ce document décrit les étapes pour implémenter un compteur de consommation de tokens en temps réel et une estimation du coût de la session dans le pied de page du CLI Gemini.

## Étapes

- [ ] **Phase 1 : Compréhension et Identification**
    - [ ] Identifier où la consommation de tokens est actuellement suivie et rapportée.
    - [ ] Identifier les composants de l'interface utilisateur (UI) responsables du rendu du pied de page (probablement des composants React/Ink).
    - [ ] Rechercher la structure des données de consommation de tokens.

- [ ] **Phase 2 : Implémentation du Compteur de Tokens**
    - [ ] Mettre en place un mécanisme pour intercepter et accumuler les données de consommation de tokens tout au long de la session.
    - [ ] Créer ou modifier un composant React/Ink pour afficher le nombre total de tokens consommés dans le pied de page.
    - [ ] Assurer la mise à jour dynamique du compteur à chaque nouvelle interaction.

- [ ] **Phase 3 : Implémentation de l'Estimation du Prix**
    - [ ] Déterminer le modèle de tarification de l'API Gemini (recherche web si nécessaire, ou vérification de la configuration existante).
    - [ ] Implémenter la logique de calcul du coût estimé basée sur les tokens accumulés et le modèle de tarification.
    - [ ] Mettre à jour le composant du pied de page pour afficher le prix estimé.

- [ ] **Phase 4 : Tests et Validation**
    - [ ] Écrire des tests unitaires pour la logique de comptage des tokens et de calcul des coûts.
    - [ ] Effectuer des tests d'intégration pour s'assurer que le compteur et l'estimation s'affichent correctement dans l'UI et se mettent à jour.
    - [ ] Vérifier qu'aucune régression n'a été introduite dans les fonctionnalités existantes du CLI.
    - [ ] Exécuter `npm run preflight` pour valider l'ensemble des changements (build, tests, typecheck, lint).

- [ ] **Phase 5 : Documentation et Nettoyage**
    - [ ] Mettre à jour la documentation si nécessaire.
    - [ ] Supprimer tout code temporaire ou de débogage.
