// SplitEase/mobile/src/constants/templateIcons.js

import {
  TrainFront, TramFront, Bus, Car, CarTaxiFront, Bike, Footprints,
  Home, Zap, Wifi, Droplet, ShoppingBasket, UtensilsCrossed, Soup,
  ChefHat, Sparkles, Wrench, Coffee, Pizza, HandCoins, Receipt,
  Flame, Fuel, ParkingCircle,
} from 'lucide-react-native';
import BrandIcon, { BRAND_SLUGS } from '../components/icons/BrandIcon';

export const TEMPLATE_ICON_MAP = {
  metro:        TramFront,
  train:        TrainFront,
  bus:          Bus,
  cab:          CarTaxiFront,
  auto:         Car,
  rickshaw:     Bike,
  walk:         Footprints,
  fuel:         Fuel,
  parking:      ParkingCircle,
  home:         Home,
  electricity:  Zap,
  gas:          Flame,
  wifi:         Wifi,
  water:        Droplet,
  groceries:    ShoppingBasket,
  food:         UtensilsCrossed,
  lunch:        Soup,
  dinner:       ChefHat,
  snack:        Pizza,
  coffee:       Coffee,
  cleaning:     Sparkles,
  repair:       Wrench,
  cash:         HandCoins,
  bill:         Receipt,
};

export const ICON_GROUPS = [
  {
    title: 'Transport',
    items: [
      { key: 'metro',    label: 'Metro' },
      { key: 'train',    label: 'Train' },
      { key: 'bus',      label: 'Bus' },
      { key: 'cab',      label: 'Cab / Taxi' },
      { key: 'auto',     label: 'Auto' },
      { key: 'rickshaw', label: 'E-Rickshaw' },
      { key: 'walk',     label: 'Walk' },
      { key: 'fuel',     label: 'Fuel' },
      { key: 'parking',  label: 'Parking' },
    ],
  },
  {
    title: 'Food & Drink',
    items: [
      { key: 'food',       label: 'Food' },
      { key: 'lunch',      label: 'Lunch' },
      { key: 'dinner',     label: 'Dinner' },
      { key: 'snack',      label: 'Snacks' },
      { key: 'coffee',     label: 'Coffee' },
      { key: 'groceries',  label: 'Groceries' },
    ],
  },
  {
    title: 'Home & Utilities',
    items: [
      { key: 'home',        label: 'Rent / Flat' },
      { key: 'electricity', label: 'Electricity' },
      { key: 'gas',         label: 'Gas' },
      { key: 'wifi',        label: 'WiFi' },
      { key: 'water',       label: 'Water' },
      { key: 'cleaning',    label: 'Maid / Cleaning' },
      { key: 'repair',      label: 'Repair / Labour' },
    ],
  },
  {
    title: 'Money',
    items: [
      { key: 'cash', label: 'Cash' },
      { key: 'bill', label: 'Bill' },
    ],
  },
  {
    title: 'Brands',
    items: [
      { key: 'netflix',    label: 'Netflix' },
      { key: 'spotify',    label: 'Spotify' },
      { key: 'applemusic', label: 'Apple Music' },
      { key: 'youtube',    label: 'YouTube' },
      { key: 'amazon',     label: 'Amazon' },
      { key: 'zomato',     label: 'Zomato' },
      { key: 'swiggy',     label: 'Swiggy' },
      { key: 'uber',       label: 'Uber' },
    ],
  },
];

export const ICON_PICKER = ICON_GROUPS.flatMap((g) => g.items);

// Category-driven filtering (Option A): when a Quick Template / Recurring
// Bill's category is picked, the icon picker narrows to just these group
// titles first — e.g. picking "Utilities" surfaces WiFi/Electricity/Water
// plus Netflix-style Brands, instead of every icon in the app. Categories
// not listed here (or with an empty array) show the full picker as-is.
export const CATEGORY_ICON_GROUPS = {
  'Travel':          ['Transport'],
  'Accommodation':   ['Home & Utilities'],
  'Food & Dining':   ['Food & Drink', 'Brands'],
  'Activities':      ['Brands'],
  'Utilities':       ['Home & Utilities', 'Brands'],
  'Groceries':       ['Food & Drink'],
  'Shopping':        ['Brands', 'Money'],
  'Entertainment':   ['Brands'],
};

// Neutral, brand-agnostic tint for icon chips — used wherever a
// TemplateIcon sits inside a colored circle/box (dashboard rows, Manage
// lists). Deliberately muted greyed-blue so it never competes with a
// brand logo's own color sitting in the same list.
export const ICON_CHIP_BG = 'rgba(147,163,196,0.14)';
export const ICON_CHIP_COLOR = '#9fb0cc';

export function TemplateIcon({ name, size = 20, color = '#fff' }) {
  if (BRAND_SLUGS[name]) {
    return <BrandIcon brand={name} size={size} />;
  }
  const Comp = TEMPLATE_ICON_MAP[name] || Receipt;
  return <Comp size={size} color={color} />;
}