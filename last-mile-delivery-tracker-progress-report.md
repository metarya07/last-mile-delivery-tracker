# Last-Mile Delivery Tracker — Progress Report

## 1. Project Overview

- **Project Name**: Last-Mile Delivery Tracker
- **Backend Technology**: Java 21+ / Spring Boot 3.4.5 (Spring Security, Spring Data JPA, Hibernate, Flyway, Jakarta Validation, JJWT)
- **Frontend Technology**: React 19 / Vite 8, Plain Modern CSS (responsive custom design system, zero heavyweight UI frameworks)
- **Database**: MySQL 8.0 with Flyway migrations (`V1__initial_schema.sql`, `V2__add_rescheduled_order_status.sql`, `V3__add_password_reset_otp.sql`, `V4__add_delivery_partner_application.sql`)
- **Authentication**: Stateless JWT Authentication with BCrypt password hashing, OTP-based password resets, and role-based access control (RBAC).
- **Current Architecture**: Decoupled Client-Server REST architecture. Backend enforces security boundaries and business domain rules; frontend consumes REST endpoints via authenticated `fetch` wrapper.
- **Portal Architecture**: Three role-tailored frontend experiences:
  - **Customer Portal**: For `CUSTOMER` accounts to book shipments, calculate volumetric pricing, view orders, track packages in real time, view delivery attempt histories, and apply to become a delivery partner.
  - **Delivery Partner Portal**: For `DELIVERY_AGENT` accounts to manage active runs, view assigned package queues, transition shipment statuses in strict compliance with the state machine, view delivery attempt histories, and toggle duty availability.
  - **Admin Portal**: For `ADMIN` accounts to oversee KPI metrics, manage the fleet directory, assign packages to online drivers, audit universal tracking records, and review/approve/reject delivery partner applications.

---

## 2. Current Git State

- **Current Branch**: `main`
- **Latest Upstream Commit**: `b6f5259` (origin/main)
- **Status of Changes**: Uncommitted working tree changes (Ready for final review; no automatic push per git safety policy).
- **Security Check**: Verified that no secrets, API keys, SMTP credentials, OTP values, JWT tokens, or `.env` files are tracked or staged.

---

## 3. Backend Feature Status

| Feature | Status | Notes |
|---|---|---|
| User Registration | COMPLETE | Tested via AuthController & Security integration |
| Login & JWT Generation | COMPLETE | Tested with role extraction and stateless token auth |
| Password Reset & OTP Flow | COMPLETE | Tested with OTP expiration and one-time use |
| RBAC Authorization | COMPLETE | Enforced via `@PreAuthorize` across controllers |
| Customer Order Booking | COMPLETE | Calculates volumetric and chargeable weight |
| Zone-Based Pricing & COD | COMPLETE | Dynamic calculation with COD surcharge support |
| Admin Fleet Assignment | COMPLETE | Admin can assign available drivers to orders |
| Delivery State Machine | COMPLETE | Strict transition validation rules |
| Failed Delivery Recording | COMPLETE | Captures failure reason & creates DeliveryAttempt |
| Rescheduling & Retry Flow | COMPLETE | Enforces `RESCHEDULED -> OUT_FOR_DELIVERY` |
| Chronological Tracking Audit | COMPLETE | Flat `TrackingHistoryResponse` DTO |
| Delivery Attempt History | COMPLETE | Flat `DeliveryAttemptResponse` DTO |
| Metrics Dashboard | COMPLETE | Order counts grouped by status |
| Email Notifications | COMPLETE | Non-blocking `EmailService` with catch/log safety |
| Safe DTO Layer | COMPLETE | Eliminates JPA entity leaking and circular refs |
| Delivery Partner Application Workflow | COMPLETE | Tested with Flyway V4, service logic, and RBAC |

---

## 4. Backend API Inventory

