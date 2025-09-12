# Plan de Caviardage des Données Sensibles (PII)

Ce document suit l'avancement de l'implémentation de la fonctionnalité d'anonymisation des prompts.

## Objectif

L'objectif principal est d'empêcher l'envoi d'informations personnelles identifiables (PII) et de secrets (clés d'API, tokens, mots de passe) aux serveurs de Google. Pour ce faire, nous devons filtrer le contenu des prompts de l'utilisateur avant chaque envoi.

## Approche Choisie

- **Librairie :** `@hackylabs/deep-redact` est utilisé en combinaison avec des expressions régulières personnalisées.
- **Source des Filtres :** `gitleaks` (projet de détection de secrets open-source)
  - **Raison :** Fournit une liste complète et maintenue par la communauté d'expressions régulières (regex) pour détecter une grande variété de secrets.

## Plan d'Action

1.  [x] Définir l'objectif et choisir l'approche technique.
2.  [x] Créer ce fichier de suivi (`PII_REDACTION_PLAN.md`).
3.  [x] Ajouter la dépendance `@hackylabs/deep-redact` au projet.
4.  [x] Créer un fichier de configuration pour les filtres personnalisés (`packages/core/src/pii/gitleaksFilters.ts`).
5.  [x] Adapter les regex de `gitleaks` au format de la librairie.
6.  [x] Intégrer la logique d'anonymisation dans le `GeminiClient` pour filtrer les prompts.
7.  [x] Tester la solution avec des exemples de secrets.

## État Actuel et Tests (12/09/2025)

Des tests ont été effectués avec un prompt contenant divers secrets.

**Ce qui est correctement caviardé :**

- Clé d'accès AWS (`AKIA...`)
- Secret AWS (chaîne de 40 caractères)
- Clé d'API GCP (`AIza...`)

**Ce qui n'est PAS (ou mal) caviardé :**

- **Clé privée :** Seul l'en-tête `-----BEGIN PRIVATE KEY-----` est caviardé, le corps de la clé est envoyé en clair.
- **Email :** Les adresses e-mail ne sont pas détectées.
- **Numéro de téléphone :** Les numéros de téléphone ne sont pas détectés.
- **Faux positif :** Le `private_key_id` de GCP (chaîne de 40 caractères) est caviardé par la règle trop large des secrets AWS.

## Prochaines Étapes

- [ ] Améliorer la regex pour les clés privées afin de caviarder l'intégralité du bloc.
- [ ] Ajouter une règle de caviardage pour les adresses e-mail.
- [ ] Ajouter une règle de caviardage pour les numéros de téléphone.
- [ ] Affiner la règle pour les secrets de 40 caractères afin de réduire les faux positifs.
- [ ] Créer un script qui met à jour automatiquement les regex de gitleaks.

---

_Ce document sera mis à jour au fur et à mesure de l'avancement._
