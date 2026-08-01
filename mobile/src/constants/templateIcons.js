// mobile/src/constants/templateIcons.js

import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Footprints, Bike, TramFront, TrainFront, Fuel, ParkingCircle, Plane, Ship,
  UtensilsCrossed, Soup, ChefHat, Pizza, Coffee, Croissant, Wine, IceCream,
  ShoppingBasket, ShoppingBag, Home, Zap, Flame, Wifi, Droplet, Smartphone, WashingMachine,
  Sparkles, Wrench, HandCoins, Receipt, Banknote, Shirt, Laptop, Gift, BookOpen,
  Dumbbell, Stethoscope, Pill, Hospital, GraduationCap, Clapperboard, Music,
  Gamepad2, Trophy, PawPrint, Baby, Scissors,
} from 'lucide-react-native';
import BrandIcon, { BRAND_SLUGS } from '../components/icons/BrandIcon';
import { resolveExpenseIcon } from '@splitease/shared';

// Wraps a MaterialCommunityIcons glyph so it can be called exactly like a
// lucide component: <Comp size={size} color={color} />. Used for transport
// modes lucide doesn't have dedicated glyphs for (rickshaw, moped, taxi...).
const mdi = (name) => ({ size = 20, color = '#fff' }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} />
);

// Custom hand-drawn: no icon library has a proper auto-rickshaw (tuk-tuk)
// shape — this is the most common India transport mode, deserves real art
// rather than reusing "Car".

// function AutoRickshawIcon({ size = 20, color = '#fff' }) {
//   return (
//     <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <Path d="M4 16h13l2-5a2 2 0 0 0-2-2.4H9.5L7 5H3" />
//       <Path d="M4 16v-5h11" />
//       <Circle cx="7" cy="18" r="1.8" />
//       <Circle cx="17" cy="18" r="1.8" />
//       <Path d="M17 16h2" />
//     </Svg>
//   );
// }


// function AutoRickshawIcon({ size = 20, color = '#fff' }) {
//   return (
//     <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
//       {/* Outer body frame with passenger and driver door cutouts subtracted via evenodd */}
//       <Path
//         fillRule="evenodd"
//         d="M 5 2 H 15.5 L 18 9 H 19 A 1.5 1.5 0 0 1 19 12 A 3.5 3.5 0 0 1 22 15.5 A 3.5 3.5 0 0 0 16 15.5 H 9.5 A 3.5 3.5 0 0 0 2.5 15.5 V 10 C 2.5 4 3 2 5 2 Z 
//            M 4.5 4 V 9 H 7.5 A 1 1 0 0 1 8.5 10 V 11 H 6.5 V 14 H 10 V 4 Z 
//            M 14.5 4 H 11 V 7.5 H 12 A 0.5 0.5 0 0 1 12.5 8 V 9.5 H 13.5 A 0.5 0.5 0 0 1 14 10 V 11 H 12.5 V 14 H 16 V 10.5 H 15 Z"
//       />
//       {/* Detached Rear Wheel */}
//       <Path d="M 6 19.5 A 2.5 2.5 0 1 0 6 14.5 A 2.5 2.5 0 1 0 6 19.5 Z M 6 18 A 1 1 0 1 1 6 16 A 1 1 0 1 1 6 18 Z" />
//       {/* Detached Front Wheel */}
//       <Path d="M 19 19.5 A 2.5 2.5 0 1 0 19 14.5 A 2.5 2.5 0 1 0 19 19.5 Z M 19 18 A 1 1 0 1 1 19 16 A 1 1 0 1 1 19 18 Z" />
//     </Svg>
//   );
// }

// Custom solid silhouette matching the geometry of the Apple Auto Rickshaw emoji.
// Uses a single fill color with even-odd cutouts for windows to match MDI style.
function AutoRickshawIcon({ size = 20, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {/* Main solid body with passenger cutouts subtracted */}
      <Path
        fillRule="evenodd"
        d="M 2.5 7 C 2.5 4.5 4 3.5 6.5 3.5 H 18 C 19 3.5 20 4 20 5 L 20.5 11.5 C 21.5 11.5 22.5 12.5 23 14 C 23.2 15 22.5 16.5 21.5 16.5 A 3.5 3.5 0 0 0 15.5 16.5 H 9 A 3.5 3.5 0 0 0 3 16.5 H 2.5 Z 
           M 4 6 V 11.5 H 8 V 6 H 4 Z 
           M 9.5 6 V 15 H 14 V 6 H 9.5 Z 
           M 15.5 6 V 11.5 H 19.5 C 19.2 8.5 18.5 6 17.5 6 H 15.5 Z"
      />
      {/* Detached wheels ensuring negative space below the fenders */}
      <Circle cx="6" cy="17.5" r="2.2" />
      <Circle cx="18.5" cy="17.5" r="2.2" />
    </Svg>
  );
}