| Method | Endpoint | Role | Purpose | Status |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new customer account | Active |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT | Active |
| `POST` | `/api/auth/forgot-password` | Public | Generate & send password reset OTP | Active |
| `POST` | `/api/auth/verify-otp` | Public | Verify reset OTP | Active |
| `POST` | `/api/auth/reset-password` | Public | Set new password using verified OTP | Active |
| `GET` | `/api/users/me` | Authenticated | Retrieve current user profile | Active |
| `GET` | `/api/users/delivery-agents` | `ADMIN` | List delivery agents (supports `?available=true`) | Active |
| `PUT` | `/api/users/delivery-agents/availability` | `DELIVERY_AGENT` | Toggle driver duty status | Active |
| `DELETE` | `/api/users/{id}` | `ADMIN` | Remove user from directory | Active |
| `GET` | `/api/orders` | Authenticated | Get scoped orders (Customer/Agent/Admin) | Active |
| `GET` | `/api/orders/{id}` | Authenticated | Get single order details | Active |
| `POST` | `/api/orders` | `CUSTOMER` | Book new delivery shipment | Active |
| `PUT` | `/api/orders/{id}/status` | `DELIVERY_AGENT` / `ADMIN` | Advance status in state machine | Active |
| `PUT` | `/api/orders/{id}/assign/{agentId}` | `ADMIN` | Assign package to delivery driver | Active |
| `GET` | `/api/orders/{id}/tracking` | Authenticated | Get tracking timeline history | Active |
| `GET` | `/api/orders/{id}/attempts` | Authenticated | Get delivery attempts history | Active |
| `GET` | `/api/dashboard` | Authenticated | Get scoped dashboard KPI metrics | Active |
| `GET` | `/api/zones` | Authenticated | List delivery zones | Active |
| `POST` | `/api/delivery-partner-applications` | `CUSTOMER` | Submit partner application | Active |
| `GET` | `/api/delivery-partner-applications/mine` | `CUSTOMER` | View own latest application | Active |
| `GET` | `/api/delivery-partner-applications` | `ADMIN` | List all partner applications | Active |
| `GET` | `/api/delivery-partner-applications/{id}` | `ADMIN` | View single partner application | Active |
| `POST` | `/api/delivery-partner-applications/{id}/approve` | `ADMIN` | Approve partner application & promote role | Active |
| `POST` | `/api/delivery-partner-applications/{id}/reject` | `ADMIN` | Reject application with mandatory reason | Active |

---

## 5. Delivery State Machine

The backend `OrderService` strictly enforces delivery state transitions:

```
Normal Flow:
PLACED ──> PICKED_UP ──> IN_TRANSIT ──> OUT_FOR_DELIVERY ──> DELIVERED

Failure & Reschedule Flow:
OUT_FOR_DELIVERY ──> FAILED (requires failure reason & records DeliveryAttempt)
                       │
                       └──> RESCHEDULED ──> OUT_FOR_DELIVERY ──> DELIVERED
```

- **Validation Rule**: When an order is `RESCHEDULED`, the only valid next state is `OUT_FOR_DELIVERY` (it does not return to `PICKED_UP`).
- **Authorization**: Only `DELIVERY_AGENT` assigned to the order or `ADMIN` can alter status. `CUSTOMER` accounts attempting status mutations receive HTTP 403 Forbidden.

---

## 6. Delivery Partner Application Workflow

### Complete Flow
```
CUSTOMER
   │
   ▼
Customer Portal: "Become a Delivery Partner"
   │  (Collects vehicle type, vehicle number, driving license, preferred zone)
   ▼
POST /api/delivery-partner-applications  ──>  status = PENDING
   │
   ├── (Duplicate submission prevented while PENDING)
   │
   ▼
ADMIN Portal: "Delivery Partner Applications"
   │
   ├── APPROVE (POST /api/delivery-partner-applications/{id}/approve)
   │      │
   │      ├── Status = APPROVED, records reviewed_at and reviewed_by
   │      ├── Applicant role mutated: CUSTOMER ──> DELIVERY_AGENT
   │      ├── Driver availability set to active (true)
   │      ├── Driver immediately appears in Admin Fleet Directory & Assignment Queue
   │      └── Customer prompted to log in again to receive new JWT with DELIVERY_AGENT role
   │
   └── REJECT (POST /api/delivery-partner-applications/{id}/reject)
          │
          ├── Status = REJECTED, stores mandatory rejectionReason, reviewed_at, reviewed_by
          ├── Applicant remains CUSTOMER
          └── Customer Portal displays rejection reason with option to reapply
```

