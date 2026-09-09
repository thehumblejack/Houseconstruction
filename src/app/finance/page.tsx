import type { Metadata } from 'next';
import FinanceContent from './FinanceContent';

export const metadata: Metadata = {
    title: 'Finance & Trésorerie du Chantier',
    description: 'Suivez vos comptes bancaires, vos entrées et sorties d\'argent, et l\'argent réellement disponible pour vos commandes.',
};

export default function FinancePage() {
    return <FinanceContent />;
}
