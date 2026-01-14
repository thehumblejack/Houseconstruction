export interface StepDetail {
    title: string;
    description: string;
    image?: string;
}

export interface ConstructionStep {
    id: string;
    title: string;
    description: string;
    duration: string;
    category: 'foundation' | 'structure' | 'masonry' | 'finishing';
    completed: boolean;
    order: number;
    details: StepDetail[];
    timestamp?: string;
    image?: string;
}

export const constructionSteps: ConstructionStep[] = [
    {
        id: '1',
        title: 'Délimitation du terrain',
        description: 'Le géomètre définit les limites exactes du terrain et l\'emplacement de la maison.',
        duration: '1-2 jours',
        category: 'foundation',
        completed: false,
        order: 1,
        image: '/images/steps/step_01.png',
        details: [
            {
                title: 'Observer le terrain (Reconnaissance)',
                description: 'Le géomètre marche sur tout le terrain pour voir comment il est fait. Il regarde s\'il y a des pentes, des bosses ou des arbres gênants. C\'est l\'étape d\'observation pour éviter les mauvaises surprises avant de commencer.'
            },
            {
                title: 'Planter les piquets (Bornage)',
                description: 'Il plante des piquets rouges très précis aux quatre coins du terrain. C\'est officiel : cela dit exactement "Ceci est chez toi, et ceci est chez le voisin". On ne peut pas construire en dehors de ces piquets.'
            },
            {
                title: 'Tracer la maison au sol (Implantation)',
                description: 'Avec de la poudre blanche (comme au football), on dessine la forme exacte de la maison directement sur l\'herbe. On voit enfin la vraie taille de la future maison !'
            }
        ]
    },
    {
        id: '2',
        title: 'Nettoyage et nivellement',
        description: 'Préparation du sol en enlevant la terre végétale pour atteindre le sol stable.',
        duration: '3-5 jours',
        category: 'foundation',
        completed: false,
        order: 2,
        image: '/images/steps/step_02.png',
        details: [
            {
                title: 'Enlever l\'herbe (Décapage)',
                description: 'La grosse pelleteuse gratte les 20 ou 30 premiers centimètres de terre. Cette terre avec de l\'herbe est trop molle pour construire dessus, alors on l\'enlève et on la met de côté pour le jardin plus tard.'
            },
            {
                title: 'Chercher le sol dur (Bon sol)',
                description: 'On continue de creuser jusqu\'à ce que la pelle touche une couche de terre très dure et compacte. C\'est sur cette couche solide qu\'on pourra poser la maison sans qu\'elle ne s\'enfonce.'
            },
            {
                title: 'Vérifier la solidité (Réception de fouille)',
                description: 'Un monsieur spécialisé (le géotechnicien) vient vérifier le fond du trou. Il confirme que "C\'est bon, ce sol est assez costaud pour porter tout le poids de la maison !"'
            }
        ]
    },
    {
        id: '3',
        title: 'Excavation des fondations',
        description: 'Creusement des trous profonds qui accueilleront les piliers de la maison.',
        duration: '2-3 jours',
        category: 'foundation',
        completed: false,
        order: 3,
        image: '/images/steps/step_03.png',
        details: [
            {
                title: 'Creuser les trous (Fouilles en puits)',
                description: 'Aux endroits où il y aura des piliers, on creuse des puits carrés très profonds. C\'est comme faire des gros trous dans le sable, mais beaucoup plus grands et carrés.'
            },
            {
                title: 'Protéger du gel (Hors gel)',
                description: 'On creuse profondément (au moins 1 mètre) pour que le bas de la fondation ne gèle jamais l\'hiver. Si le sol gèle sous la maison, il gonfle et peut casser la maison !'
            },
            {
                title: 'Aplatir le fond (Nivellement)',
                description: 'On nettoie parfaitement le fond du trou pour qu\'il soit plat comme une table. S\'il y a des bosses, la maison ne sera pas droite.'
            }
        ]
    },
    {
        id: '4',
        title: 'Coulage des fondations',
        description: 'Mise en place des armatures métalliques et coulage du béton de fondation.',
        duration: '3-4 jours',
        category: 'foundation',
        completed: false,
        order: 4,
        image: '/images/steps/step_04.png',
        details: [
            {
                title: 'Couche de propreté (Béton de propreté)',
                description: 'On verse d\'abord une toute petite couche de béton maigre au fond. C\'est juste pour ne pas poser les fers directement sur la terre sale.'
            },
            {
                title: 'Poser le panier en fer (Semelle isolée)',
                description: 'On descend un gros panier fait de barres de fer au fond du trou. C\'est le squelette du pied de la maison, ça le rend incassable.'
            },
            {
                title: 'Installer les fers verticaux (Amorce poteau)',
                description: 'On attache 4 grandes barres verticales au panier. Ces barres vont dépasser du trou pour qu\'on puisse construire les poteaux par-dessus plus tard.'
            },
            {
                title: 'Remplir de béton (Coulage des semelles)',
                description: 'On remplit tout le trou avec du béton liquide très costaud. En séchant, ça devient un énorme bloc de pierre artificielle ancré dans le sol.'
            }
        ]
    },
    {
        id: '5',
        title: 'Longrines (Ceinture)',
        description: 'Liaison de toutes les fondations entre elles par des poutres en béton armé.',
        duration: '4-5 jours',
        category: 'foundation',
        completed: false,
        order: 5,
        image: '/images/steps/step_05.png',
        details: [
            {
                title: 'Relier les piliers (Longrines)',
                description: 'On pose des poutres en fer horizontales qui relient tous les blocs de fondation entre eux. C\'est comme si tous les pieds de la maison se tenaient la main pour ne pas bouger.'
            },
            {
                title: 'Attacher les fers (Ligature)',
                description: 'Avec du fil de fer, on attache très fort les poutres aux attentes des poteaux. Tout doit être solidaire, comme un seul grand morceau de métal.'
            },
            {
                title: 'Reboucher les trous (Remblaiement)',
                description: 'Maintenant que le béton est sec, on remet de la terre autour et on tasse bien fort. Les fondations sont maintenant cachées sous terre.'
            },
            {
                title: 'Tout mettre à plat (Arase étanche)',
                description: 'On lisse le dessus des poutres au millimètre près. C\'est la base parfaitement plate sur laquelle on va commencer à monter les murs.'
            }
        ]
    },
    {
        id: '6',
        title: 'Dallage sur terre-plein',
        description: 'Coulage de la dalle de béton qui constitue le sol du rez-de-chaussée.',
        duration: '3-4 jours',
        category: 'structure',
        completed: false,
        order: 6,
        image: '/images/steps/step_07.png',
        details: [
            {
                title: 'Préparer le sol (Hérisson & Polyane)',
                description: 'On pose des cailloux et un film plastique pour protéger de l\'humidité. On met aussi des planches (coffrage) sur les bords.'
            },
            {
                title: 'La Recette du Béton (Dosage B25)',
                description: 'Pour 1m³ de béton solide, il faut : 350kg de ciment, 830kg de sable, 1100kg de gravier et 155L d\'eau. C\'est précis !'
            },
            {
                title: 'Verser le béton (Coulage)',
                description: 'La bétonnière verse le mélange sur tout le sol. On le répartit bien partout sur 12cm d\'épaisseur.'
            },
            {
                title: 'Résultat Fini (Dallage)',
                description: 'Une fois sec et lissé, on obtient une grande plaque de béton propre. C\'est le sol du rez-de-chaussée !'
            }
        ]
    },
    {
        id: '7',
        title: 'Poteaux du RDC',
        description: 'Élévation des poteaux porteurs du rez-de-chaussée.',
        duration: '2-3 jours',
        category: 'structure',
        completed: false,
        order: 7,
        image: '/images/steps/step_08.png',
        details: [
            {
                title: 'Préparer le fer (Ferraillage poteaux)',
                description: 'On attache des cages en fer verticales aux fers qui sortent du sol. Ça monte jusqu\'au plafond ! C\'est la colonne vertébrale du poteau.'
            },
            {
                title: 'Mettre le moule (Coffrage)',
                description: 'On enferme le fer dans une boîte en bois bien serrée. Elle a la forme exacte du futur poteau carré.'
            },
            {
                title: 'Remplir le moule (Coulage)',
                description: 'On verse du béton liquide par le haut de la boîte en bois. On tape dessus pour faire sortir les bulles d\'air et que le béton aille partout.'
            },
            {
                title: 'Enlever le moule (Décoffrage)',
                description: 'Le lendemain, le béton est dur. On dévisse les planches de bois et surprise : un beau poteau en béton gris apparaît !'
            }
        ]
    },
    {
        id: '8',
        title: 'Maçonnerie des murs',
        description: 'Construction des murs extérieurs et intérieurs en briques.',
        duration: '7-10 jours',
        category: 'masonry',
        completed: false,
        order: 8,
        image: '/images/steps/step_09.png',
        details: [
            {
                title: 'Monter les briques (Montage des murs)',
                description: 'Le maçon pose les briques rouges une par une. Il met un peu de "colle" (mortier) entre chaque brique pour qu\'elles tiennent ensemble.'
            },
            {
                title: 'Vérifier la droiture (Aplomb)',
                description: 'Avec un niveau à bulle, on vérifie tout le temps que le mur ne penche pas. Un mur qui penche pourrait tomber !'
            },
            {
                title: 'Renforts Verticaux (Raidisseurs)',
                description: 'Aux angles et autour des portes, on coule des petits poteaux en béton (raidisseurs) pour que le mur ne fendille pas.'
            },
            {
                title: 'Faire le haut des fenêtres (Linteau)',
                description: 'Au-dessus de chaque fenêtre, on coule une petite poutre en béton armé. C\'est elle qui porte le poids du mur au-dessus du trou.'
            }
        ]
    },
    {
        id: '9',
        title: 'Assainissement (Rappel Video 2)',
        description: 'Installation des réseaux d\'évacuation des eaux usées (Mentionné au début de la partie 2).',
        duration: '2-3 jours',
        category: 'foundation',
        completed: false,
        order: 9,
        image: '/images/steps/step_06.png',
        details: [
            {
                title: 'Construire la boîte d\'accès (Regard de visite)',
                description: 'On fabrique une petite chambre en béton enterrée. C\'est par là qu\'on pourra passer une caméra ou un furet si jamais les toilettes sont bouchées !'
            },
            {
                title: 'Poser les tuyaux en pente (Pente d\'écoulement)',
                description: 'On installe les gros tuyaux orange au fond de la tranchée. Attention, ils doivent toujours descendre un petit peu pour que l\'eau coule toute seule vers la rue.'
            },
            {
                title: 'Brancher à la ville (Raccordement)',
                description: 'On connecte notre tuyau au grand tuyau qui passe sous la route. C\'est pour que l\'eau sale parte vers l\'usine de nettoyage de la ville.'
            },
            {
                title: 'Fermer la boîte (Tampon)',
                description: 'On met un couvercle lourd en fonte ou en béton sur la boîte pour que personne ne tombe dedans et pour bloquer les mauvaises odeurs.'
            }
        ]
    },
    {
        id: '10',
        title: 'Coffrage de la dalle',
        description: 'Mise en place de la structure temporaire pour soutenir le plancher haut.',
        duration: '3-4 jours',
        category: 'structure',
        completed: false,
        order: 10,
        image: '/images/steps/step_10.png',
        details: [
            {
                title: 'Mettre les échasses (Étaiement)',
                description: 'On remplit la pièce de grands pieds en métal réglables (étais). Ils vont devoir porter tout le poids du plafond.'
            },
            {
                title: 'Le Défi du Balcon (Porte-à-faux)',
                description: 'Pour la partie qui vole dans le vide (balcon), on doit mettre encore plus d\'étais et un moule solide. Ça ne doit pas bouger d\'un millimètre !',
                image: '/images/steps/step_18.png'
            },
            {
                title: 'Poser le plancher bois (Fond de moule)',
                description: 'Sur ces pieds, on pose des poutres en bois et des planches. On crée un faux plafond temporaire en bois sur lequel on va travailler.'
            },
            {
                title: 'Le trou de l\'escalier (Trémie)',
                description: 'On fait bien attention à laisser un grand trou rectangulaire vide. C\'est par là qu\'on pourra passer l\'escalier pour monter à l\'étage !'
            }
        ]
    },
    {
        id: '11',
        title: 'Ferraillage du plancher',
        description: 'Installation des éléments de remplissage et des armatures de la dalle.',
        duration: '4-5 jours',
        category: 'structure',
        completed: false,
        order: 11,
        image: '/images/steps/step_11.png',
        details: [
            {
                title: 'Remplir les vides (Hourdis)',
                description: 'Entre les poutrelles, on pose des blocs légers. On les coupe parfois pour qu\'ils rentrent parfaitement dans les coins.'
            },
            {
                title: 'Renfort du Balcon (Chapeaux)',
                description: 'Pour le balcon, on ajoute des fers spéciaux sur le dessus (en chapeau). C\'est comme des bretelles pour retenir le balcon à la maison.',
                image: '/images/steps/step_18.png'
            },
            {
                title: 'Le tapis de fer (Treillis soudé)',
                description: 'On déroule par-dessus tout ça un immense grillage en fer rigide. C\'est ce qui va empêcher le sol de fissurer.'
            },
            {
                title: 'Femer les bords (Coffrage de rive)',
                description: 'On met des planches tout autour de la maison en haut des murs pour faire un rebord. Ça retiendra le béton liquide.'
            }
        ]
    },
    {
        id: '12',
        title: 'Coulage de la dalle',
        description: 'Bétonnage du plancher haut du rez-de-chaussée.',
        duration: '1 jour',
        category: 'structure',
        completed: false,
        order: 12,
        image: '/images/steps/step_12.png',
        details: [
            {
                title: 'Le camion arrive (Livraison BPE)',
                description: 'Le camion rempli de béton frais arrive du chantier. Le tambour tourne pour que le béton ne durcisse pas avant d\'être coulé.'
            },
            {
                title: 'Monter le béton (Pompage)',
                description: 'Comme on est en hauteur, une pompe géante aspire le béton du camion et l\'envoie dans un tuyau jusqu\'au toit.'
            },
            {
                title: 'Étaler le béton (Tirage)',
                description: 'Les maçons, bottes aux pieds, tirent le béton avec des râteaux pour qu\'il aille bien partout entre les fers.'
            },
            {
                title: 'Lisser parfait (Talochage)',
                description: 'On passe la taloche (une planche plate) pour rendre la surface toute lisse. Ce sera le sol de l\'étage !'
            }
        ]
    },
    {
        id: '13',
        title: 'Séchage (Cure)',
        description: 'Temps d\'attente et entretien pour que le béton atteigne sa solidité maximale.',
        duration: '15-28 jours',
        category: 'structure',
        completed: false,
        order: 13,
        image: '/images/steps/step_13.png',
        details: [
            {
                title: 'Donner à boire (Cure)',
                description: 'Le béton chauffe quand il durcit ! On l\'arrose avec de l\'eau pour le refroidir, sinon il risque de craquer comme de la terre sèche.'
            },
            {
                title: 'Ne pas toucher (Prise)',
                description: 'Pendant quelques jours, interdiction de marcher dessus ! Le béton est en train de se transformer de liquide à pierre.'
            },
            {
                title: 'Attendre 3 semaines (Séchage complet)',
                description: 'Même si ça a l\'air sec, l\'intérieur est encore un peu mou. Il faut attendre 21 jours pour que ce soit solide à 100%.'
            },
            {
                title: 'Enlever les pieds (Décoffrage)',
                description: 'Enfin, on peut enlever les pieds en métal (étais) en dessous. Le plafond tient maintenant tout seul en l\'air ! Magique !'
            }
        ]
    },
    {
        id: '14',
        title: 'Escalier en béton',
        description: 'Construction de l\'escalier reliant le RDC à l\'étage.',
        duration: '5-7 jours',
        category: 'structure',
        completed: false,
        order: 14,
        image: '/images/steps/step_14.png',
        details: [
            {
                title: 'Faire le moule en pente (Coffrage paillasse)',
                description: 'C\'est compliqué : on doit construire un toboggan en bois avec des triangles pour faire les marches. Ça doit être super solide.'
            },
            {
                title: 'Les muscles de l\'escalier (Ferraillage escalier)',
                description: 'On tord des barres de fer pour qu\'elles suivent la forme des marches. On les accroche en haut et en bas.'
            },
            {
                title: 'Couler les marches (Coulage marches)',
                description: 'On met un béton un peu plus épais (comme de la pâte à modeler) pour qu\'il ne dégouline pas en bas de l\'escalier.'
            },
            {
                title: 'Lisser chaque marche (Finition)',
                description: 'Avec une petite truelle, on lisse le dessus de chaque marche pour qu\'elle soit bien plate et prête à être montée.'
            }
        ]
    },
    {
        id: '15',
        title: 'Poteaux de l\'étage',
        description: 'Élévation des poteaux porteurs du premier étage.',
        duration: '2-3 jours',
        category: 'structure',
        completed: false,
        order: 15,
        image: '/images/steps/step_15.png',
        details: [
            {
                title: 'Rallonger les fers (Recouvrement)',
                description: 'On prend les fers qui sortent maintenant du sol de l\'étage et on attache de nouvelles cages pour monter encore plus haut.'
            },
            {
                title: 'Remettre les boîtes (Coffrage)',
                description: 'On remonte les boîtes en bois autour des fers. On vérifie bien qu\'ils sont alignés avec les poteaux du bas.'
            },
            {
                title: 'Verser le béton (Coulage)',
                description: 'On remplit de nouveau avec du béton. C\'est la même chose qu\'en bas, mais un étage plus haut !'
            },
            {
                title: 'Enlever le bois (Décoffrage)',
                description: 'Et hop, de nouveaux poteaux apparaissent pour tenir le futur toit.'
            }
        ]
    },
    {
        id: '16',
        title: 'Maçonnerie de l\'étage',
        description: 'Construction des murs de l\'étage.',
        duration: '7-10 jours',
        category: 'masonry',
        completed: false,
        order: 16,
        image: '/images/steps/step_16.png',
        details: [
            {
                title: 'Monter les murs (Élévation)',
                description: 'On remonte des murs en briques tout autour de la maison. Ce seront les murs des chambres du haut.'
            },
            {
                title: 'Vérifier la verticale (Aplomb)',
                description: 'Le maçon vérifie toujours que son mur est droit. C\'est encore plus important en hauteur à cause du vent.'
            },
            {
                title: 'Renforts Verticaux (Raidisseurs)',
                description: 'Comme au rez-de-chaussée, on n\'oublie pas les petits poteaux aux angles pour solidifier les murs.'
            },
            {
                title: 'Finir le haut (Arase)',
                description: 'On termine le haut du mur bien plat. C\'est là que le toit va venir se poser, donc ça doit être parfait.'
            }
        ]
    },
    {
        id: '17',
        title: 'Dalle de toiture',
        description: 'Construction du dernier plancher qui servira de toiture terrasse.',
        duration: '8-10 jours',
        category: 'structure',
        completed: false,
        order: 17,
        image: '/images/steps/step_17.png',
        details: [
            {
                title: 'Préparer le toit (Coffrage plancher haut)',
                description: 'On remet des étais et des planches partout dans les chambres du haut. On prépare le plafond final.'
            },
            {
                title: 'Le sol du toit (Plancher)',
                description: 'On repose les poutrelles et les blocs hourdis. C\'est exactement comme le plancher qu\'on a fait avant.'
            },
            {
                title: 'Couler le toit (Coulage table compression)',
                description: 'On coule la dernière couche de béton tout en haut de la maison. Ça ferme la boîte !'
            },
            {
                title: 'La maison est finie (Gros œuvre achevé)',
                description: 'La structure est terminée ! On a un sol, des murs et un toit en béton. Le "squelette" de la maison est complet.'
            }
        ]
    },

    {
        id: '18',
        title: 'Étanchéité Toiture',
        description: 'Protection de la toiture contre les infiltrations d\'eau.',
        duration: 'À voir',
        category: 'finishing',
        completed: false,
        order: 18,
        image: '/images/steps/step_19.png',
        details: [
            {
                title: 'Faire des pentes (Forme de pente)',
                description: 'On rajoute un peu de ciment pour faire des pentes légères. L\'eau de pluie doit couler vers les trous d\'évacuation, pas faire une piscine !'
            },
            {
                title: 'Manteau noir (Bitume)',
                description: 'On colle des rouleaux noirs goudronnés sur tout le toit en les chauffant au chalumeau. C\'est 100% imperméable.'
            },
            {
                title: 'Test de l\'eau (Test d\'écoulement)',
                description: 'On verse de l\'eau pour vérifier qu\'elle part bien dans les tuyaux et qu\'aucune goutte ne rentre dans la maison.'
            }
        ]
    }
];

