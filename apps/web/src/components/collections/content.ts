import type { Artwork, CollectionDef, Publication, Quote } from "./types";

export const QUOTES: Quote[] = [
  { id: "q1", kind: "quote", text: "Learn the rules like a pro, so you can break them like an artist.", author: "Pablo Picasso" },
  { id: "q2", kind: "quote", text: "Art is the proper task of life.", author: "Friedrich Nietzsche" },
  { id: "q3", kind: "quote", text: "Any form of art is a form of power; it has impact, it can affect change — it can not only move us, it makes us move.", author: "Ossie Davis" },
  { id: "q4", kind: "quote", text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson" },
  { id: "q5", kind: "quote", text: "Creativity takes courage.", author: "Henri Matisse" },
  { id: "q6", kind: "quote", text: "The painter has the universe in his mind and hands.", author: "Leonardo da Vinci" },
  { id: "q7", kind: "quote", text: "Color is my day-long obsession, joy and torment.", author: "Claude Monet" },
  { id: "q8", kind: "quote", text: "I dream of painting and then I paint my dream.", author: "Vincent van Gogh" },
  { id: "q9", kind: "quote", text: "Art washes away from the soul the dust of everyday life.", author: "Pablo Picasso" },
  { id: "q10", kind: "quote", text: "To be an artist is to believe in life.", author: "Henry Moore" },
  { id: "q11", kind: "quote", text: "The chief enemy of creativity is good sense.", author: "Pablo Picasso" },
  { id: "q12", kind: "quote", text: "A work of art is above all an adventure of the mind.", author: "Eugène Ionesco" },
  { id: "q13", kind: "quote", text: "Painting is poetry that is seen rather than felt.", author: "Leonardo da Vinci" },
  { id: "q14", kind: "quote", text: "Great art picks up where nature ends.", author: "Marc Chagall" },
  { id: "q15", kind: "quote", text: "Art enables us to find ourselves and lose ourselves at the same time.", author: "Thomas Merton" },
  { id: "q16", kind: "quote", text: "The aim of art is to represent not the outward appearance of things, but their inward significance.", author: "Aristotle" },
];

type PublicationSeed = Omit<Publication, "coverUrl">;

export const PUBLICATION_SEEDS: PublicationSeed[] = [
  { id: "p1", kind: "publication", title: "The Vélez Blanco Patio and United States–Cuba Relationships in the 1950s.pdf", pageCount: 48 },
  { id: "p2", kind: "publication", title: "Margareta Haverman, A Vase of Flowers: An Innovative Artist Reexamined.pdf", pageCount: 17 },
  { id: "p3", kind: "publication", title: "Impressionism and the Modern Landscape.pdf", pageCount: 64 },
  { id: "p4", kind: "publication", title: "Conservation Notes: Pigments of the Baroque.pdf", pageCount: 22 },
  { id: "p5", kind: "publication", title: "Photography and the American Century.pdf", pageCount: 96 },
  { id: "p6", kind: "publication", title: "Reading Line: Master Drawings of the Renaissance.pdf", pageCount: 33 },
  { id: "p7", kind: "publication", title: "Form and Void: Modern Sculpture Surveyed.pdf", pageCount: 51 },
  { id: "p8", kind: "publication", title: "The Material World of Still Life.pdf", pageCount: 28 },
  { id: "p9", kind: "publication", title: "Color Theory in Post-Impressionist Practice.pdf", pageCount: 40 },
  { id: "p10", kind: "publication", title: "Curating Light: A History of the Gallery.pdf", pageCount: 19 },
];

export const COLLECTION_DEFS: CollectionDef[] = [
  { id: "c1", name: "Art History and culture" },
  { id: "c2", name: "Colors in History" },
  { id: "c3", name: "Modern Art Collection" },
  { id: "c4", name: "Contemporary Masterpieces" },
  { id: "c5", name: "Visual Heritage" },
  { id: "c6", name: "Cultural Treasures" },
];

export function buildPublications(coverSources: Artwork[]): Publication[] {
  return PUBLICATION_SEEDS.map((seed, i) => ({
    ...seed,
    coverUrl: coverSources[i]?.imageUrl ?? "",
  }));
}