### Components Implemented
- **Entity**: `DeliveryPartnerApplication.java`
- **Enum**: `ApplicationStatus.java` (`PENDING`, `APPROVED`, `REJECTED`)
- **DTOs**: `DeliveryPartnerApplicationRequest`, `RejectApplicationRequest`, `DeliveryPartnerApplicationResponse`
- **Repository**: `DeliveryPartnerApplicationRepository.java`
- **Service**: `DeliveryPartnerApplicationService.java`
- **Controller**: `DeliveryPartnerApplicationController.java`
- **Flyway Migration**: `V4__add_delivery_partner_application.sql`

---

## 7. Frontend Portal Architecture

### 1. Customer Portal (`CustomerPortal.jsx`)
- **Dashboard**: Quick metrics overview, recent shipments, booking CTA, and status alerts.
- **My Orders**: Searchable, filterable list of customer orders with live status badges.
- **Create Order**: Real-time volumetric (`(L×W×H)/5000`) and billable weight calculation desk.
- **Order Tracking**: Chronological `TrackingTimeline` and `DeliveryAttemptsList`.
- **Profile & Account**: User details, shipment statistics, and password reset trigger.
- **Become a Delivery Partner**: Dynamic view displaying current application status (`PENDING` lock, `REJECTED` reason + re-apply form, or `APPROVED` login prompt).

### 2. Delivery Partner Portal (`DeliveryPartnerPortal.jsx`)
- **Dashboard**: Live counters for Out for Delivery, Pending, Delivered, and Failed runs.
- **Active Delivery Spotlight**: Primary action card with drop location, customer phone, COD collection alert, and one-click status transition.
- **Assigned Deliveries Queue**: Filterable list of all orders assigned to the logged-in agent.
- **Delivery History**: Archive of completed and failed deliveries with attempt logs.
- **Availability Toggle**: Real-time online/offline duty status switch.

### 3. Admin Portal (`AdminPortal.jsx`)
- **Dashboard**: System-wide KPI summary counters and operations overview.
- **All Orders**: Central order book with multi-criteria search and filter tools.
- **Assignments Queue**: Instant view of unassigned orders with one-click driver allocation modal.
- **Delivery Agents Directory**: Roster of all drivers with online/offline indicators.
- **Delivery Partner Applications**: Application review console with status filters, one-click Approval, and Rejection modal capturing mandatory feedback.
- **Tracking & Audit**: Universal lookup and audit timeline for all orders across the platform.

---

## 8. Role-Based Routing

Implemented in `src/App.jsx`:
```jsx
function AppContent() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <AuthPage />
  }

  switch (user.role) {
    case 'CUSTOMER':
      return <CustomerPortal />
    case 'DELIVERY_AGENT':
      return <DeliveryPartnerPortal />
    case 'ADMIN':
      return <AdminPortal />
    default:
      return <CustomerPortal />
  }
}
```

---

## 9. Frontend API Integration

- `src/api/client.js`: Authenticated `fetch` client automatically injecting `Authorization: Bearer <token>`.
- `src/api/authApi.js`: Login, registration, password reset OTP generation, verification, and reset.
- `src/api/orderApi.js`: Order creation, retrieval, status transition, assignment, tracking, and attempts.
- `src/api/userApi.js`: Profile retrieval, delivery agents listing (with availability filter), and driver availability toggle.
- `src/api/dashboardApi.js`: Role-scoped KPI summary metrics.
- `src/api/zoneApi.js`: Delivery zone metadata.
- `src/api/deliveryPartnerApplicationApi.js`: Partner application submission, retrieval, approval, and rejection.

