import type { Metadata } from "next";
import SuppliersContent from "./SuppliersContent";

export const metadata: Metadata = {
    title: "Gestion des Fournisseurs & Base de Données BTP",
    description: "Gérez votre base de données fournisseurs, comparez les prix des matériaux et suivez les engagements financiers par prestataire.",
    keywords: ["fournisseurs BTP", "base de données fournisseurs", "matériaux construction", "devis construction", "comparatif prix BTP"],
};

export default function SuppliersPage() {
    return <SuppliersContent />;
}
