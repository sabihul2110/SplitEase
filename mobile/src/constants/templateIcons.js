// SplitEase/mobile/src/constants/templateIcons.js

import {
  TrainFront, TramFront, Bus, Car, CarTaxiFront, Bike, Footprints,
  Home, Zap, Wifi, Droplet, ShoppingBasket, UtensilsCrossed, Soup,
  ChefHat, Sparkles, Wrench, Coffee, Pizza, HandCoins, Receipt,
  Flame, Fuel, ParkingCircle,
} from 'lucide-react-native';

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
];

export const ICON_PICKER = ICON_GROUPS.flatMap((g) => g.items);

export function TemplateIcon({ name, size = 20, color = '#fff' }) {
  const Comp = TEMPLATE_ICON_MAP[name] || Receipt;
  return <Comp size={size} color={color} />;
}