# System Design Document: Last-Mile Delivery Tracker

## 1. Rate Calculation Engine Architecture

The Rate Calculation Engine calculates fair, volumetric-aware shipping charges dynamically without hardcoded constants.

```
[Parcel Input: L, W, H, Weight, Zones, B2B/B2C, COD]
                     │
                     ▼
         [Volumetric Calculation]
         Vol_Weight = (L × W × H) / 5000
                     │
                     ▼
         [Chargeable Weight Assessment]
         Chargeable_Weight = MAX(Actual_Weight, Vol_Weight)
                     │
                     ▼
         [Rate Card Matrix Lookup]
         Matches (PickupZone, DropZone, OrderType)
                     │
                     ▼
         [Base Charge Computation]
         Base_Charge = MAX(Chargeable_Weight × Rate_Per_Kg, Minimum_Charge)
                     │
                     ▼
         [Surcharge Engine (COD/Type)]
         Final_Charge = Base_Charge + COD_Surcharge
```

### Mathematical Formulation
1. **Volumetric Weight**:
   $$\text{Volumetric Weight (kg)} = \frac{L \times W \times H}{5000}$$
2. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(\text{Actual Gross Weight}, \text{Volumetric Weight})$$
3. **Base Charge**:
   $$\text{Base Charge} = \max(\text{Chargeable Weight} \times \text{RatePerKg}, \text{MinimumCharge})$$
4. **Final Charge**:
   $$\text{Final Charge} = \text{Base Charge} + \mathbb{I}_{\text{COD}} \times \text{CodSurcharge}(\text{OrderType})$$

The engine exposes a pre-booking estimation endpoint (`/api/rates/estimate`) that lets customers inspect full cost breakdowns (volumetric weight, chargeable weight, base rate, COD fee) prior to committing transactions.

---

## 2. Zone Detection & Geographic Hierarchy Approach

Zone management utilizes a relational geographic hierarchy:
- **`zones`**: Primary geographic hubs (e.g., North, South, East, West, Central).
- **`zone_areas`**: Granular neighborhoods, postal codes, and local sub-districts mapped to zones.
- **`rate_cards`**: Directional routes connecting `pickup_zone_id` and `drop_zone_id`.

### Directional & Intra vs. Inter-Zone Processing
- **Intra-Zone**: When $\text{pickup\_zone\_id} = \text{drop\_zone\_id}$, intra-city rates apply with lower base rates and minimal transit times.
- **Inter-Zone**: When $\text{pickup\_zone\_id} \neq \text{drop\_zone\_id}$, cross-corridor rates apply.
- **B2B vs. B2C Segregation**: Business contracts feature higher minimum thresholds with lower per-kg increments, while retail accounts support flexible individual rates.

Admins configure zones, areas, and rate cards dynamically via REST endpoints without requiring application restarts or migrations.

---

## 3. Intelligent Auto-Assignment Logic

The dispatch system allocates delivery orders using a multi-criteria scoring algorithm:

$$\text{Score}(A, O) = w_1 \cdot \text{ZoneMatch}(A, O) + w_2 \cdot \text{ActiveWorkload}(A)$$

```
[Unassigned Order Placed / Rescheduled]
                     │
                     ▼
  [Filter Active & Available Fleet Agents]
  (role = DELIVERY_AGENT AND available = TRUE)
                     │
                     ▼
     [Zone & Operating Area Matching]
  (Agent Preferred Area matches Order Pickup Zone)
                     │
                     ▼
         [Workload Load Balancing]
  (Sort by fewest active in-progress runs)
                     │
                     ▼
        [Atomic Driver Assignment]
  (Update delivery_agent_id + Write Tracking Log)
```

1. **Eligibility Filter**: Queries agents with `role = DELIVERY_AGENT` and `available = TRUE`.
2. **Proximity / Operating Preference**: Matches the order's pickup zone with the agent's verified operating territory.
3. **Queue Balancing**: Among matching candidates, selects the agent with the lowest number of active shipments (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`), preventing driver saturation and maximizing SLA compliance.
4. **Immutable Audit Record**: Assignment is committed atomically, logging the assigning actor (Admin or System Auto-Assign) in `order_tracking_history`.

---

## 4. Failed Delivery & Reschedule Handling

Logistics operations encounter access restrictions, customer unavailability, or incorrect addresses. The system provides an automated recovery workflow:

```
[Agent marks attempt FAILED + records failure reason]
                     │
                     ▼
   [Write DeliveryAttempt Record (Attempt #n)]
                     │
                     ▼
   [Emit Multi-Channel Alerts (Email + SMS)]
                     │
                     ▼
[Customer accesses Portal -> Selects Reschedule Date]
                     │
                     ▼
      [Status -> RESCHEDULED & Agent Unassigned]
                     │
                     ▼
   [Order Re-enters Queue for Fresh Dispatch]
```

1. **Failure Capture**: The delivery agent records the failure state along with structured failure reasons (e.g., *Customer Unavailable*, *Wrong Address*, *Gate Access Refused*).
2. **Attempt Ledger**: A `delivery_attempts` entry is created recording attempt number, timestamp, agent ID, and reason.
3. **Customer Alerting**: Automated Email and SMS notifications inform the customer with a direct resolution link.
4. **Self-Service Rescheduling**: Customers specify a new target delivery date and optional access notes directly from the portal.
5. **Reassignment Cycle**: The order transitions to `RESCHEDULED`, unassigns the previous agent, and re-enters the dispatch queue for reassignment or auto-assignment on the requested delivery date.
