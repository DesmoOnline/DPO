import { Auth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { Firestore, doc, setDoc } from "firebase/firestore";
import { CustomerProfile } from "../types";

export const authService = {
  async register(
    auth: Auth,
    db: Firestore,
    email: string,
    password: string,
    companyName: string,
    deliveryAddress: string
  ): Promise<CustomerProfile> {
    const formattedEmail = email.trim().toLowerCase();
    const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
    const user = userCredential.user;

    const newUserProfile: Omit<CustomerProfile, "id"> = {
      email: formattedEmail,
      companyName,
      status: "pending",
      createdAt: new Date().toISOString(),
      customPricing: {},
      allowedProducts: [],
      deliveryAddresses: [deliveryAddress]
    };

    await setDoc(doc(db, "users", user.uid), newUserProfile);
    return { id: user.uid, ...newUserProfile };
  },

  async logout(auth: Auth): Promise<void> {
    await signOut(auth);
  }
};
