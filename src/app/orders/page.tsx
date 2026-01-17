import type { Metadata } from 'next';
import OrdersContent from './OrdersContent';

export const metadata: Metadata = {
    title: 'Gestion des Commandes & Livraisons',
    description: 'Suivez vos commandes en cours, les livraisons prévues et l\'état de réception des matériaux sur votre chantier.',
    keywords: ['commandes matériaux', 'livraison chantier', 'suivi commandes BTP', 'logistique construction'],
};

export default function OrdersPage() {
    return <OrdersContent />;
}
