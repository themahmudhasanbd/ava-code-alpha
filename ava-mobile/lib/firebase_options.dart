import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for AvA Code Mobile.
/// Configured for Firebase Project "ava-code" (Project #76282394533).
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return android;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBPGEiR9w1ismOxlN7N8deX6NNL6V_X_TQ',
    appId: '1:76282394533:android:6f7029563f0a48c72e1a4c',
    messagingSenderId: '76282394533',
    projectId: 'ava-code',
    storageBucket: 'ava-code.firebasestorage.app',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBPGEiR9w1ismOxlN7N8deX6NNL6V_X_TQ',
    appId: '1:76282394533:android:6f7029563f0a48c72e1a4c',
    messagingSenderId: '76282394533',
    projectId: 'ava-code',
    storageBucket: 'ava-code.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBPGEiR9w1ismOxlN7N8deX6NNL6V_X_TQ',
    appId: '1:76282394533:android:6f7029563f0a48c72e1a4c',
    messagingSenderId: '76282394533',
    projectId: 'ava-code',
    storageBucket: 'ava-code.firebasestorage.app',
  );
}
