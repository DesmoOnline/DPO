import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { RateBreakProfile, QuantityBreak } from "../types";

const PROFILES_COLLECTION = "rateBreakProfiles";

/**
 * Create a new rate break profile
 */
export async function createRateBreakProfile(
  profileData: Omit<RateBreakProfile, "id" | "createdAt" | "updatedAt" | "createdBy">,
  userId: string
): Promise<string> {
  const now = new Date().toISOString();
  const profileRef = doc(collection(db, PROFILES_COLLECTION));
  const newProfile: RateBreakProfile = {
    id: profileRef.id,
    ...profileData,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  await setDoc(profileRef, newProfile);
  return profileRef.id;
}

/**
 * Get a single rate break profile by ID
 */
export async function getRateBreakProfile(
  profileId: string
): Promise<RateBreakProfile | null> {
  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as RateBreakProfile;
}

/**
 * Get all rate break profiles
 */
export async function getAllRateBreakProfiles(): Promise<RateBreakProfile[]> {
  const q = query(collection(db, PROFILES_COLLECTION));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data() as RateBreakProfile);
}

/**
 * Update a rate break profile
 */
export async function updateRateBreakProfile(
  profileId: string,
  updates: Partial<Omit<RateBreakProfile, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  const now = new Date().toISOString();

  await updateDoc(docRef, {
    ...updates,
    updatedAt: now,
  });
}

/**
 * Delete a rate break profile
 */
export async function deleteRateBreakProfile(profileId: string): Promise<void> {
  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  await deleteDoc(docRef);
}

/**
 * Calculate the final price for a product given a quantity using a rate break profile
 */
export function calculatePriceWithRateBreaks(
  basePrice: number,
  quantity: number,
  quantityBreaks: QuantityBreak[] | undefined
): number {
  if (!quantityBreaks || quantityBreaks.length === 0) {
    return basePrice;
  }

  // Find the applicable break for this quantity
  const applicableBreak = quantityBreaks
    .sort((a, b) => b.minQty - a.minQty)
    .find((b) => quantity >= b.minQty);

  if (!applicableBreak) {
    return basePrice;
  }

  if (applicableBreak.discountType === "percentage") {
    const discountValue = applicableBreak.discountValue;
    return basePrice * (1 - discountValue / 100);
  } else {
    // Fixed discount
    return Math.max(0, basePrice - applicableBreak.discountValue);
  }
}

/**
 * Get the rate breaks for a specific product from a profile
 */
export function getProductRateBreaks(
  profile: RateBreakProfile | null,
  productId: string
): QuantityBreak[] | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.productBreaks[productId];
}
