# Mobile App Leg

## Optimized Build Brief

Use Expo Go as the Windows-to-iPhone bridge, but do not hardcode a one-off demo flow.

Build a thin React Native client in the mobile folder that:

- Reuses the existing FastAPI authentication endpoints: `/api/v1/auth/login`, `/api/v1/auth/register`, and `/api/v1/auth/verify-otp`.
- Reuses the existing chat endpoints: `/api/v1/chat/sessions`, `/api/v1/chat/messages`, and `/api/v1/chat/sessions/{session_id}/messages`.
- Stores the backend URL on-device so LAN IP changes do not require code edits.
- Uses Expo Go for live demo on iPhone from Windows.
- Uses the existing backend model and business logic instead of introducing a separate `/predict` contract.

This is the practical Windows-first path because the backend stays on the PC and the mobile app remains a presentation layer.

## What Was Added

- An Expo SDK 55 TypeScript app in the mobile folder.
- A customer login, registration, and OTP verification flow.
- A Gifted Chat UI wired to the existing FastAPI chat session and messaging endpoints.
- Runtime backend URL configuration with AsyncStorage persistence.
- LAN-friendly backend CORS regex for local network development.

## Run It On Windows With Expo Go

1. Start the backend on your PC and confirm it is reachable on `0.0.0.0:8000`.
2. Find your Windows LAN IPv4 address with `ipconfig`.
3. In `mobile/.env.example`, copy the example into a local `.env` if you want a default URL, or enter the URL directly inside the app.
4. Run the mobile app:

```powershell
cd mobile
npm start
```

5. Scan the Expo QR code using the iPhone Camera app and open it in Expo Go.
6. In the mobile app, set the backend URL to `http://YOUR_PC_IP:8000/api/v1` and use the built-in connection test.

## Notes

- `localhost` will not work from the phone.
- Native Expo clients are not blocked by browser CORS in the same way as web clients, but the backend now also permits common LAN HTTP origins for local development.
- App Store distribution is still out of scope without Apple Developer enrollment and a macOS signing path.
