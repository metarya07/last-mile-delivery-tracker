# System Design Document: Last-Mile Delivery Platform

## 1. Rate Calculation Engine Architecture

The Rate Calculation Engine computes volumetric-aware shipping charges dynamically without hardcoded constants. Pricing rules, minimum thresholds, and surcharges are administered via relational rate cards.

```
[Parcel Input: L, W, H, Weight, Zones, B2B/B2C, Payment Type]
                          │
                          ▼
            [Volumetric Weight Computation]
            Vol_Weight = (L × W × H) / 5000
                          │
                          ▼
            [Chargeable Weight Assessment]
            Chargeable_Weight = MAX(Actual_Weight, Vol_Weight)
                          │
                          ▼
            [Route Rate Card Matrix Lookup]
            Match (pickup_zone_id, drop_zone_id, order_type)
                          │
                          ▼
            [Base Transportation Charge]
            Base_Charge = MAX(Chargeable_Weight × rate_per_kg, minimum_charge)
                          │
                          ▼
            [Payment Surcharge Evaluation]
            Final_Charge = Base_Charge + (PaymentType == COD ? CodSurcharge : 0)
```

### Mathematical Formulation
1. **Volumetric Weight**:
   $$\text{Volumetric Weight (kg)} = \frac{L \times W \times H}{5000}$$
2. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(\text{Actual Gross Weight}, \text{Volumetric Weight})$$
3. **Base Charge**:
   $$\text{Base Charge} = \max(\text{Chargeable Weight} \times \text{RatePerKg}, \text{MinimumCharge})$$
4. **Final Billable Total**:
   $$\text{Final Charge} = \text{Base Charge} + \mathbb{I}_{\text{COD}} \cdot \text{CodSurcharge}(\text{OrderType})$$

The engine provides an instant pre-booking endpoint (`/api/rates/estimate`) that returns itemized cost breakdowns (volumetric weight, chargeable weight, base rate, COD fee) before order persistence.

---

## 2. Zone Detection & Geographic Hierarchy Approach

Territory management is modeled as a two-tier relational hierarchy:
- **`zones`**: Primary logistical distribution hubs (e.g., North Hub, South Hub, Central Metro).
- **`zone_areas`**: Granular neighborhoods, postal localities, and zip corridors mapped to parent zones.
- **`rate_cards`**: Directional transit matrices defining pricing between origin `pickup_zone_id` and destination `drop_zone_id`.

```
+-------------------------------------------------------------------+
|                        RELATIONAL ZONE HIERARCHY                  |
|                                                                   |
|   Zone: North Hub (ID: 1)         Zone: South Hub (ID: 2)         |
|   ├── Area: Connaught Place       ├── Area: Koramangala           |
|   └── Area: Rohini Sector 10      └── Area: Indiranagar           |
|                                                                   |
|   [Route Matrix: Zone 1 -> Zone 2 | B2C | ₹35/kg | Min: ₹70]      |
+-------------------------------------------------------------------+
```

### Directional & Corridor Logic
- **Intra-Zone Routing**: When $\text{pickup\_zone\_id} = \text{drop\_zone\_id}$, intra-hub local rates apply with lower base costs and reduced minimum charges.
- **Inter-Zone Routing**: When $\text{pickup\_zone\_id} \neq \text{drop\_zone\_id}$, cross-corridor rates reflect trunk-line haulage overhead.
- **B2B vs. B2C Tiering**: B2B accounts enforce higher bulk weight minimums with lower marginal per-kg rates; B2C rates provide flexible single-parcel pricing.

All geographic mappings and tariffs are fully managed by administrators at runtime without code deployment or schema migrations.

---

## 3. Intelligent Fleet Auto-Assignment Engine

Dispatch optimization allocates unassigned shipments using a deterministic multi-criteria scoring algorithm:

$$\text{Score}(A, O) = w_1 \cdot \text{TerritoryMatch}(A, O) + w_2 \cdot \text{WorkloadCapacity}(A)$$

```
[Unassigned Order Placed / Rescheduled]
                 │
                 ▼
  [Filter Online & Available Fleet Agents]
  (role = DELIVERY_AGENT AND available = TRUE)
                 │
                 ▼
     [Territory Proximity Matching]
  (Agent Preferred Area matches Order Pickup Zone)
                 │
                 ▼
        [Queue Load Balancing]
  (Sort by fewest active deliveries: IN_PROGRESS < Threshold)
                 │
                 ▼
       [Atomic Driver Assignment]
  (Set delivery_agent_id + Write Immutable Audit History)
```

1. **Fleet Candidate Filtering**: Identifies active personnel with `role = DELIVERY_AGENT` and duty state `available = TRUE`.
2. **Territory Matching**: Prioritizes drivers whose verified operating sector aligns with the parcel's pickup zone.
3. **Queue Balancing**: Among matching candidates, assigns the driver with the lowest count of concurrent active deliveries (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`), preventing driver saturation.
4. **Audit Immutability**: Writes an atomic entry to `order_tracking_history`, capturing the actor ID, assigned agent, and assignment timestamp.

---

## 4. Failed Delivery & Self-Service Rescheduling Lifecycle

Deliveries encountering field impediments (e.g., customer unavailable, inaccessible address) trigger an automated exception workflow:

```
[Agent Marks Attempt FAILED + Captures Reason]
                      │
                      ▼
   [Persist DeliveryAttempt Ledger (Attempt #N)]
                      │
                      ▼
   [Dispatch Multi-Channel Alerts (Brevo HTTPS + SMS)]
                      │
                      ▼
[Customer Self-Service Portal -> Selects Reschedule Date]
                      │
                      ▼
    [Order State -> RESCHEDULED & Agent Unassigned]
                      │
                      ▼
   [Order Re-enters Dispatch Queue for Next-Day Allocation]
```

1. **Field Failure Capture**: The delivery agent records the failure state with structured metadata (*Customer Unavailable*, *Address Incomplete*, *Premises Locked*).
2. **Attempt Ledger**: An immutable record in `delivery_attempts` logs the attempt index, timestamp, driver ID, and reason.
3. **Automated Notification**: Brevo transactional emails and SMS deliver direct links to the customer self-service interface.
4. **Customer Rescheduling**: Customers select a new delivery window and submit revised access instructions without contacting support.
5. **Driver Reallocation**: The order transitions to `RESCHEDULED`, unbinds the previous driver, and re-enters the active dispatch pool for fresh allocation.
