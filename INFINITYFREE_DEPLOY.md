# 🚀 Guide de Déploiement InfinityFree - Phlox Togo (Full-Stack)

Ce projet est configuré pour être déployé en quelques clics sur l'hébergeur gratuit **InfinityFree** (ou tout hébergement web Apache / cPanel / PHP).

---

## 📦 1. Génération de l'Archive ZIP

L'archive ZIP prête pour InfinityFree contient l'application React compilée, la configuration `.htaccess` (routage SPA, compression GZIP, sécurité), les scripts backend PHP (`api/pay.php`, `api/status.php`, `api/admin.php`, `paygate-callback.php`) et le catalogue sécurisé.

Pour générer l'archive à tout moment :
```bash
npm run build:zip
```
Cela crée le fichier : **`infinityfree-phlox-togo.zip`**

---

## 🌐 2. Téléversement sur InfinityFree

1. **Connectez-vous** sur votre compte **InfinityFree** : [https://infinityfree.com](https://infinityfree.com).
2. Cliquez sur votre compte d'hébergement, puis ouvrez **Control Panel** (cPanel) ou directement **Online File Manager** (Monika File Manager).
3. Naviguez dans le dossier racine de votre site :
   - **`htdocs/`** (pour le domaine principal) ou **`votre-domaine.com/htdocs/`** (si sous-domaine/domaine personnalisé).
4. Si un fichier par défaut comme `default.php` ou `index2.html` est présent dans `htdocs`, supprimez-le.
5. Dans la barre d'outils en bas ou en haut du gestionnaire de fichiers :
   - Cliquez sur **Upload** -> **Upload Zip**.
   - Sélectionnez le fichier **`infinityfree-phlox-togo.zip`**.
   - Cochez **Extract** / Confirmez l'extraction automatique dans `htdocs/`.
6. Tous les fichiers seront déployés avec la structure suivante :
   ```text
   htdocs/
   ├── .htaccess                   (Règles de réécriture SPA, HTTPS, sécurité & MIME)
   ├── index.html                  (Point d'entrée React avec balises SEO & Polices)
   ├── manifest.webmanifest        (PWA)
   ├── icon.svg
   ├── paygate-callback.php        (Webhook PayGate Global)
   ├── assets/                     (Fichiers JS et CSS optimisés)
   ├── api/
   │   ├── pay.php                 (Initialisation Push USSD & calcul serveur)
   │   ├── status.php              (Vérification sécurisée statut commande)
   │   └── admin.php               (Espace d'administration des commandes)
   ├── data/
   │   ├── .htaccess               (Protection stricte contre les téléchargements HTTP)
   │   └── server-catalog.json     (Catalogue de prix et frais par ville)
   └── logos/
       ├── mixx-yas.png
       └── flooz-money.png
   ```

---

## 🔐 3. Activation du Certificat SSL (HTTPS)

1. Dans votre espace client InfinityFree, allez dans l'onglet **Free SSL Certificates**.
2. Cliquez sur **New SSL Certificate**, sélectionnez votre domaine.
3. Suivez la validation automatique DNS (Automated DNS Verification) en 1 clic.
4. Une fois émis, cliquez sur **Install SSL Certificate Automatically**.
5. Le fichier `.htaccess` fourni redirigera automatiquement toutes les connexions HTTP vers HTTPS en toute sécurité.

---

## 💳 4. Configuration PayGate Global (Optionnel)

- Dans votre interface PayGate Global, configurez l'URL de notification instantanée (Webhook) :
  ```text
  https://votre-domaine.infinityfreeapp.com/paygate-callback.php
  ```
- Si vous souhaitez définir votre clé API PayGate côté serveur, vous pouvez ajouter `SetEnv PAYGATE_API_KEY "VOTRE_CLE_ICI"` dans le `.htaccess` ou modifier directement la constante dans `api/pay.php`.

---

## ✅ 5. Vérification du Bon Fonctionnement

- **Interface React** : Ouvrez `https://votre-domaine.com/` pour naviguer dans le catalogue, ajouter au panier et tester le tunnel de commande.
- **API PayGate** : L'appel `/api/pay.php` et `/api/status.php` répondra instantanément avec l'état JSON.
- **Routage SPA** : Rafraîchir n'importe quelle URL rechargera correctement l'application grâce au `.htaccess`.
