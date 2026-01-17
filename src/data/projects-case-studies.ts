export interface ProjectCaseStudy {
    slug: string;
    title: string;
    category: string;
    image: string;
    description: string;
    challenge: string;
    solution: string;
    results: string[];
    featuresUsed: string[];
    stats: { label: string; value: string }[];
}

export const projectsData: ProjectCaseStudy[] = [
    {
        slug: 'villa-azure',
        title: 'Villa Azure',
        category: 'Architecture Moderne',
        image: '/images/landing/hero.png',
        description: 'Une résidence de luxe située sur les côtes tunisiennes, alliant design contemporain et efficacité structurelle.',
        challenge: 'La coordination de plus de 15 sous-traitants différents tout en maintenant un budget strict et des standards de finition extrêmement élevés.',
        solution: 'L\'utilisation de HouseExpert pour centraliser tous les paiements, suivre l\'avancement quotidien étape par étape et comparer les prix des matériaux critiques comme le fer et le béton.',
        results: [
            'Réduction des délais de 15% grâce au suivi en temps réel.',
            'Économie de 8% sur les matériaux de gros œuvre.',
            'Transparence totale pour les propriétaires résidant à l\'étranger.'
        ],
        featuresUsed: ['Dashboard de Chantier', 'Gestion des Dépenses', 'Suivi des Fournisseurs'],
        stats: [
            { label: 'Surface', value: '450m²' },
            { label: 'Durée', value: '14 mois' },
            { label: 'Sous-traitants', value: '18' }
        ]
    },
    {
        slug: 'eclat-urbain',
        title: 'Éclat Urbain',
        category: 'Design Commercial',
        image: '/images/landing/detail.png',
        description: 'Un espace de bureaux moderne au cœur du Lac II, conçu pour maximiser la lumière naturelle et la modularité.',
        challenge: 'Optimiser l\'achat de matériaux en gros volume pour une structure complexe en béton armé.',
        solution: 'Le module "Market Analytics" de HouseExpert a permis de comparer les prix entre la STE Mostakbel et Ahmed Ben Hdya en temps réel, garantissant le meilleur prix pour chaque tonne de fer.',
        results: [
            '12.5% d\'économie sur le fer et le ciment.',
            'Zéro erreur de facturation grâce à la numérisation des bons de livraison.',
            'Validation instantanée des étapes par l\'architecte via le dashboard.'
        ],
        featuresUsed: ['Comparateur de Prix', 'Gestion des Commandes', 'Analytics Marché'],
        stats: [
            { label: 'Béton Coulé', value: '1200m³' },
            { label: 'Économie', value: '12%' },
            { label: 'Lots gérés', value: '24' }
        ]
    },
    {
        slug: 'havre-de-paix',
        title: 'Havre de Paix',
        category: 'Maison Individuelle',
        image: '/images/landing/interior.png',
        description: 'Une maison familiale chaleureuse mettant l\'accent sur l\'efficacité énergétique et l\'intégration paysagère.',
        challenge: 'Assurer que chaque étape de la construction respecte le planning initial pour éviter les pénalités de retard des artisans.',
        solution: 'Le dashboard chronologique a servi de guide quotidien, permettant de notifier les équipes à l\'avance pour chaque phase (fondation, maçonnerie, finition).',
        results: [
            'Respect strict du calendrier sur 10 mois.',
            'Suivi précis des acomptes versés aux artisans.',
            'Documentation complète de chaque phase pour l\'assurance.'
        ],
        featuresUsed: ['Chronologie Chantier', 'Acomptes Fournisseurs', 'Gestion Documentaire'],
        stats: [
            { label: 'Budget Maitrisé', value: '100%' },
            { label: 'Phases Validées', value: '42' },
            { label: 'Photos Site', value: '150+' }
        ]
    },
    {
        slug: 'structure-pro',
        title: 'Structure Pro',
        category: 'Ingénierie',
        image: '/images/landing/construction.png',
        description: 'Un complexe industriel exigeant une précision millimétrée et une traçabilité totale des matériaux.',
        challenge: 'Maintenir un registre impeccable de tous les documents techniques et des certifications de matériaux.',
        solution: 'HouseExpert a centralisé tous les plans de coffrage, les résultats de tests de béton et les factures fournisseurs dans un espace sécurisé et accessible.',
        results: [
            'Accès instantané aux plans sur site via mobile.',
            'Traçabilité totale de la chaîne d\'approvisionnement.',
            'Simplification des audits de conformité.'
        ],
        featuresUsed: ['Coffre-fort Numérique', 'Suivi de Livraison', 'Tableau de Bord Admin'],
        stats: [
            { label: 'Plans Catalogués', value: '85' },
            { label: 'Poids Acier', value: '45 Tonnes' },
            { label: 'Conformité', value: '100%' }
        ]
    }
];
