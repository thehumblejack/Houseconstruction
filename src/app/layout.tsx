import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Construction Dashboard - Gestion des Étapes",
    description: "Dashboard interactif pour gérer les étapes de construction d'un bâtiment en béton armé",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className={inter.className} suppressHydrationWarning={true}>{children}</body>
        </html>
    );
}
