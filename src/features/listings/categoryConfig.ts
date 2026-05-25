export type SubCategory = { id: string; name: string };
export type AttributeOption = { label: string; value: string };
export type Attribute = {
  key: string;
  label: string;
  type: 'pills' | 'text';
  options?: AttributeOption[];
  placeholder?: string;
};
export type CategoryConfig = {
  id: string;
  name: string;
  icon: string;
  color: string;
  subCategories: SubCategory[];
  brands: string[];
  attributes: Attribute[];
};

const toOptions = (labels: string[]): AttributeOption[] =>
  labels.map((l) => ({ label: l, value: l }));

export const COLORS: AttributeOption[] = toOptions([
  'Black',
  'White',
  'Grey',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Orange',
  'Pink',
  'Purple',
  'Brown',
  'Silver',
  'Gold',
  'Beige',
  'Multicolor',
]);

export const STANDARD_CONDITION: AttributeOption[] = toOptions([
  'New',
  'Like New',
  'Good',
  'Fair',
]);

export const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    id: 'Electronics',
    name: 'Electronics',
    icon: 'hardware-chip-outline',
    color: '#3B82F6',
    subCategories: [
      { id: 'Phones & Tablets', name: 'Phones & Tablets' },
      { id: 'Laptops & Computers', name: 'Laptops & Computers' },
      { id: 'Cameras & Photography', name: 'Cameras & Photography' },
      { id: 'Audio & Headphones', name: 'Audio & Headphones' },
      { id: 'Gaming', name: 'Gaming' },
      { id: 'TV & Displays', name: 'TV & Displays' },
      { id: 'Smart Home', name: 'Smart Home' },
      { id: 'Accessories', name: 'Accessories' },
    ],
    brands: [
      'Apple', 'Samsung', 'Sony', 'Google', 'Microsoft', 'Dell', 'HP',
      'Lenovo', 'ASUS', 'Acer', 'Huawei', 'Xiaomi', 'OnePlus', 'LG',
      'Motorola', 'Nokia', 'Oppo', 'Razer', 'MSI', 'Other',
    ],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: [...STANDARD_CONDITION, { label: 'Parts Only', value: 'Parts Only' }],
      },
      {
        key: 'storage',
        label: 'Storage',
        type: 'pills',
        options: toOptions(['64GB', '128GB', '256GB', '512GB', '1TB', '2TB']),
      },
      {
        key: 'ram',
        label: 'RAM',
        type: 'pills',
        options: toOptions(['2GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB']),
      },
      {
        key: 'color',
        label: 'Color',
        type: 'pills',
        options: COLORS,
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'e.g. iPhone 15 Pro Max',
      },
    ],
  },
  {
    id: 'Fashion',
    name: 'Fashion',
    icon: 'shirt-outline',
    color: '#EC4899',
    subCategories: [
      { id: "Men's Clothing", name: "Men's Clothing" },
      { id: "Women's Clothing", name: "Women's Clothing" },
      { id: 'Shoes & Footwear', name: 'Shoes & Footwear' },
      { id: 'Bags & Accessories', name: 'Bags & Accessories' },
      { id: 'Jewelry & Watches', name: 'Jewelry & Watches' },
      { id: "Kids' Clothing", name: "Kids' Clothing" },
      { id: 'Sportswear', name: 'Sportswear' },
    ],
    brands: [
      'Nike', 'Adidas', 'Zara', 'H&M', 'Gucci', 'Prada', 'Louis Vuitton',
      "Levi's", 'Ralph Lauren', 'Tommy Hilfiger', 'Calvin Klein', 'Versace',
      'Chanel', 'Balenciaga', 'Off-White', 'Supreme', 'Stone Island',
      'North Face', 'Uniqlo', 'Other',
    ],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: toOptions(['New with Tags', 'Like New', 'Good', 'Fair']),
      },
      {
        key: 'size',
        label: 'Size',
        type: 'pills',
        options: toOptions(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']),
      },
      {
        key: 'color',
        label: 'Color',
        type: 'pills',
        options: COLORS,
      },
      {
        key: 'gender',
        label: 'Gender',
        type: 'pills',
        options: toOptions(['Men', 'Women', 'Unisex', 'Kids']),
      },
    ],
  },
  {
    id: 'Home',
    name: 'Home',
    icon: 'home-outline',
    color: '#10B981',
    subCategories: [
      { id: 'Furniture', name: 'Furniture' },
      { id: 'Kitchen & Dining', name: 'Kitchen & Dining' },
      { id: 'Bedding & Bath', name: 'Bedding & Bath' },
      { id: 'Garden & Outdoor', name: 'Garden & Outdoor' },
      { id: 'Lighting', name: 'Lighting' },
      { id: 'Decor & Art', name: 'Decor & Art' },
      { id: 'Appliances', name: 'Appliances' },
      { id: 'Tools & DIY', name: 'Tools & DIY' },
    ],
    brands: [
      'IKEA', 'Ashley', 'Wayfair', 'West Elm', 'Pottery Barn', 'Dyson',
      'Philips', 'Bosch', 'Samsung', 'LG', 'Whirlpool', 'Miele',
      'KitchenAid', 'Nespresso', 'Cuisinart', 'Breville', 'Black+Decker',
      'Makita', 'DeWalt', 'Other',
    ],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: STANDARD_CONDITION,
      },
      {
        key: 'color',
        label: 'Color',
        type: 'pills',
        options: COLORS,
      },
      {
        key: 'material',
        label: 'Material',
        type: 'pills',
        options: toOptions(['Wood', 'Metal', 'Fabric', 'Plastic', 'Glass', 'Leather', 'Ceramic']),
      },
    ],
  },
  {
    id: 'Sports',
    name: 'Sports',
    icon: 'bicycle-outline',
    color: '#F59E0B',
    subCategories: [
      { id: 'Gym & Fitness', name: 'Gym & Fitness' },
      { id: 'Cycling', name: 'Cycling' },
      { id: 'Team Sports', name: 'Team Sports' },
      { id: 'Water Sports', name: 'Water Sports' },
      { id: 'Camping & Hiking', name: 'Camping & Hiking' },
      { id: 'Racket Sports', name: 'Racket Sports' },
      { id: 'Winter Sports', name: 'Winter Sports' },
    ],
    brands: [
      'Nike', 'Adidas', 'Under Armour', 'Puma', 'Reebok', 'New Balance',
      'Asics', 'Callaway', 'Wilson', 'Head', 'Yonex', 'Trek', 'Giant',
      'Specialized', 'Decathlon', 'The North Face', 'Patagonia', 'Columbia',
      'Salomon', 'Other',
    ],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: STANDARD_CONDITION,
      },
      {
        key: 'size',
        label: 'Size',
        type: 'pills',
        options: toOptions(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
      },
      {
        key: 'color',
        label: 'Color',
        type: 'pills',
        options: COLORS,
      },
    ],
  },
  {
    id: 'Toys',
    name: 'Toys',
    icon: 'game-controller-outline',
    color: '#8B5CF6',
    subCategories: [
      { id: 'Board Games', name: 'Board Games' },
      { id: 'Action Figures', name: 'Action Figures' },
      { id: 'Educational', name: 'Educational' },
      { id: 'Outdoor Toys', name: 'Outdoor Toys' },
      { id: 'Video Games', name: 'Video Games' },
      { id: 'Building Sets', name: 'Building Sets' },
      { id: 'Dolls & Plush', name: 'Dolls & Plush' },
    ],
    brands: [
      'LEGO', 'Hasbro', 'Mattel', 'Nintendo', 'Sony', 'Microsoft',
      'Fisher-Price', 'Playmobil', 'Barbie', 'Hot Wheels', 'Funko',
      'Bandai', 'Pokémon', 'Nerf', 'Play-Doh', 'Melissa & Doug', 'Disney',
      'Marvel', 'Star Wars', 'Other',
    ],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: STANDARD_CONDITION,
      },
      {
        key: 'age_group',
        label: 'Age Group',
        type: 'pills',
        options: toOptions(['0-2 yrs', '3-5 yrs', '6-8 yrs', '9-12 yrs', '12+ yrs', 'All Ages']),
      },
    ],
  },
  {
    id: 'Vehicles',
    name: 'Vehicles',
    icon: 'car-sport-outline',
    color: '#EF4444',
    subCategories: [
      { id: 'Cars', name: 'Cars' },
      { id: 'Motorcycles', name: 'Motorcycles' },
      { id: 'Bicycles', name: 'Bicycles' },
      { id: 'Parts & Accessories', name: 'Parts & Accessories' },
      { id: 'Boats & Watercraft', name: 'Boats & Watercraft' },
      { id: 'Scooters & E-bikes', name: 'Scooters & E-bikes' },
    ],
    brands: [
      'Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Ford', 'Chevrolet',
      'Tesla', 'Volkswagen', 'Audi', 'Hyundai', 'Kia', 'Nissan', 'Mazda',
      'Subaru', 'Jeep', 'Land Rover', 'Porsche', 'Volvo', 'Yamaha', 'Other',
    ],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: toOptions(['New', 'Excellent', 'Good', 'Fair', 'Needs Work']),
      },
      {
        key: 'color',
        label: 'Color',
        type: 'pills',
        options: COLORS,
      },
      {
        key: 'fuel_type',
        label: 'Fuel Type',
        type: 'pills',
        options: toOptions(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'N/A']),
      },
      {
        key: 'transmission',
        label: 'Transmission',
        type: 'pills',
        options: toOptions(['Manual', 'Automatic', 'N/A']),
      },
      {
        key: 'year',
        label: 'Year',
        type: 'text',
        placeholder: 'e.g. 2019',
      },
      {
        key: 'mileage',
        label: 'Mileage',
        type: 'text',
        placeholder: 'e.g. 45000 km',
      },
    ],
  },
  {
    id: 'Books',
    name: 'Books',
    icon: 'book-outline',
    color: '#78716C',
    subCategories: [
      { id: 'Textbooks', name: 'Textbooks' },
      { id: 'Fiction', name: 'Fiction' },
      { id: 'Non-Fiction', name: 'Non-Fiction' },
      { id: 'Comics & Manga', name: 'Comics & Manga' },
      { id: "Children's Books", name: "Children's Books" },
      { id: 'Music & CDs', name: 'Music & CDs' },
      { id: 'Movies & DVDs', name: 'Movies & DVDs' },
    ],
    brands: [],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: toOptions(['New', 'Like New', 'Good', 'Acceptable']),
      },
      {
        key: 'language',
        label: 'Language',
        type: 'pills',
        options: toOptions(['English', 'Arabic', 'Hebrew', 'French', 'Spanish', 'German', 'Other']),
      },
      {
        key: 'author',
        label: 'Author',
        type: 'text',
        placeholder: 'e.g. J.K. Rowling',
      },
    ],
  },
  {
    id: 'Other',
    name: 'Other',
    icon: 'cube-outline',
    color: '#64748B',
    subCategories: [
      { id: 'Art & Collectibles', name: 'Art & Collectibles' },
      { id: 'Musical Instruments', name: 'Musical Instruments' },
      { id: 'Baby & Kids', name: 'Baby & Kids' },
      { id: 'Health & Beauty', name: 'Health & Beauty' },
      { id: 'Pet Supplies', name: 'Pet Supplies' },
      { id: 'Miscellaneous', name: 'Miscellaneous' },
    ],
    brands: [],
    attributes: [
      {
        key: 'condition',
        label: 'Condition',
        type: 'pills',
        options: STANDARD_CONDITION,
      },
      {
        key: 'color',
        label: 'Color',
        type: 'pills',
        options: COLORS,
      },
    ],
  },
];
