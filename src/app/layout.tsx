import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-jakarta',
});

export const metadata: Metadata = {
    title: "Construction Dashboard - Gestion des Étapes",
    description: "Dashboard interactif pour gérer les étapes de construction d'un bâtiment en béton armé",
};

import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" className={jakarta.variable}>
            <body className={`${jakarta.className} bg-slate-50 relative`} suppressHydrationWarning={true}>
                <div className="grain" />
                <AuthProvider>
                    <Navbar />
                    <main className="min-h-screen">{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
