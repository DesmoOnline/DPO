import { auth, db, isFirebaseAvailable } from '../../firebase';

export { auth, db, isFirebaseAvailable };

export function checkFirebaseReady(): boolean {
  if (!isFirebaseAvailable || !db) {
    console.warn("Firebase service requested while Firebase is unavailable or uninitialized.");
    return false;
  }
  return true;
}
