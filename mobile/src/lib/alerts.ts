import { Alert } from 'react-native';

/** Promise-based confirm dialog. Resolves true when the user confirms. */
export function confirm(title: string, message?: string, confirmLabel = 'Delete'): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Simple info/error toast via the native alert. */
export function notify(title: string, message?: string): void {
  Alert.alert(title, message);
}

/** Pull a human message out of an unknown error. */
export function errMessage(err: unknown, fallback = 'Something went wrong.'): string {
  return err instanceof Error ? err.message : fallback;
}
