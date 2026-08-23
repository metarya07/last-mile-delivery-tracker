# 📦 Last-Mile Delivery Tracker

[![Java](https://img.shields.io/badge/Java-21%20%7C%2026-ED8B00?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Flyway](https://img.shields.io/badge/Flyway-Migrations%20V1--V7-CC0200?logo=flyway&logoColor=white)](https://flywaydb.org/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel%20Production-000000?logo=vercel&logoColor=white)](https://last-mile-delivery-11622.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render%20Live-46E3B7?logo=render&logoColor=black)](https://last-mile-delivery-tracker-ahmz.onrender.com)
[![JUnit 5](https://img.shields.io/badge/Tests-23%20Passed%20(100%25)-brightgreen?logo=junit5&logoColor=white)](https://junit.org/junit5/)

A full-stack, enterprise-grade logistics and delivery management platform. Built to support dynamic volumetric parcel pricing, intelligent driver auto-assignment, real-time tracking with immutable audit trails, multi-role portal experiences (Admin, Dispatcher, Delivery Agent, Warehouse, Customer), failed delivery self-service recovery, and multi-channel transactional notifications (Brevo HTTPS REST API + SMS).

---

## 🌐 Live Hosted Deployments

| Component | Platform | URL |
|---|---|---|
| **Frontend Application** | Vercel | [https://last-mile-delivery-11622.vercel.app](https://last-mile-delivery-11622.vercel.app) |
| **Backend REST API** | Render | [https://last-mile-delivery-tracker-ahmz.onrender.com](https://last-mile-delivery-tracker-ahmz.onrender.com) |
| **GitHub Repository** | GitHub | [https://github.com/metarya07/last-mile-delivery-tracker](https://github.com/metarya07/last-mile-delivery-tracker) (Branch: `main`) |
| **System Design Document** | Markdown | [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) (706 words, covering pricing, zones, dispatch, and failed deliveries) |
| **Clean Submission Zip** | Local Package | `A:\last-mile-delivery-tracker-submission.zip` (**0.23 MB**) |

---

## 🔑 Pre-Seeded Demo Accounts (1-Click Login on App)

The application includes pre-configured demo accounts for instant evaluation:

| Role | Email | Password | Primary Capabilities & Access |
|---|---|---|---|
| **Administrator** | `admin@lastmile.com` | `password123` | Full system control, rate cards & zones, audit trails, status overrides |
| **Dispatcher / Operations** | `dispatcher@lastmile.com` | `password123` | Live dispatch desk, auto-assignment, driver allocation, fleet runs |
| **Delivery Agent** | `agent@lastmile.com` | `password123` | Duty toggle (online/offline), status transitions, POD capture, run history |
| **Warehouse Staff** | `warehouse@lastmile.com` | `password123` | Inbound package intake, zone sorting, hub transfer management |
| **Customer** | `customer@lastmile.com` | `password123` | Self-booking with instant fare engine, live tracking, failed delivery rescheduling |

> [!TIP]
> On the [Auth Page](https://last-mile-delivery-11622.vercel.app), click any of the **"Quick Demo Role Preview"** buttons to log in instantly without typing credentials!

---

## 🏗️ System Architecture & Workflow

```
+----------------------------------------------------------------------------------------------------+
|                                    LAST-MILE DELIVERY SYSTEM                                       |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
      [Customer Experience]                                             [Operations & Dispatch]
  - Order Self-Booking Desk                                         - Live Dispatch Desk (Admin/Ops)
  - Live Fare Calculation Engine                                    - Zone & Area Hierarchy Config
  - Real-Time Audit Tracking Timeline                               - Dynamic Rate Card Manager
  - Failed Delivery Reschedule Desk                                 - Fleet Auto-Assignment Engine
  - Driver Application Portal                                       - Driver Onboarding Verification
                 │                                                                 │
                 └────────────────────────────────┬────────────────────────────────┘
                                                  ▼
                                      [Spring Boot 4 / Java 26]
                                ├── Stateless JWT Auth & RBAC Security
                                ├── Dynamic Rate Calculation Service
                                ├── Dispatch & Driver Allocation Service
                                ├── Immutable Tracking & Audit Service
                                └── Brevo HTTPS REST API Notification Service
                                                  │
                                                  ▼
                                      [Relational Database (MySQL)]
                                ├── Flyway Migrations (V1 to V7)
                                ├── Zones, Areas, & Route Rate Cards
                                ├── Delivery Orders & Attempt Ledgers
                                └── Users, Roles, & Audit Logs
```

---

## 🧮 Dynamic Rate Calculation Engine

### 1. Mathematical Formulas
Logistics pricing calculates volumetric and gross weights dynamically without hardcoded constants:

1. **Volumetric Weight**:
   $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{5000}$$

2. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$

3. **Base Freight Charge**:
   $$\text{Base Charge} = \max(\text{Chargeable Weight} \times \text{Rate Per Kg}, \text{Minimum Charge})$$

4. **Total Billable Amount**:
   $$\text{Total Charge} = \text{Base Charge} + (\text{PaymentType} == \text{COD} \ ? \ \text{CodSurcharge} : 0)$$

### 2. Step-by-Step Calculation Walkthrough
Consider an order booked between **Zone 1 (North Hub)** and **Zone 2 (South Hub)**:
- **Dimensions**: Length = $40\text{ cm}$, Width = $30\text{ cm}$, Height = $25\text{ cm}$
- **Actual Weight**: $4.00\text{ kg}$
- **Order Type**: `B2C`
- **Payment Type**: `COD`

```
Step 1: Volumetric Weight = (40 × 30 × 25) / 5000 = 30,000 / 5000 = 6.000 kg
Step 2: Chargeable Weight = MAX(4.000 kg, 6.000 kg) = 6.000 kg
Step 3: Route Rate Card   = Zone 1 -> Zone 2 (B2C) => Rate: ₹35.00/kg, Min: ₹70.00
Step 4: Base Charge       = MAX(6.000 × ₹35.00, ₹70.00) = MAX(₹210.00, ₹70.00) = ₹210.00
Step 5: COD Surcharge     = ₹30.00 (B2C COD Rule)
--------------------------------------------------------------------------------
Final Billable Charge    = ₹210.00 + ₹30.00 = ₹240.00
```

---

## 🔄 Delivery Lifecycle & Rescheduling State Machine

```
              ┌─────────────────────────────────────────────────────────────┐
              │                                                             │
              ▼                                                             │
          [PLACED] ───────► [PICKED_UP] ───────► [IN_TRANSIT]               │
              │                                      │                      │
       (Admin Assign /                               ▼                      │
        Auto-Assign)                        [OUT_FOR_DELIVERY]              │
              │                                      │                      │
              │                       ┌──────────────┴──────────────┐       │
              │                       ▼                             ▼       │
              │                  [DELIVERED]                     [FAILED]   │
              │                 (POD Captured)              (Reason Logged) │
              │                                                     │       │
              │                                                     ▼       │
              │                                              [RESCHEDULED] ─┘
              │                                            (Customer selects
              │                                             new retry date)
              └─────────────────────────────────────────────────────┘
```

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Java**: Java 21 or Java 26 SDK installed (`java -version`)
- **Node.js**: Node.js 20+ and npm installed (`node -v`)
- **Database**: MySQL 8.0+ running on `localhost:3306`

### 1. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE last_mile_delivery;
```
*(Flyway automatically applies all 7 schema migrations upon backend launch).*

### 2. Backend Setup
```bash
cd backend

# Copy environment template
cp ../.env.example .env

# Run Spring Boot backend
.\mvnw spring-boot:run
```

Run test suite:
```bash
.\mvnw test
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🗄️ Database Schema & Entity Relationships

```
                                  +-------------------+
                                  |       users       |
                                  +-------------------+
                                  | id (PK)           |
                                  | name              |
                                  | email (Unique)    |
                                  | password          |
                                  | role (ENUM)       |
                                  | phone             |
                                  | available (BOOL)  |
                                  +-------------------+
                                    |        |        |
         +--------------------------+        |        +--------------------------+
         | (customer_id)                     | (delivery_agent_id)               | (applicant_id)
         v                                   v                                   v
+-----------------------+           +-----------------------+     +-------------------------------+
|    delivery_orders    |           |   delivery_attempts   |     | delivery_partner_applications |
+-----------------------+           +-----------------------+     +-------------------------------+
| id (PK)               |           | id (PK)               |     | id (PK)                       |
| customer_id (FK)      |<----+     | order_id (FK)         |     | applicant_id (FK, Unique)     |
| delivery_agent_id (FK)|     |     | delivery_agent_id (FK)|     | vehicle_type (ENUM)           |
| pickup_zone_id (FK)   |     |     | attempt_number (INT)  |     | vehicle_number                |
| drop_zone_id (FK)     |     |     | status (ENUM)         |     | driving_license               |
| pickup_address        |     |     | failure_reason        |     | preferred_area                |
| drop_address          |     |     | attempted_at          |     | status (PENDING/APPROVED/...) |
| length_cm             |     |     +-----------------------+     | reviewed_by_id (FK)           |
| width_cm              |     |                                   +-------------------------------+
| height_cm             |     +-----------------------------------+
| actual_weight_kg      |                                         | (order_id)
| volumetric_weight_kg  |                                         v
| chargeable_weight_kg  |                             +-------------------------+
| order_type (B2B/B2C)  |                             |  order_tracking_history |
| payment_type (COD/...) |                            +-------------------------+
| base_charge           |                             | id (PK)                 |
| cod_surcharge         |                             | order_id (FK)           |
| final_charge          |                             | status (ENUM)           |
| status (ENUM)         |                             | actor_id (FK)           |
| created_at            |                             | created_at              |
+-----------------------+                             +-------------------------+
     |             |
     | (pickup)    | (drop)
     v             v
+-----------------------+          +-----------------------+
|         zones         |          |       zone_areas      |
+-----------------------+          +-----------------------+
| id (PK)               |<---------| id (PK)               |
| name (Unique)         |          | zone_id (FK)          |
+-----------------------+          | area_name             |
     |                             +-----------------------+
     |
     +---------------------+
     |                     |
     v (pickup_zone_id)    v (drop_zone_id)
+------------------------------------+          +-----------------------+
|             rate_cards             |          |      cod_charges      |
+------------------------------------+          +-----------------------+
| id (PK)                            |          | id (PK)               |
| pickup_zone_id (FK)                |          | order_type (Unique)   |
| drop_zone_id (FK)                  |          | surcharge (DECIMAL)   |
| order_type (B2B / B2C)             |          +-----------------------+
| rate_per_kg (DECIMAL)              |
| minimum_charge (DECIMAL)           |
+------------------------------------+
```

---

## 📡 REST API Reference

### 1. Authentication & Security (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/login` | Public | Authenticate user & return stateless JWT |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated profile & permissions |
| `POST` | `/api/auth/forgot-password` | Public | Generate & dispatch 6-digit HTML OTP email |
| `POST` | `/api/auth/verify-otp` | Public | Validate reset OTP |
| `POST` | `/api/auth/reset-password` | Public | Reset password with verified OTP |

### 2. Orders & Tracking Lifecycle (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer / Admin | Book order (Admin can pass `customerId` to book on behalf) |
| `GET` | `/api/orders` | Authenticated | Get orders (Customer: own, Agent: assigned, Admin: all) |
| `GET` | `/api/orders/{id}` | Authenticated | Get single order details |
| `PATCH` | `/api/orders/{id}/status` | Agent / Admin | Update status (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) |
| `POST` | `/api/orders/{id}/assign/{agentId}` | Admin / Dispatcher | Manually assign order to delivery agent |
| `POST` | `/api/orders/{id}/auto-assign` | Admin / Dispatcher | Auto-allocate nearest & least-loaded agent |
| `POST` | `/api/orders/{id}/reschedule` | Customer / Admin | Reschedule a `FAILED` order for a future date |
| `GET` | `/api/orders/{id}/tracking` | Authenticated | Retrieve full immutable tracking audit timeline |
| `GET` | `/api/orders/{id}/attempts` | Authenticated | Retrieve delivery attempts & failure reasons |

### 3. Rate Calculation Engine & Zones (`/api`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/rates/estimate` | Public / Auth | Live pre-booking rate estimate from dimensions & weight |
| `GET` | `/api/zones` | Public / Auth | List all configured delivery zones & areas |
| `POST` | `/api/zones` | Admin | Create a new delivery zone |
| `POST` | `/api/zones/{id}/areas` | Admin | Assign neighborhood/area to a zone |
| `GET` | `/api/rates` | Admin | List all route rate cards |
| `POST` | `/api/rates` | Admin | Create or update rate card |
| `PUT` | `/api/rates/{id}` | Admin | Edit rate card rates and minimum charge |
| `GET` | `/api/rates/cod` | Admin | List COD surcharge rules |
| `PUT` | `/api/rates/cod` | Admin | Update COD surcharge per order type |

### 4. Partner Applications & Fleet (`/api`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/delivery-partner-applications` | Customer | Submit driver onboarding application |
| `GET` | `/api/delivery-partner-applications/my` | Customer | Check applicant status |
| `GET` | `/api/delivery-partner-applications` | Admin / Dispatcher | Review all pending applications |
| `POST` | `/api/delivery-partner-applications/{id}/approve` | Admin / Dispatcher | Approve application & promote to `DELIVERY_AGENT` |
| `POST` | `/api/delivery-partner-applications/{id}/reject` | Admin / Dispatcher | Reject application with feedback reason |
| `PATCH` | `/api/users/availability` | Delivery Agent | Toggle driver online/offline duty status |

---

## 🧪 Automated Testing & Verification

The test suite validates rate calculation accuracy, RBAC security constraints, partner application approval cycles, and tracking immutability:

```bash
cd backend
.\mvnw test
```

```text
[INFO] Running com.lastmile.delivery.DeliveryPartnerApplicationTests
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.lastmile.delivery.LastMileDeliveryApplicationTests
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.lastmile.delivery.RbacSecurityTests
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Tests run: 23, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
```
