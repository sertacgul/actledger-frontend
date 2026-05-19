# ActLedger React Native Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace the Capacitor hybrid mobile app with a high-performance React Native (Expo) app that connects to the existing backend with zero backend changes.

**Architecture:** Expo SDK 53 managed workflow with Expo Router v4 file-based navigation. Platform-adaptive UI (iOS-native feel on iOS, Material on Android). Offline-first with expo-sqlite plus sync queue. Same API (api.actledger.com/api/v1), same auth flow (/mobile-auth/login), same Socket.io events.

**Tech Stack:** Expo 53, Expo Router v4, TypeScript, Zustand, Axios, socket.io-client, Nativewind v4, React Native Reanimated 3, FlashList, expo-sqlite, expo-secure-store, expo-camera, react-native-maps, Victory Native, React Native Paper.

**Spec:** docs/superpowers/specs/2026-05-15-actledger-react-native-design.md

---

## File Structure

All files live under C:\Users\serta\actledger-native\ — a completely new, independent project. Zero changes to actledger-frontend/ or actledger-backend/.

### Root Config
- app.json — Expo config (bundle ID com.ataolaitech.actledger, scheme actledger://)
- eas.json — EAS Build profiles (dev, preview, production)
- babel.config.js — Expo preset + Nativewind + Reanimated plugin
- metro.config.js — Metro with Nativewind
- tailwind.config.ts — ActLedger color tokens
- tsconfig.json — Strict TS with path aliases
- global.css — Tailwind directives
- .env / .env.production — API base URL

### App Routes (25 screens)
- app/_layout.tsx — Root: fonts, auth gate, splash, push notifications, auto-sync
- app/+not-found.tsx — 404 fallback
- app/(auth)/_layout.tsx, login.tsx, force-password-change.tsx — Auth flow (2 screens)
- app/(app)/_layout.tsx — Bottom tab navigator (5 tabs)
- app/(app)/(home)/_layout.tsx, index.tsx — Dashboard (1 screen)
- app/(app)/(tasks)/_layout.tsx, index.tsx, [id].tsx — Tasks (2 screens)
- app/(app)/(tasks)/work-orders/index.tsx, [id].tsx — Work orders (2 screens)
- app/(app)/(tasks)/forms/index.tsx, [id].tsx — Forms (2 screens)
- app/(app)/(sales)/_layout.tsx, index.tsx — Sales dashboard (1 screen)
- app/(app)/(sales)/pos.tsx — POS with barcode (1 screen)
- app/(app)/(sales)/customers/index.tsx, [id].tsx — Customers (2 screens)
- app/(app)/(sales)/orders/index.tsx, [id].tsx — Orders (2 screens)
- app/(app)/(sales)/quotes/index.tsx, [id].tsx, new.tsx — Quotes (3 screens)
- app/(app)/(sales)/till.tsx — Till management (1 screen)
- app/(app)/(messages)/_layout.tsx, index.tsx, [id].tsx — Messages (2 screens)
- app/(app)/notifications.tsx, qr-scanner.tsx, profile.tsx, operiq.tsx — Utilities (4 screens)

### Library Layer
- lib/api.ts — Axios instance with token refresh interceptor
- lib/auth.ts — expo-secure-store token storage
- lib/socket.ts — Socket.io connection manager
- lib/notifications.ts — Push notification registration and deep link routing
- lib/offline/db.ts — expo-sqlite schema and cache helpers
- lib/offline/queue.ts — Pending actions FIFO queue
- lib/offline/sync.ts — Auto-sync on reconnect

### State
- stores/authStore.ts — Zustand: user, token, login/logout/restore
- stores/cartStore.ts — Zustand: POS cart items, total
- stores/uiStore.ts — Zustand: message badge, notification badge

### Shared Components
- components/BarcodeScanner.tsx — expo-camera barcode modal
- components/EmptyState.tsx — Reusable empty state
- components/ErrorBoundary.tsx — Error boundary wrapper
- components/LoadingScreen.tsx — Full-screen loading
- components/PlatformCard.tsx — Platform-adaptive card (iOS shadow, Android elevation)
- components/PlatformList.tsx — FlashList with pull-to-refresh
- components/StatusBadge.tsx — Colored status tags
- components/SwipeableRow.tsx — Swipe-to-action with Reanimated

### Hooks
- hooks/useApi.ts — GET with cache, loading, error, refetch
- hooks/useAuth.ts — Auth store selector
- hooks/useMutation.ts — POST/PATCH/DELETE with loading and error
- hooks/useSocket.ts — Socket.io event subscription
- hooks/useOffline.ts — Network status

### Design Tokens
- constants/colors.ts — Brand palette, dark/light surfaces, status colors
- constants/spacing.ts — Spacing scale, hit targets, border radii
- constants/typography.ts — SF Pro / Roboto type scale

### Types
- types/index.ts — All shared TypeScript interfaces

### Tests
- All under __tests__/ mirroring the source structure

---

## Task 1: Project Scaffold and Configuration

**Files:**
- Create: actledger-native/ (entire project root)
- Create: app.json, eas.json, babel.config.js, metro.config.js, tailwind.config.ts, tsconfig.json, .env, .env.production, .eslintrc.js, .gitignore, global.css, nativewind-env.d.ts

- [ ] Step 1: Create Expo project

Run from C:\Users\serta:
  npx create-expo-app@latest actledger-native --template blank-typescript
  cd actledger-native

- [ ] Step 2: Install core dependencies

  npx expo install expo-router expo-linking expo-constants expo-status-bar expo-splash-screen expo-secure-store expo-sqlite expo-camera expo-notifications expo-haptics expo-blur react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-screens react-native-maps @react-native-async-storage/async-storage @react-native-community/netinfo

  npm install nativewind@^4.0 tailwindcss @shopify/flash-list react-native-paper react-native-svg axios socket.io-client zustand @gorhom/bottom-sheet react-native-toast-message victory-native @shopify/react-native-skia xlsx lucide-react-native

  npm install -D @types/react @testing-library/react-native @testing-library/jest-native jest-expo typescript @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint

- [ ] Step 3: Configure app.json

Bundle identifier: com.ataolaitech.actledger
App name: ActLedger
URL scheme: actledger
Version: 2.0.0
Android versionCode: 20
Splash background: #0f172a
Plugins: expo-router, expo-secure-store, expo-camera, expo-notifications, expo-sqlite, expo-splash-screen
iOS info.plist: camera, location, photo library, face ID permissions in Turkish
Android permissions: CAMERA, FINE_LOCATION, COARSE_LOCATION, VIBRATE, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED
Experiments: typedRoutes true

- [ ] Step 4: Configure EAS (eas.json)

Three build profiles: development (simulator), preview (internal APK), production (auto-increment).
Submit config with Apple and Play Store placeholders.

- [ ] Step 5: Configure Nativewind and Tailwind

tailwind.config.ts: content from app/ and components/, Nativewind preset, ActLedger color tokens (brand-primary #3b82f6, brand-secondary #6366f1, surface-bg #0f172a, surface-card #1e293b, surface-alt #334155, surface-border #475569, content-primary #f8fafc, content-muted #94a3b8).

babel.config.js: babel-preset-expo with jsxImportSource nativewind, nativewind/babel preset, reanimated plugin.

metro.config.js: Expo default config wrapped with withNativeWind.

global.css: Tailwind base/components/utilities directives.

- [ ] Step 6: Configure TypeScript (tsconfig.json)

Extends expo/tsconfig.base, strict mode, baseUrl ".", paths "@/*" mapping to "./*".

- [ ] Step 7: Create environment files

.env: EXPO_PUBLIC_API_BASE=http://localhost:3001/api/v1
.env.production: EXPO_PUBLIC_API_BASE=https://api.actledger.com/api/v1

- [ ] Step 8: Create .gitignore

node_modules, .expo, dist, signing files (jks, p8, p12, key, mobileprovision), web-build, .env.local, google-play-key.json, ios/, android/.

- [ ] Step 9: Create ESLint config

Extends expo and typescript-eslint. No unused vars (except underscore-prefixed args). Warn on console (allow warn/error).

- [ ] Step 10: Verify project starts

  npx expo start

Expected: Metro bundler starts without errors.

- [ ] Step 11: Initialize git and commit

  git init && git add . && git commit -m "feat: scaffold Expo project with Nativewind, Reanimated, and core deps"

---

## Task 2: Types, Constants, and Theme

**Files:**
- Create: types/index.ts
- Create: constants/colors.ts, constants/spacing.ts, constants/typography.ts

- [ ] Step 1: Define shared types (types/index.ts)

All TypeScript interfaces matching backend models:
- Auth: User (id, email, firstName, lastName, role, companyId, companyName, loginCode), UserRole enum (10 levels), AuthTokens
- Tasks: Task, TaskDetail (with comments/attachments/location), TaskStatus, TaskPriority
- Work Orders: WorkOrder, WorkOrderStatus
- Forms: FormTemplate, FormField (type: TEXT/NUMBER/SELECT/CHECKBOX/DATE/PHOTO/LOCATION/SIGNATURE)
- Sales: Customer, CustomerType, SalesOrder, SalesOrderItem, SalesOrderDetail, Payment, PaymentMethod, Quote, QuoteDetail, QuoteLine, QuoteStatus, Branch, Till, TillSession, Product, CartItem
- Messages: Conversation, Message
- Notifications: AppNotification
- Shared: Comment, Attachment, PaginatedResponse, ApiError

- [ ] Step 2: Define color constants (constants/colors.ts)

Brand palette (primary #3b82f6, secondary #6366f1, success #22c55e, warning #f59e0b, danger #ef4444).
Dark theme surfaces (background #0f172a, surface #1e293b, surfaceAlt #334155, border #475569, text #f8fafc, textMuted #94a3b8).
Light theme surfaces (background #f8fafc, surface #ffffff, surfaceAlt #f1f5f9, border #e2e8f0, text #0f172a, textMuted #64748b).
Platform-adaptive tab bar (iOS: rgba with blur, Android: solid).
getThemeColors(scheme) helper. getStatusColor(status) helper.

- [ ] Step 3: Define spacing constants (constants/spacing.ts)

Scale: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48.
HitSlop: 8 all sides. MIN_TOUCH_TARGET: 44. BorderRadius: sm 6, md 10, lg 12, xl 16, full 9999.

- [ ] Step 4: Define typography constants (constants/typography.ts)

iOS/Android adaptive type scale: largeTitle 34, title1 28, title2 22, title3 20, headline 17, body 17, callout 16, subhead 15, footnote 13, caption 12. Each with weight and line height.

- [ ] Step 5: Commit

  git add types/ constants/ && git commit -m "feat: add TypeScript types and design token constants"

---

## Task 3: Auth Store and Secure Token Storage

**Files:**
- Create: lib/auth.ts, stores/authStore.ts
- Test: __tests__/lib/auth.test.ts, __tests__/stores/authStore.test.ts

- [ ] Step 1: Write failing test for token storage

Tests: save tokens calls SecureStore.setItemAsync with correct key, getAccessToken retrieves from store, clear deletes all three keys (access_token, refresh_token, user), saveUser serializes JSON.

- [ ] Step 2: Run test — expect FAIL (module not found)

- [ ] Step 3: Implement lib/auth.ts

Uses expo-secure-store. Keys: actledger_access_token, actledger_refresh_token, actledger_user. Functions: save(tokens), getAccessToken(), getRefreshToken(), saveUser(user), getUser() (parse JSON with try/catch), clear().

- [ ] Step 4: Run test — expect PASS

- [ ] Step 5: Write failing test for auth store

Tests: starts unauthenticated, sets user on successful login (mock api.post), clears state on logout.

- [ ] Step 6: Run test — expect FAIL

- [ ] Step 7: Implement stores/authStore.ts

Zustand store with: user, isAuthenticated, isLoading, error. Actions: login(loginCode, password) calls POST /mobile-auth/login then saves tokens and user; logout() clears everything; restore() reads from SecureStore on app start; setAuth(user, token) for testing; reset() for test cleanup.

- [ ] Step 8: Run test — expect PASS

- [ ] Step 9: Commit

  git add lib/auth.ts stores/ __tests__/ && git commit -m "feat: add secure token storage and auth store with tests"

---

## Task 4: API Client and Interceptors

**Files:**
- Create: lib/api.ts
- Test: __tests__/lib/api.test.ts

- [ ] Step 1: Write failing test

Tests: API_BASE ends with /api/v1, SERVER_BASE strips /api/v1, client accepts Authorization header, timeout is 30000ms.

- [ ] Step 2: Run test — expect FAIL

- [ ] Step 3: Implement lib/api.ts

Axios instance with baseURL from EXPO_PUBLIC_API_BASE (fallback localhost:3001). Timeout 30s. withCredentials true.

Response interceptor: on 401 (not login/refresh endpoints, not already retried), attempt token refresh via POST /auth/refresh. On success, save new token, retry original request. On failure, clear tokens (auth store handles redirect).

- [ ] Step 4: Run test — expect PASS

- [ ] Step 5: Commit

---

## Task 5: Custom Hooks (useApi, useMutation, useAuth)

**Files:**
- Create: hooks/useApi.ts, hooks/useMutation.ts, hooks/useAuth.ts
- Test: __tests__/hooks/useApi.test.ts

- [ ] Step 1: Write failing test for useApi

Tests: returns loading initially, returns data on success, returns error on failure.

- [ ] Step 2: Run test — expect FAIL

- [ ] Step 3: Implement hooks

useApi(path, params): GET with useState for data/loading/error, useEffect to fetch, refetch callback. Returns null data and loading true when path is null.

useMutation(path, method): mutate(body) returns promise. Tracks loading and error state.

useAuth(): Selector over authStore for user, isAuthenticated, isLoading, error, login, logout, restore.

- [ ] Step 4: Run test — expect PASS

- [ ] Step 5: Commit

---

## Task 6: Socket.io Client

**Files:**
- Create: lib/socket.ts, hooks/useSocket.ts

- [ ] Step 1: Implement socket manager (lib/socket.ts)

socketManager object: connect() reads token from SecureStore, creates io(SERVER_BASE) with websocket transport, exponential reconnect (1s to 30s). disconnect(). on(event, handler) returns unsubscribe function. emit(event, data). isConnected getter.

- [ ] Step 2: Implement useSocket hook

useSocket(event, handler): useEffect that subscribes via socketManager.on and returns cleanup.

- [ ] Step 3: Commit

---

## Task 7: Shared UI Components

**Files:**
- Create: components/StatusBadge.tsx, LoadingScreen.tsx, EmptyState.tsx, PlatformCard.tsx, PlatformList.tsx, SwipeableRow.tsx, ErrorBoundary.tsx
- Test: __tests__/components/StatusBadge.test.tsx

- [ ] Step 1: Write failing test for StatusBadge

Tests: renders status text, renders custom label.

- [ ] Step 2: Run test — expect FAIL

- [ ] Step 3: Implement all shared components

StatusBadge: colored dot + text, color from getStatusColor.
LoadingScreen: centered ActivityIndicator on theme background.
EmptyState: centered icon + title + message.
PlatformCard: iOS (borderRadius 12, soft shadow) vs Android (borderRadius 16, elevation 2). Theme-aware background.
PlatformList: FlashList wrapper with pull-to-refresh (RefreshControl), platform content padding.
SwipeableRow: Gesture Handler pan + Reanimated translateX with spring physics for swipe-to-action.
ErrorBoundary: class component, catches errors, shows retry button.

- [ ] Step 4: Run test — expect PASS

- [ ] Step 5: Commit

---

## Task 8: Root Layout and Auth Gate

**Files:**
- Create: app/_layout.tsx, app/+not-found.tsx

- [ ] Step 1: Implement root layout

GestureHandlerRootView wraps everything. SafeAreaProvider. SplashScreen.preventAutoHideAsync at module level.

AuthGate component: restore() on mount. Watches segments — if not authenticated and not in (auth) group, redirect to login. If authenticated and in (auth) group, redirect to home. Hides splash when loading completes.

Imports global.css. StatusBar adaptive. Toast at bottom.

- [ ] Step 2: Implement 404 screen

Simple "Sayfa bulunamadi" with "Ana Sayfaya Don" button.

- [ ] Step 3: Commit

---

## Task 9: Auth Screens (Login and Force Password Change)

**Files:**
- Create: app/(auth)/_layout.tsx, app/(auth)/login.tsx, app/(auth)/force-password-change.tsx

- [ ] Step 1: Implement auth layout

Stack with headerShown false, dark background.

- [ ] Step 2: Implement login screen

KeyboardAvoidingView. ActLedger branding at top. Login code input (ACT-XXXXXX, autoCapitalize characters). Password input (secureTextEntry). Login button calls authStore.login. Toast on error. Loading state disables inputs and shows ActivityIndicator.

- [ ] Step 3: Implement force password change

New password + confirm password inputs. Minimum 8 chars validation. Match validation. POST /auth/change-password. Redirect to home on success.

- [ ] Step 4: Commit

---

## Task 10: Bottom Tab Navigator

**Files:**
- Create: app/(app)/_layout.tsx, stores/uiStore.ts

- [ ] Step 1: Implement UI store

Zustand: messageBadge, notificationBadge, setters, incrementMessageBadge.

- [ ] Step 2: Implement tab layout

Tabs component with 5 visible tabs: Ana Sayfa (Home icon), Gorevler (ClipboardList), Satis (Banknote), Mesajlar (MessageCircle with badge), Profil (User).

Hidden screens (href null): notifications, qr-scanner, operiq.

Platform-adaptive tab bar: iOS blur background (expo-blur), Android solid. Active tint #3b82f6.

Connects socket on mount, subscribes to message:new to increment badge.

- [ ] Step 3: Commit

---

## Task 11: Home / Dashboard Screen

**Files:**
- Create: app/(app)/(home)/_layout.tsx, app/(app)/(home)/index.tsx

- [ ] Step 1: Implement home stack layout

Stack with iOS large title, theme-aware header.

- [ ] Step 2: Implement dashboard

Greeting with user first name. Stats cards (active tasks, today orders) from /tasks/dashboard-stats. Quick actions grid (6 items: Gorevler, Satis, Mesajlar, QR Tarama, OperIQ, Bildirimler) with colored icons. Each navigates to its route.

- [ ] Step 3: Commit

---

## Task 12: Tasks Module (6 screens)

**Files:**
- Create: app/(app)/(tasks)/_layout.tsx, index.tsx, [id].tsx
- Create: app/(app)/(tasks)/work-orders/index.tsx, [id].tsx
- Create: app/(app)/(tasks)/forms/index.tsx, [id].tsx

- [ ] Step 1: Implement tasks stack layout

Stack with screen configs for all 6 screens. iOS large title on lists, standard on details.

- [ ] Step 2: Implement task list

Sub-navigation buttons to Work Orders and Forms at top. FlashList of tasks from GET /tasks. Status filter support. Each row: title, StatusBadge, priority label, due date. iOS chevron. Pull-to-refresh. Empty state.

- [ ] Step 3: Implement task detail

ScrollView. Header with title and status badge. Description card. Info rows (assignee, priority, due date, department) with icons. Action buttons based on status (Beklemede -> Baslat, Devam Ediyor -> Tamamla). Comments section. PATCH /tasks/:id for status change.

- [ ] Step 4: Implement work order list

Same list pattern as tasks. GET /work-orders. Shows title, status badge, order number.

- [ ] Step 5: Implement work order detail

ScrollView with order number, title, status, assignee, due date.

- [ ] Step 6: Implement form list

List of form templates from GET /form-templates. Shows name, field count, FileText icon.

- [ ] Step 7: Implement form fill

Dynamic form renderer. Reads FormField types and renders: TEXT (TextInput), NUMBER (numeric keyboard), CHECKBOX (Switch), SELECT (pressable options), PHOTO (camera button), DATE (placeholder). Required field validation. Submit via POST /field-reports.

- [ ] Step 8: Commit

---

## Task 13: Sales Module (10 screens)

**Files:**
- Create: All files under app/(app)/(sales)/
- Create: stores/cartStore.ts, components/BarcodeScanner.tsx
- Test: __tests__/stores/cartStore.test.ts

- [ ] Step 1: Write failing test for cart store

Tests: starts empty, adds item with correct lineTotal, increments quantity for duplicate product, computes total across multiple items, removes item.

- [ ] Step 2: Run test — expect FAIL

- [ ] Step 3: Implement cart store (stores/cartStore.ts)

Zustand: items (CartItem[]), total (computed). Actions: addItem(product, qty, price, discount) — merges duplicates; removeItem(productId); updateQuantity(productId, qty); clear().

- [ ] Step 4: Run test — expect PASS

- [ ] Step 5: Implement barcode scanner (components/BarcodeScanner.tsx)

Modal with CameraView from expo-camera. Barcode types: ean13, ean8, upc_a, upc_e, code128, code39, qr. Permission request flow. Scan frame overlay with hint text. Close button. 2-second debounce between scans. Callback: onScan(barcode: string).

- [ ] Step 6: Implement sales layout

Stack with all 10 screen configs.

- [ ] Step 7: Implement sales dashboard

Today's sales total card. Navigation list: POS, Musteriler, Siparisler, Teklifler, Kasa — each with icon, label, description.

- [ ] Step 8: Implement POS screen

Search bar with manual input and barcode scan button. BarcodeScanner modal. On scan: GET /sales/pos/products with barcode, add to cart. Cart list with product name, price, quantity controls (minus/plus), delete, line total. Payment method selector (Nakit/Kart/Havale). Footer: total amount and "Satisi Tamamla" button. POST /sales/pos/checkout on complete. Clear cart on success.

- [ ] Step 9: Implement customer list

Search bar. GET /sales/customers with search param. Row: name, type (Perakende/Kurumsal), phone. Pull-to-refresh.

- [ ] Step 10: Implement customer detail

GET /sales/customers/:id. Name, type, phone, email, address, balance. Recent orders list.

- [ ] Step 11: Implement order list

GET /sales/orders with status filter chips. Row: order number, customer name, status badge, total amount, date.

- [ ] Step 12: Implement order detail

GET /sales/orders/:id. Header with order number and status. Items table (product, qty, price, line total). Payments list. Action buttons: approve (SUPERVIZOR+), complete with payment method, cancel. Each action is a POST to the corresponding endpoint.

- [ ] Step 13: Implement quote list

GET /sales/quotes with status filter. Row: quote number, customer, status, total, valid until date.

- [ ] Step 14: Implement quote detail

GET /sales/quotes/:id. Lines table. Actions: send, approve, reject, convert to order. Convert creates a sales order and navigates to it.

- [ ] Step 15: Implement new quote

Customer picker (search and select). Line items: add via barcode scan or manual entry (product name, unit, qty, price, discount, tax rate). Notes field. Submit via POST /sales/quotes.

- [ ] Step 16: Implement till screen

Branch and till selection (from localStorage or API). Open till: POST /sales/tills/:id/open with opening balance. Close till: POST /sales/tills/:id/close with closing balance and notes. Current session display: opening balance, total sales, transaction count, expected balance.

- [ ] Step 17: Commit

---

## Task 14: Messages Module (2 screens)

**Files:**
- Create: app/(app)/(messages)/_layout.tsx, index.tsx, [id].tsx

- [ ] Step 1: Implement messages layout

Stack with iOS large title on list.

- [ ] Step 2: Implement message list

GET /messages/conversations. Avatar circle with first letter. Name, last message preview, timestamp, unread badge. Socket subscription: message:new triggers refetch. Pull-to-refresh.

- [ ] Step 3: Implement chat screen

GET /messages/conversations/:id/messages for initial load. FlatList inverted or scrollToEnd. Own messages: blue bubble right-aligned. Other messages: dark bubble left-aligned with sender name. Socket subscription: message:new appends to list. Input bar with multiline TextInput and send button. POST to send message. KeyboardAvoidingView for iOS.

- [ ] Step 4: Commit

---

## Task 15: Utility Screens (4 screens)

**Files:**
- Create: app/(app)/notifications.tsx, qr-scanner.tsx, profile.tsx, operiq.tsx

- [ ] Step 1: Implement notifications screen

GET /notifications. Row: bell icon (blue if unread, muted if read), title, body (2 lines), timestamp. Reduced opacity for read items.

- [ ] Step 2: Implement QR scanner screen

Full-screen BarcodeScanner. On scan: if starts with actledger://, navigate via deep link. Otherwise show toast with scanned value.

- [ ] Step 3: Implement profile screen

User card: avatar initials, full name, email, company. Menu items: Bildirimler, QR Tarayici, OperIQ — each navigates. Logout button with platform-appropriate confirmation (iOS destructive style, Android standard). Version text at bottom.

- [ ] Step 4: Implement OperIQ screen

AI chat interface. Empty state with Bot icon and description. Message bubbles: user (blue, right) and assistant (dark, left with Bot icon). Input bar. POST /operiq-chat with message history. Loading indicator "OperIQ dusunuyor..." while waiting for response.

- [ ] Step 5: Commit

---

## Task 16: Offline Database and Sync Queue

**Files:**
- Create: lib/offline/db.ts, lib/offline/queue.ts, lib/offline/sync.ts
- Create: hooks/useOffline.ts
- Test: __tests__/lib/offline/queue.test.ts

- [ ] Step 1: Write failing test for offline queue

Tests: enqueue does not throw, getPending returns array.

- [ ] Step 2: Run test — expect FAIL

- [ ] Step 3: Implement offline database (lib/offline/db.ts)

expo-sqlite with WAL mode. Tables: cache (id, table_name, data JSON, updated_at, synced), pending_actions (id auto, endpoint, method, body, created_at, retry_count, status). Indexes on table_name and status. Helper functions: cacheGet, cacheGetAll, cacheSet, cacheClear.

- [ ] Step 4: Implement offline queue (lib/offline/queue.ts)

Functions: enqueue(action), getPending() (FIFO by created_at), markSyncing(id), markDone(id) (deletes), markFailed(id) (increments retry_count), getFailedCount() (retry_count >= 3), retryFailed() (reset status where retry < 3).

- [ ] Step 5: Implement sync manager (lib/offline/sync.ts)

processQueue(): check network via NetInfo, iterate pending actions, attempt API call, mark done or failed. Prevents concurrent sync via flag.

startAutoSync(): NetInfo listener (sync on reconnect) plus 30-second interval. Returns cleanup function.

- [ ] Step 6: Implement useOffline hook

Tracks isOffline via NetInfo.addEventListener.

- [ ] Step 7: Run test — expect PASS

- [ ] Step 8: Commit

---

## Task 17: Push Notifications and Deep Links

**Files:**
- Create: lib/notifications.ts
- Modify: app/_layout.tsx

- [ ] Step 1: Implement notification registration (lib/notifications.ts)

setNotificationHandler for foreground display (show alert, play sound, set badge).

registerForPushNotifications(): request permission, get Expo push token, POST /notifications/register-device with token and platform. Create Android channel "Varsayilan" with MAX importance.

setupNotificationListeners(): addNotificationResponseReceivedListener. Read data.deepLink, data.taskId, data.orderId, data.conversationId from notification payload. Route to appropriate screen via expo-router.

- [ ] Step 2: Wire into root layout

In AuthGate, when isAuthenticated becomes true: call registerForPushNotifications, setupNotificationListeners, syncManager.startAutoSync. Return cleanup function.

- [ ] Step 3: Commit

---

## Task 18: Final Verification and First Run

- [ ] Step 1: Install any missing peer dependencies

  npm install @react-native-community/netinfo
  npx expo install --fix

- [ ] Step 2: Run TypeScript check

  npx tsc --noEmit

Expected: No errors.

- [ ] Step 3: Run all tests

  npx jest --passWithNoTests

Expected: All tests pass.

- [ ] Step 4: Run linter

  npx eslint . --ext .ts,.tsx

Expected: No errors.

- [ ] Step 5: Start development server

  npx expo start

Expected: Metro starts. App loads on Expo Go or dev client.

- [ ] Step 6: Final commit

  git add . && git commit -m "feat: ActLedger React Native v2.0.0 — complete 25-screen mobile app"

---

## Summary

| Phase | Tasks | Screens | Key Features |
|-------|-------|---------|--------------|
| Foundation | 1-6 | 0 | Scaffold, types, auth, API, socket, hooks |
| Shell | 7-10 | 3 | Components, root layout, auth screens, tab nav |
| Home | 11 | 1 | Dashboard with stats and quick actions |
| Tasks | 12 | 6 | Task list/detail, work orders, forms |
| Sales | 13 | 10 | POS with barcode, customers, orders, quotes, till |
| Messages | 14 | 2 | Conversation list, real-time chat |
| Utilities | 15 | 4 | Notifications, QR, profile, OperIQ |
| Offline | 16 | 0 | SQLite cache, sync queue, auto-sync |
| Push | 17 | 0 | Expo push, deep link routing |
| Verify | 18 | 0 | Type check, tests, lint, first run |
| **Total** | **18** | **25** | Complete mobile ERP |
