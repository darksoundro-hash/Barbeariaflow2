import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Barbershop } from '../types';
import { PlanType, PLAN_LIMITS, PlanLimits } from './plans';

interface AppState {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  shopId: string | null;
  shop: Barbershop | null;
  plan: PlanType;
  limits: PlanLimits;
  isTrialExpired: boolean;
  upgradeReason: string | null;
  triggerUpgrade: (reason: string) => void;
  dismissUpgrade: () => void;
}

const defaultLimits = PLAN_LIMITS.start;

const AppContext = createContext<AppState>({
  user: null,
  loading: true,
  profile: null,
  shopId: null,
  shop: null,
  plan: 'start',
  limits: defaultLimits,
  isTrialExpired: false,
  upgradeReason: null,
  triggerUpgrade: () => {},
  dismissUpgrade: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const plan: PlanType = shop?.plan || 'start';
  const limits = PLAN_LIMITS[plan];

  const isTrialExpired = (() => {
    if (plan !== 'trial' || !shop?.createdAt) return false;
    const createdAt = shop.createdAt instanceof Date ? shop.createdAt : (shop.createdAt as any).toDate?.() || new Date(shop.createdAt as any);
    const trialDays = 7;
    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + trialDays);
    return new Date() > expirationDate;
  })();

  const triggerUpgrade = (reason: string) => setUpgradeReason(reason);
  const dismissUpgrade = () => setUpgradeReason(null);

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase Auth não disponível');
      setTimeout(() => setLoading(false), 0);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && db) {
        getDoc(doc(db, 'users', u.uid))
          .then((userSnap) => {
            if (userSnap.exists()) {
              const p = userSnap.data() as UserProfile;
              setProfile(p);
              const sId = p.barbershopId;
              if (!sId) {
                setShopId(null);
                setLoading(false);
                return;
              }
              setShopId(sId);
              getDoc(doc(db, 'barbershops', sId))
                .then((shopSnap) => {
                  if (shopSnap.exists()) {
                    setShop(shopSnap.data() as Barbershop);
                  }
                })
                .catch((err) => {
                  console.error('Error loading shop:', err);
                })
                .finally(() => setLoading(false));
            } else {
              setLoading(false);
            }
          })
          .catch((err) => {
            console.error('Error loading profile:', err);
            setLoading(false);
          });
      } else {
        setProfile(null);
        setShopId(null);
        setShop(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AppContext.Provider value={{ user, loading, profile, shopId, shop, plan, limits, isTrialExpired, upgradeReason, triggerUpgrade, dismissUpgrade }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}
