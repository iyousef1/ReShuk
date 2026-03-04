import { Listing } from "@/src/types/listing";

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "iPhone 14 Pro",
    price: 1200,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200",
    location: "Jerusalem",
    category: "Phones",
  },
  {
    id: "2",
    title: "Gaming Chair",
    price: 450,
    image: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200",
    location: "Ramallah",
    category: "Furniture",
  },
  {
    id: "3",
    title: "PlayStation 5",
    price: 1800,
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1200",
    location: "Bethlehem",
    category: "Gaming",
  },
];

export async function getListings(): Promise<Listing[]> {
  return Promise.resolve(MOCK_LISTINGS);
}