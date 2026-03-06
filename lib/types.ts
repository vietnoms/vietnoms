export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // in cents
  formattedPrice: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  variations: MenuVariation[];
  modifierLists: ModifierList[];
  dietaryLabels: string[];
  available: boolean;
  soldOut: boolean;
}

export interface MenuVariation {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  imageUrl?: string | null;
}

export interface ModifierList {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected?: number;
  maxSelected?: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  ordinal: number;
  items: MenuItem[];
}

export interface CartItem {
  menuItem: MenuItem;
  variationId: string;
  variationName: string;
  quantity: number;
  modifiers: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  lineTotal: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  keywords: string[];
  cluster: string;
  type: "pillar" | "spoke";
  image: string;
  content: string;
}

export interface CateringInquiry {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  guestCount: number;
  packageInterest: string;
  notes?: string;
}

export interface CateringWizardData {
  eventDate: string;
  guestCount: number;
  eventType: string;
  deliveryType: "pickup" | "delivery";
  deliveryAddress: string;
  deliveryDistance: number;
  deliveryPlaceId: string;
  packageType: "buffet" | "premade" | "";
  proteins: { name: string; quantity: number; selected: boolean }[];
  bases: { name: string; quantity: number }[];
  sides: { name: string; quantity: number }[];
  bigUpActive: boolean;
  noPeanuts: boolean;
  eggRollCut: "1/2" | "1/4" | "Uncut";
  dietaryNotes: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

export interface GiftCardOrder {
  amount: number;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  message?: string;
}
