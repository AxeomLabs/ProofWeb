import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export type NotificationType =
  | 'verification_requested'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_revoked'
  | 'institution_approved'
  | 'institution_rejected';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  meta?: Record<string, any>;
}

export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Notifications are non-critical — log but don't throw
    console.error('[Notification] Failed to send:', err);
  }
};
