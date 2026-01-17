import type { Metadata } from "next";
import ArticlesContent from "./ArticlesContent";

export const metadata: Metadata = {
    title: "Comparateur de Prix Matériaux & Catalogue Articles",
    description: "Comparez les prix des matériaux de construction entre différents fournisseurs. Optimisez vos achats de béton, fer, et autres matériaux.",
    keywords: ["prix matériaux construction", "comparateur prix béton", "prix fer tunisie", "catalogue articles BTP", "matériaux de construction"],
};

export default function ArticlesPage() {
    return <ArticlesContent />;
}