export const TEMPLATE_ICON_MAP = {
  // Transport
  walk:            Footprints,
  bicycle:         mdi('bike'),
  manualRickshaw:  mdi('rickshaw'),
  scooter:         mdi('moped'),
  motorcycle:      mdi('motorbike'),
  auto:            AutoRickshawIcon,
  eRickshaw:       mdi('rickshaw-electric'),
  car:             mdi('car'),
  cab:             mdi('taxi'),
  bus:             mdi('bus'),
  metro:           TrainFront,
  train:           mdi('train'),
  tram:            mdi('tram'),
  flight:          Plane,
  ferry:           Ship,
  fuel:            Fuel,
  parking:         ParkingCircle,

  // Food & Drink
  food:         UtensilsCrossed,
  lunch:        Soup,
  dinner:       ChefHat,
  snack:        Pizza,
  coffee:       Coffee,
  bakery:       Croissant,
  bar:          Wine,
  dessert:      IceCream,
  groceries:    ShoppingBasket,

  // Home & Utilities
  home:            Home,
  electricity:     Zap,
  gas:             Flame,
  wifi:            Wifi,
  water:           Droplet,
  mobileRecharge:  Smartphone,
  laundry:         WashingMachine,
  cleaning:        Sparkles,
  repair:          Wrench,

  // Money
  cash:     HandCoins,
  bill:     Receipt,
  transfer: Banknote,

  // Shopping
  shoppingGeneral: ShoppingBag,
  clothing:        Shirt,
  electronics:     Laptop,
  gifts:           Gift,
  books:           BookOpen,

  // Health — three distinct concepts (see note in chat)
  gym:      Dumbbell,
  doctor:   Stethoscope,
  medicine: Pill,
  hospital: Hospital,

  // Education
  tuition:  GraduationCap,

  // Entertainment
  movie:    Clapperboard,
  concert:  Music,
  games:    Gamepad2,
  sports:   Trophy,

  // Other
  pet:       PawPrint,
  childcare: Baby,
  grooming:  Scissors,
};

