import type { Metadata } from 'next';
import InboxContent from './InboxContent';

export const metadata: Metadata = {
    title: 'Ajout rapide de facture',
    description: 'Photographiez une facture et envoyez-la en file de vérification en quelques secondes.',
    robots: 'noindex',
};

export default function InboxPage() {
    return <InboxContent />;
}
