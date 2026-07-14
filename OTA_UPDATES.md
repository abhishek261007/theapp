# Over-The-Air (OTA) Updates Documentation

This document explains how Over-The-Air (OTA) updates work in the PM Jewellers Expo application, how the user experience is handled, and how to publish new updates.

## 1. Overview

We use **EAS Update** (via the `expo-updates` package) to send bug fixes, UI improvements, and new JavaScript features directly to users' devices without requiring them to visit the Google Play Store or Apple App Store.

When you publish an update to EAS, the app will automatically detect it the next time the user opens the app.

## 2. How the App Handles Updates (User Experience)

The app is configured to handle updates as **non-intrusively as possible**. 

1. **Background Download**: When a user opens the app, `expo-updates` checks for any new updates on the EAS servers. If one is found, it **silently downloads** the update in the background while the user continues to browse the app normally.
2. **The Prompt**: Once the update is fully downloaded and ready to apply, a hook (`useUpdates()`) inside `app/_layout.tsx` detects this state (`isUpdatePending = true`). 
3. **User Choice**: A native alert pops up letting the user know an update is ready. They are given two choices:
   - **"Restart & Apply"**: The app instantly reloads, applying the new code.
   - **"Later"** (or dismissing the alert): The app continues running on the old code. The new code will simply be applied the next time the app is completely closed and reopened.

## 3. How to Publish an Update

When you have finished making changes locally and want to push them to your users, run the following command in your terminal:

```bash
eas update --branch production --message "Describe your update here"
```

*(Note: Replace `production` with whatever branch name you have linked to your live app builds. If you haven't set up specific channels yet, EAS defaults to the branch you specify when building).*

## 4. What Can Be Updated? (The Rules)

OTA updates only update the **JavaScript bundle** and **assets** (images, fonts). They do **not** update the underlying native app binary.

### ✅ What You CAN Update via OTA:
- Fixing bugs or typos.
- Changing styles, colors, and layouts.
- Adding new screens and functionality built with pure JavaScript/React Native components.
- Adding new API calls (e.g., integrating a backend login system using standard `fetch` or `axios`).

### ❌ What You CANNOT Update via OTA (Requires App Store/Play Store Submission):
- Installing new packages that require **Native Modules** (e.g., adding `expo-local-authentication` for FaceID, or `@react-native-google-signin/google-signin`).
- Upgrading the Expo SDK version (e.g., moving from SDK 54 to SDK 55).
- Changing Android/iOS permissions in `app.json` (e.g., requesting Bluetooth or Camera permissions that weren't there before).
- Changing app icons or splash screens (sometimes these require binary updates to reflect correctly on the OS level).

If you make changes that fall under the "CANNOT Update" category, the OTA update will crash the app for existing users because their native binary won't have the required native code. In these cases, you must run `eas build` to create a new `.aab` / `.ipa` file and submit it to the stores.
