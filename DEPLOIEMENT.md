# Guide de déploiement des Edge Functions - PHLOX TOGO

Ce document décrit comment déployer les 3 Edge Functions Supabase pour la boutique Phlox Togo et configurer l'intégration de paiement USSD en production.

## 1. Déploiement des Edge Functions

Exécutez les commandes suivantes dans votre terminal pour déployer les trois fonctions :

```bash
# Déploiement de create-payment (Création de commande + paiement initial)
supabase functions deploy create-payment --no-verify-jwt

# Déploiement de order-status (Vérification et résumé de commande sécurisé)
supabase functions deploy order-status --no-verify-jwt

# Déploiement de paygate-callback (Callback de confirmation automatique de PayGate)
supabase functions deploy paygate-callback --no-verify-jwt
```

## 2. Configuration des Secrets de Production

Configurez le token secret PayGate sur votre projet Supabase à l'aide de la commande suivante (remplacez `VOTRE_CLE_REELLE` par votre clé API PayGate) :

```bash
supabase secrets set PAYGATE_API_KEY="VOTRE_CLE_REELLE"
```

## 3. Configuration du Callback URL chez PayGate Global

Pour que les confirmations de paiements soient automatisées par callback, configurez l'URL suivante dans votre compte de marchand sur le portail de **PayGate Global** :

```text
https://cukyxbvwixzpinzgpsjw.supabase.co/functions/v1/paygate-callback
```
