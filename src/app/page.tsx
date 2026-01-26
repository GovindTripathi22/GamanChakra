import { Hero } from "@/components/hero";
import { DestinationSection } from "@/components/destination-section";

const indianDestinations = [
  {
    name: "Goa",
    image: "/destinations/goa.jpg",
    description: "Sun, sand, and spices. Experience the perfect blend of Indian and Portuguese cultures.",
    price: "From ₹15,000",
    slug: "goa",
  },
  {
    name: "Jaipur",
    image: "/destinations/jaipur.jpg",
    description: "The Pink City awaits with its majestic forts, palaces, and vibrant bazaars.",
    price: "From ₹12,000",
    slug: "jaipur",
  },
  {
    name: "Kerala",
    image: "/destinations/kerala.jpg",
    description: "God's Own Country. Cruise through backwaters and explore lush green tea plantations.",
    price: "From ₹18,000",
    slug: "kerala",
  },
  {
    name: "Varanasi",
    image: "/destinations/varanasi.jpg",
    description: "The spiritual capital of India. Witness the ancient Ganga Aarti and find inner peace.",
    price: "From ₹10,000",
    slug: "varanasi",
  },
];

const internationalDestinations = [
  {
    name: "Paris",
    image: "/destinations/paris.jpg",
    description: "The City of Light. Experience romance, art, and world-class cuisine.",
    price: "From ₹80,000",
    slug: "paris",
  },
  {
    name: "Dubai",
    image: "/destinations/dubai.jpg",
    description: "A futuristic oasis. Shop at the world's largest malls and admire the skyline.",
    price: "From ₹50,000",
    slug: "dubai",
  },
  {
    name: "Tokyo",
    image: "/destinations/tokyo.jpg",
    description: "Where tradition meets technology. Explore neon-lit streets and ancient temples.",
    price: "From ₹1,20,000",
    slug: "tokyo",
  },
  {
    name: "New York",
    image: "/destinations/new-york.jpg",
    description: "The city that never sleeps. Visit Times Square, Central Park, and Broadway.",
    price: "From ₹1,50,000",
    slug: "new-york",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <Hero />
      <DestinationSection
        title="Popular in India"
        subtitle="Discover the hidden gems of our incredible country"
        destinations={indianDestinations}
      />
      <div className="bg-slate-50 dark:bg-slate-800/50">
        <DestinationSection
          title="International Top Picks"
          subtitle="Explore the world's most fascinating destinations"
          destinations={internationalDestinations}
        />
      </div>
    </main>
  );
}
