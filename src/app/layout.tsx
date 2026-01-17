import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-jakarta',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://house-expert.pro'),
    title: {
        default: "HouseExpert - Suivi de Chantier & Gestion BTP",
        template: "%s | HouseExpert"
    },
    description: "La solution complète pour le suivi de chantier, la gestion des étapes de construction, et la comparaison des prix fournisseurs. Gérez vos projets BTP avec précision.",
    keywords: ["suivi de chantier", "gestion BTP", "comparateur prix construction", "gestion fournisseurs BTP", "étape construction bureau", "logiciel construction Tunisie", "suivi budget chantier", "maison individuelle", "béton armé"],
    authors: [{ name: "HouseExpert Team" }],
    creator: "HouseExpert",
    publisher: "HouseExpert",
    robots: "index, follow",
    openGraph: {
        type: "website",
        locale: "fr_FR",
        url: "https://house-expert.pro",
        title: "HouseExpert - Suivi de Chantier & Gestion BTP",
        description: "Optimisez la gestion de votre chantier : suivi des étapes, gestion des dépenses et comparateur de prix fournisseurs.",
        siteName: "HouseExpert",
    },
    twitter: {
        card: "summary_large_image",
        title: "HouseExpert - Suivi de Chantier & Gestion BTP",
        description: "Gérez votre chantier de A à Z : étapes, fournisseurs et budget en un seul clic.",
    },
    icons: {
        icon: "/favicon.ico",
        shortcut: "/icon.png",
        apple: "/apple-icon.png",
    },
    manifest: "/manifest.json",
};

import { AuthProvider } from '@/context/AuthContext';
import { ProjectProvider } from '@/context/ProjectContext';
import Navbar from '@/components/Navbar';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" className={jakarta.variable} suppressHydrationWarning>
            <body className={`${jakarta.className} bg-slate-50 relative`} suppressHydrationWarning={true}>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "HouseExpert",
                            "operatingSystem": "Web",
                            "applicationCategory": "BusinessApplication",
                            "description": "Logiciel de suivi de chantier et gestion BTP avec comparateur de prix fournisseurs.",
                            "offers": {
                                "@type": "Offer",
                                "price": "0",
                                "priceCurrency": "TND"
                            }
                        })
                    }}
                />
                <div className="grain" suppressHydrationWarning />
                <AuthProvider>
                    <ProjectProvider>
                        <Navbar />
                        <main className="min-h-screen">{children}</main>
                    </ProjectProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
