# Orbit — Plateforme SaaS d'Agents IA Autonomes (FR / IT / EN)

**Orbit** est une plateforme SaaS full-stack d'agents IA autonomes construite avec **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS v4**, **Firebase Auth & Firestore**, **Google Gemini (`@google/genai`)**, un **Marketplace d'outils MCP Composio**, un **planificateur de routines récurrentes Inngest** et un **sandbox Bureau Cloud VM E2B** par agent.

---

## Fonctionnalités Principales

- **Multilingue natif (`FR` | `IT` | `EN`)** : Interface, cartes génératives et réponses d'agents IA disponibles en Français, Italien et Anglais.
- **Gestion Multi-Agents & Avatars DiceBear Glass** : Créez et configurez des agents dédiés avec instructions personnalisées et identité visuelle unique.
- **Chat IA Bidirectionnel & UI Générative** :
  - `message` : Réponses markdown structurées
  - `clarification` : Questions de précision avant création de routine
  - `tool_connection` : Cartes de connexion OAuth directe aux outils requis
  - `routine` : Proposition et mise à jour de routines planifiées
  - `vm_action` : Exécution et extraction web en direct via le Cloud VM
- **Bureau Cloud VM E2B (`/api/vm/browse`)** : Navigation web en direct et extraction des flux RSS Google Actualités (`FR`, `IT`, `US`) avec pause automatique après 2 minutes d'inactivité.
- **Planificateur de Routines Inngest (`/api/inngest/run`)** : Exécution en 5 étapes avec journaux détaillés, déclenchement manuel ou Cron 60 minutes, et conservation de l'historique sur 3 jours (72h).
- **Sécurité & Persistance Firebase** : Authentification Google OAuth et base de données Firestore (`users`, `agents`, `routines`, `executions`, `messages`) protégée par `firestore.rules`.

---

## Installation & Démarrage Local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Renseignez GEMINI_API_KEY dans .env.local

# 3. Lancer les tests unitaires et de sécurité Firestore
npx tsx --test lib/orbit-logic.test.ts firestore.rules.test.ts

# 4. Démarrer le serveur de développement (port 3000)
npm run dev

# 5. Compiler pour la production
npm run build
```

---

## Déploiement sur GitHub & Cloud Run / Vercel

1. **Depuis Google AI Studio** : Cliquez sur l'icône **GitHub** en haut à droite de l'interface AI Studio pour exporter et synchroniser directement ce dépôt vers votre compte GitHub.
2. **En ligne de commande Git** :
   ```bash
   git remote add origin https://github.com/<votre-utilisateur>/<votre-repo>.git
   git push -u origin main
   ```
3. **Intégration Continue (GitHub Actions)** : Le workflow `.github/workflows/ci-deploy.yml` exécute automatiquement les tests unitaires, la validation des règles Firestore et le build de production Next.js à chaque `push` sur `main`.
