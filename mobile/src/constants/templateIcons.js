// SplitEase/mobile/src/constants/templateIcons.js
//
// Icon set for Quick_Templates / Recurring_Bills icon_name values.
// Uses lucide-react-native directly — same icon library already used
// by categoryIcons.js and groupIcons.js — instead of the hand-drawn
// Icons dictionary, which has no real-world commute/utility glyphs.

import {
  TrainFront, Bus, Car, Bike, Footprints, Home, Zap, Wifi, Droplet,
  ShoppingBasket, UtensilsCrossed, Sparkles, Wrench, Coffee, Pizza,
  HandCoins, Receipt, Flame, Fuel, ParkingCircle,
} from 'lucide-react-native';

export const TEMPLATE_ICON_MAP = {
  metro:        TrainFront,
  train:        TrainFront,
  bus:          Bus,
  cab:          Car,
  auto:         Car,
  rickshaw:     Bike,
  ERickshaw:    Bike,
  walk:         Footprints,
  fuel:         Fuel,
  parking:      ParkingCircle,
  home:         Home,
  rent:         Home,
  electricity:  Zap,
  gas:          Flame,
  wifi:         Wifi,
  water:        Droplet,
  groceries:    ShoppingBasket,
  food:         UtensilsCrossed,
  lunch:        UtensilsCrossed,
  dinner:       UtensilsCrossed,
  snack:        Pizza,
  coffee:       Coffee,
  cleaning:     Sparkles,
  maid:         Sparkles,
  repair:       Wrench,
  labour:       Wrench,
  cash:         HandCoins,
  bill:         Receipt,
};

export const ICON_PICKER = [
  { key: 'metro',       label: 'Metro' },
  { key: 'train',       label: 'Train' },
  { key: 'bus',         label: 'Bus' },
  { key: 'cab',         label: 'Cab' },
  { key: 'auto',        label: 'Auto' },
  { key: 'rickshaw',    label: 'E-Rickshaw' },
  { key: 'walk',        label: 'Walk' },
  { key: 'fuel',        label: 'Fuel' },
  { key: 'parking',     label: 'Parking' },
  { key: 'home',        label: 'Rent / Flat' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'gas',         label: 'Gas' },
  { key: 'wifi',        label: 'WiFi' },
  { key: 'water',       label: 'Water' },
  { key: 'groceries',   label: 'Groceries' },
  { key: 'food',        label: 'Food' },
  { key: 'lunch',       label: 'Lunch' },
  { key: 'dinner',      label: 'Dinner' },
  { key: 'snack',       label: 'Snacks' },
  { key: 'coffee',      label: 'Coffee' },
  { key: 'cleaning',    label: 'Maid / Cleaning' },
  { key: 'repair',      label: 'Repair / Labour' },
  { key: 'cash',        label: 'Cash' },
  { key: 'bill',        label: 'Bill' },
];

export function TemplateIcon({ name, size = 20, color = '#fff' }) {
  const Comp = TEMPLATE_ICON_MAP[name] || Receipt;
  return <Comp size={size} color={color} />;
}