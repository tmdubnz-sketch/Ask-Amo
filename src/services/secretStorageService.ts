import { Capacitor, registerPlugin } from '@capacitor/core';

interface SecretStorePlugin {
  getSecret(options: { key: string }): Promise<{ value: string }>;
  setSecret(options: { key: string; value: string }): Promise<void>;
  removeSecret(options: { key: string }): Promise<void>;
}

const SecretStore = registerPlugin<SecretStorePlugin>('SecretStore');

export const secretStorageService = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  async get(key: string): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      return '';
    }

    const result = await SecretStore.getSecret({ key });
    return result?.value?.trim() || '';
  },

  async set(key: string, value: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await SecretStore.setSecret({ key, value });
  },

  async remove(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await SecretStore.removeSecret({ key });
  },
};
