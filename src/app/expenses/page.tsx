import type { Metadata } from "next";
import ExpensesContent from "./ExpensesContent";

export const metadata: Metadata = {
    title: "Suivi des Dépenses & Facturation Chantier",
    description: "Gérez vos factures, bons de livraison et acomptes. Suivez en temps réel le budget de votre chantier et les paiements fournisseurs.",
    keywords: ["suivi dépenses chantier", "facturation BTP", "gestion acomptes construction", "budget construction maison", "comptabilité chantier"],
};

export default function ExpensesPage() {
    return <ExpensesContent />;
}
