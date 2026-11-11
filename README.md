# 💊 MediFill — Smart Medication Management & Dose Tracker

<div align="center">

![MediFill Banner](https://img.shields.io/badge/MediFill-v2.0-0284C7?style=for-the-badge&logo=shield&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-58.0-000020?style=for-the-badge&logo=expo&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12.10-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

**An Offline-First, Cloud-Synchronized Clinical Companion for Patients and Multi-Generational Caregivers.**

Designed, architected, and maintained exclusively by [**Nandini Sreejit Nair**](https://github.com/nandinisnair).

</div>

---

## 🌟 Overview

**MediFill** is a full-stack, cross-platform mobile and web application engineered to solve critical challenges in medication adherence, prescription management, and adverse drug interaction prevention. 

Inspired by modern clinical design languages (Apple Health, One Medical, Scandinavian medical UI), MediFill combines clinical precision with intuitive human-centric UX—allowing individual patients and family caregivers to manage multi-patient medicine cabinets, check real-time stock levels, scan physical prescriptions with optical character recognition (OCR), and find emergency 24/7 pharmacies.

---

## 🚀 Key Features

### 🗄️ 1. Smart Medicine Cabinet
- **Glanceable KPI Overview:** Real-time metrics for total active medications, low-stock warnings (≤20% supply remaining), expiring-soon items (≤30 days), and active interaction flags.
- **Dynamic Visual Gauges:** Multi-colored inventory bars (Green >20%, Amber ≤20%, Red ≤10%) reflecting real-time tablet and syrup stock.
- **Interactive Search & Segmented Filtering:** High-performance debounced filtering across medicine names, dosage strengths, and safety categories.

### ⏰ 2. Daily Dose Schedule & Adherence Timeline
- **Clinical Time Bucketing:** Intelligently organizes daily prescriptions into 4 standard medical windows:
  - 🌅 **Morning** (08:00)
  - ☀️ **Afternoon** (13:00)
  - 🌆 **Evening** (19:00)
  - 🌙 **Bedtime** (22:00)
- **One-Tap Dose Logging:** Check off doses in real-time with tactile haptic feedback and completion animations.
- **Automatic Stock Decrement:** Logging a dose automatically deducts the appropriate amount from your cabinet inventory.

### 📷 3. Optical Prescription & Label Scanner (OCR)
- **Camera Viewfinder:** Built-in reticle with edge detection guidelines using `expo-camera`.
- **Image Pre-processing:** Client-side image resizing and compression using `expo-image-manipulator` to reduce network latency by over 60%.
- **Pharmaceutical NLP Parser:** Extracted text is cross-referenced against a curated dictionary of **120+ known medications** (Paracetamol, Metformin, Amoxicillin, Combiflam, etc.).
- **Smart Date Disambiguation:** Contextual regex parser that accurately distinguishes **MFD** (Manufacturing Date) from **EXP** (Expiry Date) to eliminate false expiration alerts.

### ⚠️ 4. Drug-Drug Interaction Safety Engine
- **Pre-emptive Conflict Analysis:** Cross-references any newly entered prescription against the patient’s existing cabinet before saving.
- **Embedded Clinical Matrix:** Detects severe and moderate interactions (e.g., Blood Thinners + NSAIDs, ACE Inhibitors + Potassium Diuretics) and injects prominent `ShieldAlert` warning cards detailing clinical risks.

### 📍 5. Emergency Pharmacy Locator
- **Geographic Distance Engine:** Uses the Haversine trigonometric formula to calculate distances from the user's real-time GPS location.
- **Emergency Filters:** Instantly filters for 24-hour pharmacies and top-rated providers.
- **Zero-Billing Web Fallback:** Renders native Google Maps on mobile devices and zero-cost OpenStreetMap tiles on web browsers.

### 👨‍👩‍👧 6. Multi-User Family Caregiver Hub
- **Multi-Tenant Profiles:** Switch between family profiles (*Self*, *Spouse*, *Child*, *Parent*, *Grandparent*) with dedicated medical badge color codes.
- **Doctor-Ready Reports:** Exports structured medical history and prescription schedules as CSV/printable summaries for medical appointments.
- **Cloud Sync Dashboard:** Live status indicators for Firebase Cloud Firestore synchronization.

### 🛡️ 7. API Credit Quota Safeguard (Circuit Breaker)
- Monitors monthly usage against Google Maps Platform’s $200 free monthly credit allowance.
- Automatically engages **Zero-Billing Mode** once **80% (160 credits)** of the quota is reached, gracefully switching to free OpenStreetMap tiles to guarantee zero unexpected charges.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, React Native 0.88, Expo 58 | Cross-platform runtime (Web, iOS, Android) |
| **Routing & Navigation** | Expo Router (File-based routing) | Deep-linking, nested layouts, and tab management |
| **State & Persistence** | React Context API, AsyncStorage | Offline-first optimistic UI updates with zero lag |
| **Backend & Cloud** | Firebase Cloud Firestore, Firebase Auth | Tenant-isolated cloud database & authentication |
| **Animation & UI** | React Native Reanimated 4.7, Lucide Icons | Fluid layout transitions and clinical iconography |
| **Location & Maps** | `react-native-maps`, `expo-location`, OpenStreetMap | Native map overlays and geolocation |
| **Device Capabilities** | `expo-camera`, `expo-image-manipulator`, `expo-notifications` | OCR scanning and local repeating dose reminders |

---

## 📂 Project Directory Structure

```text
MediFill/
├── project/
│   ├── app/                              # Expo Router Application Routes
│   │   ├── (tabs)/                       # Bottom Tab Navigation Group
│   │   │   ├── index.tsx                 # Home / Medicine Cabinet Dashboard
│   │   │   ├── schedule.tsx              # Daily Dose Timeline & Streak Tracker
│   │   │   ├── add.tsx                   # Prescription Entry & Conflict Pre-check
│   │   │   ├── pharmacy.tsx              # Emergency Pharmacy Locator
│   │   │   ├── profile.tsx               # Multi-User Caregiver & Health Export Hub
│   │   │   └── _layout.tsx               # Tab Bar Configuration & Blur Effects
│   │   ├── auth.tsx                      # Sign-In, Sign-Up & Password Reset Portal
│   │   ├── camera.tsx                    # Optical Prescription Scanner Viewfinder
│   │   ├── +not-found.tsx                # 404 Route Error Boundary
│   │   └── _layout.tsx                   # Master Root Layout & Auth Provider Gate
│   │
│   ├── components/                       # Reusable UI Components
│   │   ├── MedicineCard.tsx              # Interactive Medicine Card with Stock Gauges
│   │   ├── ChennaiMap.tsx                # Native Mobile Map Component
│   │   ├── ChennaiMap.web.tsx            # Web OpenStreetMap Fallback Component
│   │   └── DateTimePicker.tsx            # Unified Cross-Platform Date & Time Picker
│   │
│   ├── context/                          # Global State Management
│   │   ├── AuthContext.tsx               # Firebase Auth State & Session Lifecycle
│   │   └── MedicineContext.tsx           # Offline-First Medicine Repository & Sync
│   │
│   ├── services/                         # Business Logic & Infrastructure
│   │   ├── firestoreSync.ts              # Real-Time Cloud Firestore Sync Layer
│   │   ├── quotaGuardService.ts          # 80% Monthly API Credit Safeguard Service
│   │   ├── ocrService.ts                 # Vision OCR Pipeline & Pharma NLP Parser
│   │   └── notificationService.ts        # Local Repeating Push Notification Engine
│   │
│   ├── constants/                        # Domain Data & Design Tokens
│   │   ├── theme.ts                      # Precision Medical Palette & Spacing Tokens
│   │   ├── interactions.ts               # Clinical Drug-Drug Interaction Matrix
│   │   └── pharmacies.ts                 # Offline Pharmacy Directory & GPS Coordinates
│   │
│   ├── config/
│   │   └── firebase.ts                   # Firebase Client SDK Singleton Initialization
│   │
│   ├── .env.example                      # Template for Required Environment Variables
│   ├── .gitignore                        # Git Security Rules (Protects .env and keys)
│   ├── app.config.js                     # Dynamic Expo Configuration Script
│   ├── app.json                          # Static Expo Manifest (Permissions & IDs)
│   └── package.json                      # Project Manifest & Dependency Tree
```

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js (v20+ or v22 LTS)](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) on your iOS or Android mobile device (optional, for mobile testing)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nandinisnair/Medifill.git
   cd Medifill/project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and add your credentials:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase and Google Maps credentials in `.env`:
   ```env
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_MONTHLY_CREDIT_BUDGET=200
   EXPO_PUBLIC_CREDIT_SAFEGUARD_PERCENT=80
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   - **Open Web Browser:** Press `w` in the terminal or visit `http://localhost:8081` (or `8082`).
   - **Open on iOS/Android:** Scan the terminal QR code using the **Expo Go** app.

---

## 🔒 Security & Privacy

- **Credential Isolation:** Raw API keys and configuration secrets are stored strictly in `.env`, which is permanently excluded via `.gitignore` to prevent leaks to public repositories.
- **Tenant Isolation:** Firestore rules and sync pathways are scoped strictly under `users/{uid}/medicines/`, ensuring that data cannot be accessed across different user accounts.
- **Budget Protection:** The client-side circuit breaker ([`quotaGuardService.ts`](file:///c:/Users/nandi/Downloads/MediFill/project/services/quotaGuardService.ts)) enforces a hard stop at 80% of free cloud quotas, preventing unauthorized financial charges.

---

## 👩‍💻 Author & Solo Contributor

Everything in this repository has been designed, architected, developed, and maintained exclusively by:

**Nandini Sreejit Nair**  
🔗 GitHub: [@nandinisnair](https://github.com/nandinisnair)  
📂 Repository: [https://github.com/nandinisnair/Medifill](https://github.com/nandinisnair/Medifill)

*Solo Contributor & Lead Engineer*

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
