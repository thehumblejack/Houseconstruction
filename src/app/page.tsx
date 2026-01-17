import type { Metadata } from 'next';
import HomeContent from './HomeContent';

export const metadata: Metadata = {
    title: 'HouseExpert - Suivi de Chantier & Gestion de Construction',
    description: 'La plateforme de référence pour le suivi de chantier en Tunisie. Gérez les étapes complexes, vos fournisseurs et votre budget en toute simplicité.',
    keywords: ['suivi de chantier Tunisie', 'gestion construction maison', 'étapes construction béton armé', 'dashboard BTP interactif', 'logiciel suivi travaux'],
};

export default function Page() {
    return <HomeContent />;
}
