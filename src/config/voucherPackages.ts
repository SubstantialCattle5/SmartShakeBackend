export interface VoucherPackage {
  id: string;
  name: string;
  totalDrinks: number;
  pricePerDrink: number;
  totalPrice: number;
  originalPrice: number;
  savings: number;
  recommended: boolean;
}

export const VOUCHER_PACKAGES: Record<string, VoucherPackage> = {
  small: {
    id: 'small',
    name: 'Small Pack',
    totalDrinks: 10,
    pricePerDrink: 25,
    totalPrice: 250,
    originalPrice: 300,
    savings: 50,
    recommended: false,
  },
  medium: {
    id: 'medium',
    name: 'Medium Pack',
    totalDrinks: 20,
    pricePerDrink: 23,
    totalPrice: 460,
    originalPrice: 600,
    savings: 140,
    recommended: true,
  },
  large: {
    id: 'large',
    name: 'Large Pack',
    totalDrinks: 50,
    pricePerDrink: 20,
    totalPrice: 1000,
    originalPrice: 1500,
    savings: 500,
    recommended: false,
  },
  jumbo: {
    id: 'jumbo',
    name: 'Jumbo Pack',
    totalDrinks: 100,
    pricePerDrink: 18,
    totalPrice: 1800,
    originalPrice: 3000,
    savings: 1200,
    recommended: false,
  },
};

export const getVoucherPackage = (packageId: string): VoucherPackage | null => {
  return VOUCHER_PACKAGES[packageId] || null;
};

export const getAllVoucherPackages = (): VoucherPackage[] => {
  return Object.values(VOUCHER_PACKAGES);
};

export const isValidPackageId = (packageId: string): boolean => {
  return packageId in VOUCHER_PACKAGES;
};
