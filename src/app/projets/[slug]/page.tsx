import type { Metadata } from 'next';
import { projectsData } from '@/data/projects-case-studies';
import ProjectDetailContent from './ProjectDetailContent';

type Props = {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const project = projectsData.find(p => p.slug === slug);

    if (!project) {
        return {
            title: 'Projet Introuvable - HouseExpert',
        };
    }

    return {
        title: `${project.title} - ${project.category} | HouseExpert`,
        description: project.description,
        openGraph: {
            title: project.title,
            description: project.description,
            images: [project.image],
        },
        keywords: [project.title, project.category, 'étude de cas btp', 'suivi chantier tunisie', 'maison contemporaine tunisie'],
    };
}

export default function ProjectPage() {
    return <ProjectDetailContent />;
}
