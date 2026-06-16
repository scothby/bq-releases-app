# Présentation et Architecture : BigQuery Release Notes Hub

Ce projet est une application web légère permettant de suivre les notes de mise à jour (Release Notes) de Google BigQuery, de les filtrer, et de les partager sur X (Twitter).

---

## 🌟 Principales Fonctionnalités

1. **Agrégation Automatique** : Récupération en temps réel du flux officiel des notes de mise à jour de Google BigQuery via leur flux RSS/Atom.
2. **Segmentation Intelligente** : Les notes d'une même journée sont segmentées par type de mise à jour (`Feature`, `Issue`, `Deprecation`, etc.) pour un affichage individuel sous forme de cartes.
3. **Recherche & Filtrage** :
   - Recherche textuelle instantanée dans le contenu des notes.
   - Filtres par catégories thématiques (`Features`, `Issues`, `Deprecations`, `Others`).
4. **Intégration X (Twitter)** :
   - **Tweet unique** : Génération d'un tweet pré-rempli pour une mise à jour spécifique, avec troncature intelligente (max 280 caractères) et intégration du lien source.
   - **Tweet groupé (Multi-sélection)** : Sélection de plusieurs mises à jour via des cases à cocher pour composer un tweet résumé global.

---

## 🏛️ Décomposition de l'Architecture

L'application repose sur un modèle classique client-serveur ultra-léger.

### 1. Côté Serveur (Python & Flask)

Le fichier `app.py` gère le routage et le traitement des flux de données :
*   **Routage Web** : Sert la page principale HTML statique (`/templates/index.html`).
*   **Proxy & Parseur RSS (`/api/releases`)** :
    1. Télécharge le fichier XML Atom depuis l'URL de Google.
    2. Utilise `xml.etree.ElementTree` pour extraire chaque balise `<entry>`.
    3. Utilise **BeautifulSoup4** pour découper le contenu HTML de chaque jour selon les balises de titre `<h3>` (ex: `<h3>Feature</h3>`).
    4. Retourne les mises à jour structurées sous forme de tableau JSON.

### 2. Côté Client (Vanilla HTML, CSS et JS)

L'interface utilisateur utilise des technologies web pures sans framework lourd :
*   **Structure HTML** (`templates/index.html`) : Structure sémantique intégrant les zones de filtres, la grille de cartes (`#notes-grid`) et le modal de prévisualisation du Tweet.
*   **Design & UI CSS** (`static/css/style.css`) : Thème sombre moderne (*Sleek Dark Mode*), animations de chargement, badges colorés et effets de transition interactifs.
*   **Logique JS** (`static/js/app.js`) :
    - Gère l'état local (recherche, sélection multi-cartes, catégorie active).
    - Effectue l'appel asynchrone `fetch('/api/releases')` au chargement.
    - Filtre et génère dynamiquement les cartes dans le DOM.
    - Ouvre la fenêtre de partage Twitter via l'URL d'intention X : `https://twitter.com/intent/tweet?text=...`

---

## 🔄 Exemple de Flux : Récupération des données

Voici le cheminement exact d'une requête lorsque vous ouvrez la page ou cliquez sur **"Refresh Feed"** :

1. **Client -> Serveur** : Le JavaScript du navigateur envoie une requête HTTP GET vers l'API locale :
   ```http
   GET http://127.0.0.1:5000/api/releases
   ```
2. **Serveur -> Google** : Le serveur Flask télécharge le fichier XML Atom depuis l'URL officielle de Google.
3. **Traitement Serveur** : Le serveur parse le XML, segmente les notes quotidiennes en objets JSON individuels et retourne la réponse.
4. **Serveur -> Client** : Le serveur renvoie la réponse au format JSON :
   ```json
   {
     "count": 24,
     "releases": [
       {
         "id": "tag:google.com,2016:bigquery-release-notes#June_15_2026#Feature",
         "date": "June 15, 2026",
         "category": "Feature",
         "html": "<p>Use Gemini Cloud Assist to analyze your SQL queries...</p>",
         "text": "Use Gemini Cloud Assist to analyze your SQL queries..."
       }
     ],
     "status": "success"
   }
   ```
5. **Rendu Client** : Le JavaScript filtre les données selon les critères de l'utilisateur, construit les éléments HTML à la volée et met à jour l'affichage de la grille.
