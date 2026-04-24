import { createArticle } from '../server/db.js';
// uuid removed

// uuid is usually used in this project or we can use a random string
const id = Math.random().toString(36).substring(2, 15);

const article = {
    category: "videos",
    subCategory: "Évasion",
    author: "EchoPress",
    surtitle: "Nature",
    title: "Beauté de la nature : soleil, plage, montagnes, vue aérienne",
    summary: "Une exploration visuelle époustouflante des plus beaux paysages terrestres, des sommets enneigés aux plages paradisiaques.",
    publishedTime: "Publié le 24 avril 2026 à 17 h 00",
    image: "https://www.youtube.com/watch?v=meUfty65zJ8",
    imageCredit: "EchoLight Innovations",
    authorUsername: "EchoPressOwner"
};

async function seed() {
    try {
        // Order: id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit, authorUsername
        const result = await createArticle(
            id,
            article.category,
            article.subCategory,
            article.author,
            article.surtitle,
            article.title,
            article.summary,
            article.publishedTime,
            article.image,
            article.imageCredit,
            article.authorUsername
        );
        console.log("Article créé avec succès ! ID:", id);
        process.exit(0);
    } catch (err) {
        console.error("Erreur lors de la création :", err);
        process.exit(1);
    }
}

seed();
