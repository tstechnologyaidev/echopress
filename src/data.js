export const categories = [
    { 
        id: 'actualites', 
        label: 'Actualités',
        subCategories: ['Chroniques', 'Éditoriaux', 'Caricatures', 'Analyses', 'National', 'Politique', 'Grand Montréal', 'Régional', 'Justice et faits divers', 'Santé', 'Éducation', 'Environnement', 'Sciences']
    },
    { 
        id: 'international', 
        label: 'International',
        subCategories: ['Chroniques', 'Afrique', 'Amérique latine', 'Asie et Océanie', 'Caraïbes', 'États-Unis', 'Europe', 'Moyen-Orient']
    },
    { 
        id: 'dialogue', 
        label: 'Dialogue',
        subCategories: ['Chroniques', 'Opinions', 'Courrier des lecteurs', 'Témoignages']
    },
    { 
        id: 'contexte', 
        label: 'Contexte',
        subCategories: ['Chroniques']
    },
    { 
        id: 'affaires', 
        label: 'Affaires',
        subCategories: ['Chroniques', 'Économie', 'Marchés', 'Entreprises', 'Marché immobilier', 'Techno', 'Médias', 'Finances personnelles', 'PME', 'Portfolio']
    },
    { 
        id: 'sports', 
        label: 'Sports',
        subCategories: ['Chroniques', 'Hockey', 'Jeux olympiques', 'Soccer', 'Football', 'Tennis', 'Baseball', 'Course automobile', 'Golf', 'Sports de combat', 'Sports d\'hiver', 'Basketball', 'Cyclisme']
    },
    { 
        id: 'auto', 
        label: 'Auto',
        subCategories: ['Guide auto', 'Voitures électriques', 'Conseils', 'Rappels']
    },
    { 
        id: 'arts', 
        label: 'Arts',
        subCategories: ['Chroniques', 'Musique', 'Télévision', 'Quoi regarder', 'Théâtre', 'Littérature', 'Arts visuels', 'Spectacles', 'Humour', 'Célébrités', 'Sortir']
    },
    { 
        id: 'cinema', 
        label: 'Cinéma',
        subCategories: ['Chroniques', 'Entrevues', 'Critiques']
    },
    { 
        id: 'societe', 
        label: 'Société',
        subCategories: ['Chroniques', 'Santé', 'Famille', 'Mode et beauté', 'Sexualité', 'Animaux']
    },
    { 
        id: 'gourmand', 
        label: 'Gourmand',
        subCategories: ['Chroniques', 'Alimentation', 'Recettes', 'Restaurants', 'Alcools']
    },
    { 
        id: 'voyage', 
        label: 'Voyage',
        subCategories: ['Chroniques', 'Québec et Canada', 'États-Unis', 'Europe', 'Asie', 'Amérique latine', 'Caraïbes', 'Afrique', 'Océanie', 'Trucs et conseils', 'Plein air']
    },
    { 
        id: 'maison', 
        label: 'Maison',
        subCategories: ['Chroniques', 'Immobilier', 'Architecture', 'Décoration', 'Rénovation', 'Cour et jardin']
    }
];

export const articles = [
    {
        id: '1',
        category: 'actualites',
        surtitle: 'Féminicide présumé',
        title: 'Un homme accusé de l’homicide involontaire de sa conjointe',
        summary: 'Un homme a été formellement accusé d’avoir tué « involontairement » sa conjointe retrouvée morte au centre-ville de Montréal.',
        publishedTime: 'Publié à 17 h 37',
        image: 'news_police_car.png'
    },
    {
        id: '2',
        category: 'affaires',
        surtitle: 'Économie',
        title: 'Mieux vaut être en santé que pauvre',
        summary: 'L’inflation et les taux d’intérêt incitent les ménages à revoir leurs priorités en matière de santé et de bien-être financier.',
        publishedTime: 'Publié à 18 h 10',
        author: 'Stéphanie Grammond',
        image: 'news_business.png'
    },
    {
        id: '3',
        category: 'sports',
        surtitle: 'Soccer',
        title: 'Le CF Montréal remporte une victoire cruciale',
        summary: 'L’équipe a su s’imposer dans les dernières minutes du match grâce à un but spectaculaire.',
        publishedTime: 'Publié à 21 h 45',
        image: 'news_sports.png'
    },
    {
        id: '4',
        category: 'maison',
        surtitle: 'Décoration',
        title: 'Les tendances printanières pour un intérieur apaisant',
        summary: 'Découvrez comment ramener la nature à l’intérieur avec des plantes et des couleurs douces.',
        publishedTime: 'Publié hier à 14 h 20',
        image: 'news_lifestyle.png'
    },
    {
        id: '5',
        category: 'international',
        surtitle: 'Europe',
        title: 'De nouvelles mesures climatiques annoncées',
        summary: 'Les dirigeants européens se sont mis d\'accord sur un plan audacieux pour réduire les émissions.',
        publishedTime: 'Publié à 16 h 00',
        image: ''
    },
    {
        id: '6',
        category: 'arts',
        surtitle: 'Musique',
        title: 'Un retour triomphal pour l\'orchestre symphonique',
        summary: 'Le concert de clôture a attiré une foule record et des critiques élogieuses.',
        publishedTime: 'Publié ce matin',
        image: ''
    }
];
