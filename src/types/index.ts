export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  barbershopId?: string;
  role: 'admin' | 'barber';
  createdAt: unknown;
}

export interface BarbershopTheme {
  primaryColor?: string;
  backgroundColor?: string;
  cardColor?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
}

export interface Barbershop {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  coverUrl?: string;
  bottomImageUrl?: string;
  tagline?: string;
  description?: string;
  theme?: BarbershopTheme;
  plan: 'trial' | 'start' | 'pro' | 'elite';
  createdAt: unknown;
}

export interface Barber {
  id: string;
  barbershopId: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  specialties: string[];
  schedule: Record<string, { start: string; end: string; active: boolean }>;
  active: boolean;
}

export interface Service {
  id: string;
  barbershopId: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in minutes
  category?: string;
}

export interface Appointment {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
  cancelToken?: string;
  createdAt: unknown;
}
