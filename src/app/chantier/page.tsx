import type { Metadata } from 'next';
import ChantierContent from './ChantierContent';

export const metadata: Metadata = {
    title: 'Suivi de Chantier - Étapes & Avancement',
    description: 'Visualisez l\'avancement de votre chantier étape par étape. De la fondation aux finitions, gardez le contrôle sur les travaux.',
    keywords: ['suivi travaux', 'étapes chantier', 'construction maison tunisie', 'gros oeuvre', 'fondation maison'],
};

export default function ChantierPage() {
    return <ChantierContent />;
}