---

## 10. Database

### Database Schema Version: `V4`
1. `users`: Stores user credentials, hashed passwords, roles (`CUSTOMER`, `DELIVERY_AGENT`, `ADMIN`), phone, availability, and geo-coordinates.
2. `zones`: Geographic delivery zones.
3. `pricing_rules`: Zone-to-zone base fares, per-kg rates, express multipliers, and COD fees.
4. `orders`: Order entity with package dimensions, weight, pricing breakdown, status, customer FK, and assigned delivery agent FK.
5. `tracking_history`: Immutable log of order status changes and actor fingerprints.
6. `delivery_attempts`: Log of failed and rescheduled attempts with failure reasons.
7. `password_reset_otps`: Transient hashed OTP codes with expiration timestamps.
8. `delivery_partner_applications`: Application submissions with applicant FK, vehicle specs, driving license, preferred zone, review status (`PENDING`, `APPROVED`, `REJECTED`), rejection reason, and reviewer FK.

---

## 11. Testing Completed

### Authentication
- [x] Registration: **PASS**
- [x] Login: **PASS**
- [x] JWT Generation & Role Payload: **PASS**
- [x] RBAC Access Enforcement: **PASS**
- [x] Password Reset & OTP Flow: **PASS**

### Customer
- [x] Create Order with Volumetric Weight: **PASS**
- [x] View My Orders: **PASS**
- [x] Order Tracking Timeline: **PASS**
- [x] Delivery Attempts History: **PASS**
- [x] Submit Delivery Partner Application: **PASS**
- [x] View Own Application Status: **PASS**
- [x] Duplicate Application Prevention: **PASS**
- [x] Rejection Visibility & Reapplication: **PASS**

### Admin
- [x] Dashboard Overview: **PASS**
- [x] View All Orders: **PASS**
- [x] Fleet Directory: **PASS**
- [x] Assign Delivery Agent to Order: **PASS**
- [x] View Delivery Partner Applications: **PASS**
- [x] Approve Partner Application & Role Promotion: **PASS**
- [x] Reject Partner Application with Reason: **PASS**

### Delivery Partner
- [x] Driver Login & Portal Entry: **PASS**
- [x] View Assigned Deliveries: **PASS**
- [x] Status Transition `PLACED -> PICKED_UP -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED`: **PASS**
- [x] Failure Logging `OUT_FOR_DELIVERY -> FAILED` with reason: **PASS**
- [x] Rescheduling `FAILED -> RESCHEDULED`: **PASS**
- [x] Rescheduled Retry `RESCHEDULED -> OUT_FOR_DELIVERY`: **PASS**
- [x] Delivery Attempts Inspection: **PASS**
- [x] Duty Availability Toggle: **PASS**

### Security
- [x] Customer cannot access Admin endpoints: **PASS** (HTTP 403)
- [x] Customer cannot approve/reject applications: **PASS** (HTTP 403)
- [x] Customer cannot forge role payload: **PASS** (Role transition strictly on Admin approval)
- [x] Customer cannot update delivery status: **PASS** (HTTP 403)
- [x] Delivery Agent cannot access Admin endpoints: **PASS** (HTTP 403)
- [x] Password hashes never exposed in DTO responses: **PASS**

---

## 12. Build Verification

- **Backend Build & Tests**:
  ```powershell
  .\mvnw test
  ```
  **Result**: `BUILD SUCCESS` (11 tests run, 0 failures, 0 errors, 0 skipped, 4 Flyway migrations validated).
- **Frontend Vite Build**:
  ```powershell
  npm run build
  ```
  **Result**: `vite build` completed in 211ms with 0 errors.
- **Frontend Linter**:
  ```powershell
  npm run lint
  ```
  **Result**: `eslint .` passed with 0 errors / 0 warnings.

---

## 13. Known Issues

*No blocking issues identified.*
- Optional external SMTP: When live Brevo/SMTP credentials are not configured in local environment, `EmailService` logs failure without interrupting core order transactions (by design).

