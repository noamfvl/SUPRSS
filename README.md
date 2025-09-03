# SUPRSS – Lecteur et gestionnaire de flux RSS

SUPRSS est une application web moderne développée pour **lire, organiser et partager des flux RSS**.  
Elle propose une alternative simple, collaborative et auto-hébergeable aux solutions comme *Feedly* ou *Inoreader*.  

---

##  Fonctionnalités principales
- **Authentification** : email/mot de passe ou connexion via Google (OAuth2).
- **Collections de flux** :
  - Collections personnelles ou partagées.
  - Gestion des rôles (propriétaire, membre, lecteur).
- **Flux RSS et articles** :
  - Ajout et paramétrage de flux.
  - Stockage persistant des articles (titre, auteur, date, résumé, statut lu/non lu, favoris).
  - Recherche et filtrage par source, tags, statut, favoris.
- **Collaboration** :
  - Messagerie instantanée intégrée aux collections partagées.
  - Commentaires associés aux articles.
- **Interopérabilité** :
  - Import/export de flux au format OPML, JSON ou CSV.

---

##  Architecture technique
- **Backend (API)** : NestJS + TypeScript, avec Prisma (PostgreSQL).
- **Frontend (client web)** : Next.js (React), TailwindCSS, shadcn/ui.
- **Base de données** : PostgreSQL.
- **Cache & jobs** : Redis + BullMQ.
- **Communication temps réel** : Socket.IO.
- **Containérisation** : Docker + docker-compose.

---

##  Installation et déploiement

### Prérequis
- [Docker](https://www.docker.com/) et [docker-compose](https://docs.docker.com/compose/).
- Un fichier `.env` configuré (voir `.env.example`).

### Étapes
```bash
# Cloner le dépôt
git clone https://github.com/noamfvl/SUPRSS.git
cd suprss

# Lancer l'application
docker-compose up --build
