# 🏗️ Construction Dashboard

Un dashboard interactif et minimaliste pour gérer les étapes de construction d'un bâtiment en béton armé, construit avec Next.js et shadcn/ui.

## ✨ Fonctionnalités

- **📊 Suivi de progression** - Visualisez l'avancement global de votre projet
- **✅ Gestion des étapes** - Marquez les étapes comme complétées avec un simple clic
- **🖼️ Images illustratives** - Chaque étape est accompagnée d'une illustration technique pour une meilleure compréhension
- **🔍 Filtrage intelligent** - Filtrez par catégorie (Fondations, Structure, Maçonnerie, Finitions)
- **📱 Design responsive** - Interface adaptée à tous les écrans
- **🎨 Interface minimaliste** - Design épuré avec shadcn/ui
- **📝 Détails expandables** - Cliquez sur une étape pour voir tous les détails et une image agrandie

## 🚀 Démarrage rapide

### Installation

```bash
npm install
```

### Développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Build de production

```bash
npm run build
npm start
```

## 📋 Étapes de construction incluses

Le dashboard couvre **19 étapes** complètes de construction :

### 🏗️ Fondations (6 étapes)
1. Bornage et délimitation du terrain
2. Terrassements en pleine masse
3. Excavation des fondations
4. Béton de propreté et fondations
5. Longrines et remblaiement
6. Regard d'assainissement

### 🏢 Structure (8 étapes)
7. Dallage et coffrage
8. Poteaux RDC
9. Coffrage dalle RDC
10. Ferraillage et hourdis dalle RDC
11. Coulage dalle RDC
12. Cure et décoffrage dalle RDC
13. Escaliers
14. Poteaux 1er étage
15. Dalle 1er étage

### 🧱 Maçonnerie (2 étapes)
16. Maçonnerie RDC
17. Maçonnerie 1er étage

### 🎨 Finitions (2 étapes)
18. Porte-à-faux (à venir)
19. Dalle terrasse non accessible (à venir)

## 🛠️ Technologies utilisées

- **Next.js 15** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **shadcn/ui** - Composants UI
- **Lucide React** - Icônes
- **Radix UI** - Primitives UI accessibles

## 📁 Structure du projet

```
src/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx            # Page dashboard
│   └── globals.css         # Styles globaux
├── components/
│   └── ui/                 # Composants shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       └── badge.tsx
├── data/
│   └── construction-steps.ts  # Données des étapes
└── lib/
    └── utils.ts            # Utilitaires
```

## 🎯 Utilisation

1. **Marquer une étape comme complétée** : Cliquez sur la checkbox à gauche de l'étape
2. **Voir les détails** : Cliquez sur le bouton chevron pour expandre les détails
3. **Filtrer les étapes** : Utilisez les boutons de filtre en haut pour afficher uniquement certaines catégories
4. **Suivre la progression** : La barre de progression en haut montre l'avancement global

## 🎨 Personnalisation

### Modifier les étapes

Éditez le fichier `src/data/construction-steps.ts` pour ajouter, modifier ou supprimer des étapes.

### Changer les couleurs

Les couleurs sont définies dans `src/app/globals.css` avec les variables CSS de shadcn/ui.

## 📝 Licence

Ce projet est open source et disponible sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

Développé avec ❤️ pour faciliter la gestion de projets de construction
# Houseconstruction
