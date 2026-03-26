# Mobile App Development Documentation

## Status: 85% Complete (Capacitor Integrated)

The project has been successfully converted into a hybrid mobile app using **Capacitor**. You can now run the app on Android and iOS emulators with native feature support.

---

## 🚀 Quick Run Workflow (Emulator)

To run the app correctly with **Live Reload** (automatic updates on save), follow these three steps in separate terminals:

### 1. Start the Backend
```powershell
cd backend
npm start dev
```

### 2. Start the Frontend (Live Reload Server)
```powershell
cd frontend
npx ng serve --host 0.0.0.0
```
*Note: We use `0.0.0.0` so the emulator can "find" your computer on the network.*

### 3. Launch the Emulator (The "One-Command" Fix)
Run this in a new PowerShell terminal to fix the Java environment and launch the app:
```powershell
$javaPath = "C:\Program Files\Android\Android Studio\jbr"; if (!(Test-Path $javaPath)) { $javaPath = "C:\Program Files\Android\Android Studio\jre" }; $env:JAVA_HOME = $javaPath; $env:Path = "$javaPath\bin;" + $env:Path; cd frontend; npx cap sync android; npx cap run android
```

---

## 🛠️ Native Integration Info

### Implemented Native Services
The `NativeService` ([frontend/src/app/services/native.ts](frontend/src/app/services/native.ts)) provides a unified bridge for:
- **Camera:** Use `takePicture()` for scanner/uploads.
- **Biometrics/Preferences:** Secure local storage for sessions.
- **Push Notifications:** Bridge to FCM/APNs.

### Network Configuration for Mobile
- **Emulator Loopback:** All API calls from the Android emulator are automatically routed to `http://10.0.2.2:3000` via the `apiInterceptor`.
- **CORS:** The backend is configured to accept traffic from `capacitor://localhost` and your emulator IPs.
- **Cleartext:** `AndroidManifest.xml` is updated with `android:usesCleartextTraffic="true"` to allow `http://` debugging.

---

## ⚠️ Troubleshooting

**1. "Failed to load stores"**
- Ensure the Backend is running first.
- Check that the `PROD_API_BASE` in `api.ts` isn't accidentally being used in development.

**2. Java Version Errors**
- Always use the Java setup script provided in step 3 above. Modern Android tools require Java 17+, which is bundled with Android Studio.

**3. White Screen on Launch**
- Ensure the Frontend server is finished compiling (`Compiled successfully`).
- Verify your computer's IP in `capacitor.config.ts` matches your actual network IP if not using the emulator loopback.
