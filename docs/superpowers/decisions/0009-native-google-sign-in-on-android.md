# Decision 0009: Native Google Sign-In on Android

**Date:** 2026-08-04
**Status:** Accepted

## Context

The mobile app's Supabase browser OAuth flow could return to the website and only knew about browser sessions, so it did not reliably offer Google accounts already present on an Android device.

## Decision

Standalone Android builds use `@react-native-google-signin/google-signin` to obtain a Google ID token from the device account picker, then exchange it with `supabase.auth.signInWithIdToken`. Expo Go and iOS retain the existing browser flow until an iOS OAuth client is configured.

## Reasoning

This produces the Android-native account-selection experience the product requires while keeping Supabase as the sole session authority. The web-type OAuth client ID is public and safe to bundle; no Google client secret is included in the app.

## Consequences

Android builds require a Google OAuth Android client for package `ai.mygang.app` and the signing certificate SHA-1. Any change to the Play App Signing or EAS signing certificate must be registered with that OAuth client before Google sign-in is released from the corresponding track.