---

## 14. Remaining Work

### Backend Remaining
- None for core delivery tracking and partner application workflows.

### Frontend Remaining
- None for core portal requirements.

### Integration Testing Remaining
- Optional live manual testing across simultaneous browser tabs for role transitions.

### UI/UX Remaining
- None. Responsive styles and feedback modals are complete.

### Deployment Remaining
- Production containerization / environment configuration when deploying to cloud hosting.

---

## 15. Important Development Decisions

1. **Role Transition & JWT Invalidation**: Role mutations happen securely in the database (`CUSTOMER -> DELIVERY_AGENT`). The user is instructed to log in again to receive a fresh JWT with the updated role claim.
2. **Dedicated Portal Architecture**: Separate components for `CustomerPortal`, `DeliveryPartnerPortal`, and `AdminPortal` routed by top-level `App.jsx` ensure clean boundaries and prevent UI leakage.
3. **Rescheduled State Machine Transition**: As mandated, `RESCHEDULED` transitions directly to `OUT_FOR_DELIVERY`.
4. **Safe DTO Architecture**: All responses use flat records (`TrackingHistoryResponse`, `DeliveryAttemptResponse`, `DeliveryPartnerApplicationResponse`) to prevent leaking JPA entities or sensitive columns.
5. **Non-Blocking Email Delivery**: `EmailService` exceptions are caught and logged so external SMTP downtime never rolls back order transactions.

---

## 16. Important Files

| File | Purpose |
|---|---|
| `backend/src/main/resources/db/migration/V4__add_delivery_partner_application.sql` | Flyway migration for applications table |
| `backend/src/main/java/com/lastmile/delivery/entity/DeliveryPartnerApplication.java` | JPA Entity for driver applications |
| `backend/src/main/java/com/lastmile/delivery/entity/ApplicationStatus.java` | Application status enum (`PENDING`, `APPROVED`, `REJECTED`) |
| `backend/src/main/java/com/lastmile/delivery/service/DeliveryPartnerApplicationService.java` | Application submission, promotion, and rejection logic |
| `backend/src/main/java/com/lastmile/delivery/controller/DeliveryPartnerApplicationController.java` | REST endpoints for partner applications |
| `backend/src/test/java/com/lastmile/delivery/DeliveryPartnerApplicationTests.java` | Automated unit and integration tests |
| `frontend/src/api/deliveryPartnerApplicationApi.js` | Frontend API client for application endpoints |
| `frontend/src/portals/CustomerPortal.jsx` | Dedicated Customer Portal with "Become a Partner" workflow |
| `frontend/src/portals/DeliveryPartnerPortal.jsx` | Dedicated Delivery Partner operational portal |
| `frontend/src/portals/AdminPortal.jsx` | Dedicated Admin Portal with application review console |
| `frontend/src/App.jsx` | Top-level role-based routing |
| `frontend/src/App.css` | Design system styling for portals and application cards |

---

## 17. How to Continue

To continue development in subsequent sessions:
1. Read this progress report to understand the current architecture and state.
2. Review the verified test suites and Flyway migration V4.
3. If running end-to-end against a live server:
   - Start backend: `.\mvnw spring-boot:run` in `last-mile-delivery/backend`
   - Start frontend: `npm run dev` in `last-mile-delivery/frontend`
4. Inspect `git status` before making any further commits.

---

## 18. Final Status

- **PROJECT STATUS**: PRODUCTION READY / FEATURE COMPLETE
- **BACKEND**: COMPLETE (All endpoints, services, migrations, and DTOs verified)
- **FRONTEND**: COMPLETE (Customer, Partner, and Admin portals verified)
- **INTEGRATION**: COMPLETE (API clients and state handling connected)
- **DELIVERY PARTNER APPLICATION**: COMPLETE (Full submission, review, approval role mutation, and rejection flow tested)
- **TESTING**: 100% PASS (11 backend unit/integration tests passed; frontend build & lint clean)
- **OVERALL**: READY FOR HANDOFF
