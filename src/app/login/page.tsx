import type { Metadata } from 'next';
import LoginContent from './LoginContent';

export const metadata: Metadata = {
    title: 'Connexion Client - HouseExpert',
    description: 'Accédez à votre espace projet, suivez votre chantier et gérez vos factures en toute sécurité.',
    robots: 'noindex, nofollow', // Good practice for login pages
};

export default function LoginPage() {
    return <LoginContent />;
}