export const ICON_GROUPS = [
  {
    title: 'Transport',
    items: [
      { key: 'walk',           label: 'Walk' },
      { key: 'bicycle',        label: 'Bicycle' },
      { key: 'manualRickshaw', label: 'Manual Rickshaw' },
      { key: 'scooter',        label: 'Scooty / Scooter' },
      { key: 'motorcycle',     label: 'Motorcycle' },
      { key: 'auto',           label: 'Auto Rickshaw' },
      { key: 'eRickshaw',      label: 'E-Rickshaw' },
      { key: 'car',            label: 'Car' },
      { key: 'cab',            label: 'Cab / Taxi' },
      { key: 'bus',            label: 'Bus' },
      { key: 'metro',          label: 'Metro' },
      { key: 'train',          label: 'Train' },
      { key: 'tram',           label: 'Tram / Monorail' },
      { key: 'flight',         label: 'Flight' },
      { key: 'ferry',          label: 'Ship / Ferry' },
      { key: 'fuel',           label: 'Fuel' },
      { key: 'parking',        label: 'Parking' },
    ],
  },
  {
    title: 'Food & Drink',
    items: [
      { key: 'food',      label: 'Food' },
      { key: 'lunch',     label: 'Lunch' },
      { key: 'dinner',    label: 'Dinner' },
      { key: 'snack',     label: 'Snacks' },
      { key: 'coffee',    label: 'Coffee' },
      { key: 'bakery',    label: 'Bakery' },
      { key: 'bar',       label: 'Bar / Drinks' },
      { key: 'dessert',   label: 'Dessert' },
      { key: 'groceries', label: 'Groceries' },
    ],
  },
  {
    title: 'Home & Utilities',
    items: [
      { key: 'home',           label: 'Rent / Flat' },
      { key: 'electricity',    label: 'Electricity' },
      { key: 'gas',            label: 'Gas' },
      { key: 'wifi',           label: 'WiFi' },
      { key: 'water',          label: 'Water' },
      { key: 'mobileRecharge', label: 'Mobile Recharge' },
      { key: 'laundry',        label: 'Laundry' },
      { key: 'cleaning',       label: 'Maid / Cleaning' },
      { key: 'repair',         label: 'Repair / Labour' },
    ],
  },
  {
    title: 'Shopping',
    items: [
      { key: 'shoppingGeneral', label: 'Shopping (General)' },
      { key: 'clothing',        label: 'Clothing' },
      { key: 'electronics',     label: 'Electronics' },
      { key: 'gifts',           label: 'Gifts' },
      { key: 'books',           label: 'Books & Stationery' },
    ],
  },
  {
    title: 'Health & Fitness',
    items: [
      { key: 'gym',      label: 'Gym' },
      { key: 'doctor',   label: 'Doctor / Clinic' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'hospital', label: 'Hospital' },
    ],
  },
  {
    title: 'Education & Fees',
    items: [
      { key: 'tuition', label: 'Tuition / Fees' },
      { key: 'books',   label: 'Books & Stationery' },
    ],
  },
  {
    title: 'Entertainment',
    items: [
      { key: 'movie',   label: 'Movie' },
      { key: 'concert', label: 'Concert / Event' },
      { key: 'games',   label: 'Games' },
      { key: 'sports',  label: 'Sports' },
    ],
  },
  {
    title: 'Money',
    items: [
      { key: 'cash',     label: 'Cash' },
      { key: 'bill',     label: 'Bill' },
      { key: 'transfer', label: 'Transfer' },
    ],
  },
  {
    title: 'Other',
    items: [
      { key: 'pet',       label: 'Pet Care' },
      { key: 'childcare', label: 'Childcare' },
      { key: 'grooming',  label: 'Salon / Grooming' },
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
      { key: 'blinkit',    label: 'Blinkit' },
      { key: 'uber',       label: 'Uber' },
    ],
  },
];

export const ICON_PICKER = ICON_GROUPS.flatMap((g) => g.items);

export const CATEGORY_ICON_GROUPS = {
  'Travel':          ['Transport'],
  'Accommodation':   ['Home & Utilities'],
  'Food & Dining':   ['Food & Drink', 'Brands'],
  'Activities':      ['Entertainment', 'Brands'],
  'Utilities':       ['Home & Utilities', 'Brands'],
  'Groceries':       ['Food & Drink'],
  'Shopping':        ['Shopping', 'Brands', 'Money'],
  'Entertainment':   ['Entertainment', 'Brands'],
  'Health & Medical':['Health & Fitness'],
  'Education':       ['Education & Fees'],
};

const LUCIDE_ICON_TO_TEMPLATE_KEY = {
  Home: 'home', Building2: 'home',
  Wifi: 'wifi',
  Zap: 'electricity',
  Droplet: 'water',
  Sparkles: 'cleaning',
  UtensilsCrossed: 'food',
  TrainFront: 'metro',
  Bus: 'bus',
  Plane: 'flight',
  Ship: 'ferry',
  Car: 'car',
  ShoppingBag: 'shoppingGeneral',
  ShoppingBasket: 'groceries',
  HeartPulse: 'doctor',
  Dumbbell: 'gym',
  GraduationCap: 'tuition',
  Film: 'movie',
  Ticket: 'movie',
  Receipt: 'bill',
  Stethoscope: 'doctor',
  Pill: 'medicine',
  Hospital: 'hospital',
};

export function suggestTemplateIconKey({ category, subcategory, description } = {}) {
  const result = resolveExpenseIcon({ category, subcategory, description });
  if (result.kind === 'brand') return result.brand;
  return LUCIDE_ICON_TO_TEMPLATE_KEY[result.icon] || 'bill';
}

export const ICON_CHIP_BG = 'rgba(147,163,196,0.14)';
export const ICON_CHIP_COLOR = '#9fb0cc';

export function TemplateIcon({ name, size = 20, color = '#fff' }) {
  if (BRAND_SLUGS[name]) {
    return <BrandIcon brand={name} size={size} />;
  }
  const Comp = TEMPLATE_ICON_MAP[name] || Receipt;
  return <Comp size={size} color={color} />;
}