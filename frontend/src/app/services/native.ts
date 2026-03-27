import { inject, Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@angular/cdk/platform';

@Injectable({
  providedIn: 'root',
})
export class NativeService {
  private platform = inject(Platform);

  async takePicture() {
    if (!this.isNative()) return null;

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    return image.webPath;
  }

  async setStorage(key: string, value: string) {
    if (this.isNative()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  async getStorage(key: string) {
    if (this.isNative()) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  }

  async initPush() {
    if (!this.isNative()) return;

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== 'granted') {
      throw new Error('User denied permissions!');
    }

    await PushNotifications.register();
  }

  isNative(): boolean {
    // Basic check for Capacitor/Cordova environment
    return (window as unknown as Record<string, unknown>)['Capacitor'] !== undefined;
  }
}
