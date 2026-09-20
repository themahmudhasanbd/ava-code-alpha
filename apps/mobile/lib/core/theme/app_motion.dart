import 'package:flutter/material.dart';

/// Fluid spring physics and micro-interaction timing tokens
class AppMotion {
  AppMotion._();

  // Durations
  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 250);
  static const Duration durationSlow = Duration(milliseconds: 400);

  // Curves
  static const Curve curveSpring = Curves.easeOutBack;
  static const Curve curveSmooth = Curves.easeInOutCubicEmphasized;
  static const Curve curveStandard = Curves.fastOutSlowIn;
  static const Curve curveDecelerate = Curves.easeOutCubic;

  // Scale Factors on Tap
  static const double buttonPressScale = 0.96;
  static const double cardPressScale = 0.98;
}
