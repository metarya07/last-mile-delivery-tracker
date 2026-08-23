# 📦 Last-Mile Delivery Tracker

A full-stack, enterprise-grade logistics and delivery management platform. Built to support dynamic parcel pricing engines, intelligent driver auto-assignment, real-time tracking with immutable audit trails, multi-role portal experiences (Admin, Dispatcher, Delivery Agent, Warehouse, Customer), failed delivery recovery, and Brevo transactional notifications.

---

## 🌐 Live Hosted Deployments & Links

| Service | URL |
|---|---|
| **Frontend Application (Vercel)** | [https://last-mile-delivery-11622.vercel.app](https://last-mile-delivery-11622.vercel.app) |
| **Backend API (Render)** | [https://last-mile-delivery-tracker-ahmz.onrender.com](https://last-mile-delivery-tracker-ahmz.onrender.com) |
| **GitHub Repository** | [https://github.com/metarya07/last-mile-delivery-tracker](https://github.com/metarya07/last-mile-delivery-tracker) (Branch: `main`) |
| **System Design Document** | [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) (618 words, covering pricing, zones, dispatch, and failed deliveries) |

---

## 🔑 Quick Demo Credentials (1-Click Login Available)

The application includes pre-seeded accounts for every role:

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Administrator** | `admin@lastmile.com` | `password123` | Full system control, rate cards & zones, audit logs, override statuses |
| **Dispatcher / Ops** | `dispatcher@lastmile.com` | `password123` | Live dispatch desk, auto-assignment, agent allocation, runs |
| **Delivery Agent** | `agent@lastmile.com` | `password123` | Duty toggle, milestone updates (Picked Up &rarr; Delivered/Failed), POD |
| **Warehouse Staff** | `warehouse@lastmile.com` | `password123` | Inbound package intake, zone sorting, hub transfer management |
| **Customer** | `customer@lastmile.com` | `password123` | Self-booking with instant fare engine, live tracking, reschedule failed attempts |

---

## 🎯 Key Capabilities & Core Workflows

1. **Dynamic Rate Calculation Engine**:
   - **Volumetric Weight**: Calculated using the international logistics standard:
     $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{5000}$$
   - **Chargeable Weight**: Evaluates the higher of actual weight vs. volumetric weight:
     $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
   - **Directional Route Matrix**: Dynamic lookup matching `pickupZoneId`, `dropZoneId`, and `orderType` (`B2B` or `B2C`).
   - **Base Charge**: Calculated as $\max(\text{Chargeable Weight} \times \text{Rate Per Kg}, \text{Minimum Charge})$.
   - **COD Surcharge**: Admin-configurable surcharge applied when payment type is `COD`.
   - **Real-Time Pre-Booking Estimate**: Computes complete fare breakdowns before order placement without hardcoded constants.

2. **Intelligent Driver Auto-Assignment**:
   - Evaluates active online fleet agents (`role = DELIVERY_AGENT` and `available = TRUE`).
   - Matches driver preferred operating territory against the order pickup zone.
   - Load balances across active delivery queues to minimize transit latency.

3. **Immutable Tracking & Audit History**:
   - Every status transition creates an immutable record in `order_tracking_history` logging the exact timestamp, actor ID, and actor role.

4. **Failed Delivery Recovery & Self-Service Rescheduling**:
   - Agents record structured failure reasons (*Customer Unavailable*, *Address Incomplete*, *Access Denied*).
   - Customers receive notifications with a direct self-service link to select a new delivery date and notes.
   - The order transitions to `RESCHEDULED`, unassigns the previous agent, and re-enters the dispatch queue for fresh allocation.

5. **Multi-Channel Notifications (Brevo HTTPS REST API + SMS)**:
   - Dispatches branded responsive HTML emails for password reset OTPs, order placement confirmations, and live shipment milestone updates.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Java 26 / 21, Spring Boot 4 / 3.4+, Spring Security 6 (Stateless JWT + RBAC), Spring Data JPA, Hibernate 7, Flyway Database Migrations |
| **Frontend** | React 19, Vite, Responsive Vanilla CSS Design System (320px to 1920px), SVG Icon System |
| **Database** | MySQL 8.0+ / PostgreSQL compatible (Flyway migrations V1 &ndash; V7) |
| **Notifications** | Brevo HTTPS REST API (Port 443) & Brevo Transactional SMS |
| **Deployment** | Vercel (Frontend), Render Docker/JVM (Backend) |

---

## 🚀 Local Setup & Installation

### Prerequisites
- Java 21 or Java 26 SDK installed (`java -version`)
- Node.js 20+ and npm installed (`node -v`)
- MySQL 8.0+ running on `localhost:3306`

### 1. Database Setup
```sql
CREATE DATABASE last_mile_delivery;
```
*(Flyway automatically applies all schema migrations: V1 base schema through V7 demo accounts and zone seed data).*

### 2. Backend Setup
```bash
cd backend
```
Copy `.env.example` to `.env` or set environment variables:
```bash
# Windows PowerShell
cp ../.env.example .env

# Run Spring Boot backend
.\mvnw spring-boot:run
```

Run test suite:
```bash
.\mvnw test
```
*(All 23 unit and integration tests will pass).*

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
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated user profile & permissions |
| `POST` | `/api/auth/forgot-password` | Public | Generate & dispatch 6-digit HTML OTP email |
| `POST` | `/api/auth/verify-otp` | Public | Verify OTP code |
| `POST` | `/api/auth/reset-password` | Public | Reset account password with valid OTP |

### 2. Orders & Tracking Lifecycle (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer / Admin | Book order (Admin can pass `customerId` to book on behalf) |
| `GET` | `/api/orders` | Authenticated | Fetch orders by role (Customer: own, Agent: assigned, Admin: all) |
| `GET` | `/api/orders/{id}` | Authenticated | Retrieve order details & pricing breakdown |
| `PATCH` | `/api/orders/{id}/status` | Agent / Admin | Update status (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) |
| `POST` | `/api/orders/{id}/assign/{agentId}` | Admin / Dispatcher | Manually assign order to delivery agent |
| `POST` | `/api/orders/{id}/auto-assign` | Admin / Dispatcher | Auto-allocate nearest & least-loaded online agent |
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

## 🧮 Rate Calculation Example Walkthrough

Consider a parcel booked between **Zone 1 (North)** and **Zone 2 (South)**:
- **Dimensions**: Length = 40 cm, Width = 30 cm, Height = 25 cm
- **Actual Weight**: 4.00 kg
- **Order Type**: B2C
- **Payment Type**: COD

### Step-by-Step Calculation:
1. **Volumetric Weight**:
   $$\text{Volumetric Weight} = \frac{40 \times 30 \times 25}{5000} = \frac{30,000}{5000} = 6.000\text{ kg}$$

2. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(4.000\text{ kg}, 6.000\text{ kg}) = 6.000\text{ kg}$$

3. **Rate Card Lookup**:
   - Route: Zone 1 &rarr; Zone 2 (B2C)
   - Configured `ratePerKg` = ₹35.00, `minimumCharge` = ₹70.00

4. **Base Charge**:
   $$\text{Base Charge} = \max(6.000 \times 35.00, 70.00) = \text{₹}210.00$$

5. **COD Surcharge**:
   - Configured COD surcharge for B2C = ₹30.00

6. **Final Total Billable Amount**:
   $$\text{Total Charge} = \text{₹}210.00 + \text{₹}30.00 = \textbf{₹240.00}$$

---

## 🧪 Test Suite & Verification Results

```bash
cd backend
.\mvnw test
```

**JUnit 5 Test Results**:
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
