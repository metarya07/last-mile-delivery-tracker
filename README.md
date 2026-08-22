# 📦 Last-Mile Delivery Tracker

A full-stack, enterprise-grade logistics and delivery management platform. Built to support dynamic parcel pricing engines, intelligent driver assignment, real-time tracking with immutable audit trails, multi-role portal experiences, customer delivery rescheduling, and partner verification workflows.

---

## 🌐 Hosted Deployment

- **Frontend Application (Vercel)**: [https://last-mile-delivery-frontend.vercel.app](https://last-mile-delivery-frontend.vercel.app)
- **Repository**: [https://github.com/metarya07/last-mile-delivery-tracker](https://github.com/metarya07/last-mile-delivery-tracker)

---

## 🎯 Key Capabilities & Features

1. **Multi-Role Portal Experience**:
   - **Customer Portal**: Self-registration, interactive fare calculator preview, order booking desk, live order tracking timeline, failed delivery rescheduling, and "Become a Delivery Partner" application workflow.
   - **Delivery Partner Portal**: Real-time package queue, active run management, 1-click availability toggle, milestone progression (Picked Up &rarr; In Transit &rarr; Out for Delivery &rarr; Delivered / Failed with reason), and delivery history.
   - **Admin Control Center**: Operations dashboard, centralized order registry, pending dispatch queue, manual and intelligent **auto-assignment**, zone & area hierarchy manager, dynamic B2B/B2C rate card editor, COD surcharge configurator, partner application reviews with instant role promotion, and audit trail inspector.

2. **Dynamic Rate Calculation Engine**:
   - **Volumetric Weight**: Calculated using the international air/road standard formula:
     $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{5000}$$
   - **Chargeable Weight**: Evaluates the higher of actual gross weight vs. volumetric weight:
     $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
   - **Route Rate Card Lookup**: Dynamic matrix lookup matching `pickupZoneId`, `dropZoneId`, and `orderType` (`B2B` or `B2C`).
   - **Base Charge**: Calculated as $\max(\text{Chargeable Weight} \times \text{Rate Per Kg}, \text{Minimum Charge})$.
   - **COD Surcharge**: Admin-configurable surcharge added when payment type is `COD`.
   - **Pre-Booking Estimate**: Fare breakdown preview is computed in real-time before order placement.

3. **Intelligent Driver Auto-Assignment**:
   - Analyzes available fleet agents based on operating zone preference (preferred area match) and load balances against current active delivery queues.

4. **Immutable Tracking & Audit History**:
   - Every status transition creates a permanent tracking record capturing the exact timestamp, actor ID, and actor name.

5. **Failed Delivery Recovery & Rescheduling**:
   - Delivery agents record failure reasons on unsuccessful attempts.
   - Customers receive notifications and can select a retry date and delivery instructions. The order resets to `RESCHEDULED` and unassigns the driver for fresh dispatch.

6. **Email & SMS Notifications**:
   - Triggered on order creation, status transitions, delivery attempts, and password reset OTPs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Java 26 / 21, Spring Boot 3.4+, Spring Security 6 (Stateless JWT), Spring Data JPA, Hibernate, Flyway Database Migrations |
| **Frontend** | React 19, Vite, Modern Vanilla CSS Design System with responsive breakpoints (320px to 1920px), SVG Icon Library |
| **Database** | MySQL 8.0+ / PostgreSQL compatible |
| **Notifications** | Brevo SMTP (Email) & Brevo Transactional SMS API |
| **Deployment** | Vercel (Frontend), Docker / JVM (Backend) |

---

## 🚀 Local Setup & Installation

### Prerequisites
- Java 21 or Java 26 SDK installed (`java -version`)
- Node.js 20+ and npm installed (`node -v`)
- MySQL 8.0+ running on `localhost:3306`

### 1. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE last_mile_delivery;
```
*(Flyway automatically applies all 4 schema migrations: V1 base tables, V2 zones & rate cards, V3 tracking & attempts, V4 partner applications).*

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```
Create an `application-local.properties` or `.env` file (or set environment variables):
```properties
# Backend Environment Configuration
server.port=8080
CORS_ALLOWED_ORIGIN=http://localhost:5173
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_EXPIRATION=86400000

# MySQL
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
spring.datasource.url=jdbc:mysql://localhost:3306/last_mile_delivery?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata

# Brevo Email & SMS (Optional for local testing)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USERNAME=your_brevo_smtp_username
BREVO_SMTP_PASSWORD=your_brevo_smtp_password
BREVO_FROM_EMAIL=dispatch@lastmiledelivery.com
BREVO_API_KEY=your_brevo_api_key
BREVO_SMS_SENDER=LASTMILE
```

Run the backend:
```bash
# Windows
.\mvnw spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

Run tests:
```bash
.\mvnw test
```

### 3. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
npm install
```

Configure `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8080
```

Start the Vite development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🗄️ Database Schema & Entity Architecture

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

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer account |
| `POST` | `/api/auth/login` | Public | Sign in with email & password, returns JWT token |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated user profile & role |
| `POST` | `/api/auth/forgot-password` | Public | Generate & dispatch 6-digit password reset OTP |
| `POST` | `/api/auth/verify-otp` | Public | Validate reset OTP |
| `POST` | `/api/auth/reset-password` | Public | Set new password with verified OTP |

### 2. Orders & Tracking (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer / Admin | Book order (Admin can pass `customerId` to book on behalf) |
| `GET` | `/api/orders` | Authenticated | Get user's orders (Customer: own, Agent: assigned, Admin: all) |
| `GET` | `/api/orders/{id}` | Authenticated | Get single order details |
| `PATCH` | `/api/orders/{id}/status` | Agent / Admin | Transition status (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) |
| `POST` | `/api/orders/{id}/assign/{agentId}` | Admin | Manually assign order to online delivery agent |
| `POST` | `/api/orders/{id}/auto-assign` | Admin | Intelligently assign nearest/least-loaded agent |
| `POST` | `/api/orders/{id}/reschedule` | Customer / Admin | Reschedule a `FAILED` order for a new delivery attempt |
| `GET` | `/api/orders/{id}/tracking` | Authenticated | Fetch full immutable tracking audit timeline |
| `GET` | `/api/orders/{id}/attempts` | Authenticated | Fetch delivery attempt records and failure reasons |

### 3. Rate Calculation Engine & Zones (`/api`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/rates/estimate` | Public / Auth | Live pre-booking rate estimate from dimensions & weight |
| `GET` | `/api/zones` | Public / Auth | List all zones with assigned geographic areas |
| `POST` | `/api/zones` | Admin | Create a new delivery zone |
| `POST` | `/api/zones/{id}/areas` | Admin | Assign an area or neighborhood to a zone |
| `GET` | `/api/rates` | Admin | List all configured rate cards |
| `POST` | `/api/rates` | Admin | Create or update an intra/inter-zone rate card |
| `PUT` | `/api/rates/{id}` | Admin | Edit an existing rate card |
| `GET` | `/api/rates/cod` | Admin | List COD surcharge rules |
| `PUT` | `/api/rates/cod` | Admin | Update COD surcharge per order type |

### 4. Delivery Partner Applications (`/api/delivery-partner-applications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/delivery-partner-applications` | Customer | Submit "Become a Delivery Partner" application |
| `GET` | `/api/delivery-partner-applications/my` | Customer | Check applicant's review status |
| `GET` | `/api/delivery-partner-applications` | Admin | View all partner applications |
| `POST` | `/api/delivery-partner-applications/{id}/approve` | Admin | Approve application & promote user to `DELIVERY_AGENT` |
| `POST` | `/api/delivery-partner-applications/{id}/reject` | Admin | Reject application with reason |

### 5. Fleet & User Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/agents` | Admin | List all registered delivery agents and duty status |
| `PATCH` | `/api/users/availability` | Delivery Agent | Toggle duty status (Online / Offline) |

---

## 🧮 Rate Calculation Logic Example

Consider an order booked between **Zone 1 (North)** and **Zone 2 (South)**:
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

6. **Final Total Charge**:
   $$\text{Total Charge} = \text{₹}210.00 + \text{₹}30.00 = \textbf{₹240.00}$$

---

## 🧪 Test Suite & Verification

The project includes an automated JUnit 5 / Spring Boot test suite covering:
- Rate calculation engine logic (volumetric divisor, chargeable weight comparison, minimum charge enforcement, COD surcharge rules).
- Role-based authorization and security filters.
- Partner application validation and role promotion workflows.
- Immutable tracking audit logging.

Run backend tests:
```bash
cd backend
.\mvnw test
```
Result: **11/11 tests pass (100% success rate)**.
