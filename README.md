# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Audit Discovery: Rides

Rides is the lightweight MotoMingle loop inside Croigslist: see nearby rides, join a plan, coordinate with the group, and meet in real life. It should not feel like a separate social network or dating product.

Current design direction:

- Treat the bottom tab as `RIDES`; use `MotoMingle` only as product language inside the experience when needed.
- Match tab-screen headers: uppercase title, white outlined pill actions, black icon/text, and shared `ScreenHeader` proportions.
- Keep the feed direct: location/count utility row, then ride cards. Avoid hero copy, duplicate section headers, and explanatory onboarding text.
- Use city, destination, or route imagery instead of motorcycle glamor shots. The card should sell where the ride is going.
- Keep ride cards compact and image-led: title, date/time, route/distance, join state, capacity, and attendee proof only.
- Avoid dated clutter: no floating chat/share buttons on the card, no heavy metadata grids, no loud green joined state, no redundant overlays.
- Use gradient overlays for readability, not flat dark scrims.
- Preserve Croigslist's marketplace restraint: bold typography, strong images, sparse controls, and minimal social chrome.

V1 product scope:

- Create a ride: photo, title, starting area, date/time, route/destination, bike/style tags, max riders.
- Join a ride with one tap, then show the rider/profile in the attendee stack.
- Create a temporary ride chat for attendees.
- Show nearby/upcoming rides in a compact feed.
- Support shareable ride links for Instagram/text.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   yarn start 
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
