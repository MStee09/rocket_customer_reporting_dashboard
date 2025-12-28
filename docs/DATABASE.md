# Database Schema Documentation

> **This is the authoritative schema reference. Migration files may be outdated.**

Last Updated: 2025-12-20

## Table of Contents

- [Overview](#overview)
- [Entity Relationship](#entity-relationship)
- [Base Tables](#base-tables)
  - [shipment](#shipment)
  - [shipment_address](#shipment_address)
  - [shipment_carrier](#shipment_carrier)
  - [shipment_item](#shipment_item)
  - [shipment_detail](#shipment_detail)
  - [shipment_accessorial](#shipment_accessorial)
  - [shipment_note](#shipment_note)
  - [customer](#customer)
  - [carrier](#carrier)
  - [client](#client)
  - [shipment_mode](#shipment_mode)
  - [shipment_status](#shipment_status)
  - [equipment_type](#equipment_type)
  - [user_roles](#user_roles)
  - [users_customers](#users_customers)
- [Security Views](#security-views)
  - [Customer Views](#customer-views)
  - [Secure Views](#secure-views)
- [Column Quick Reference](#column-quick-reference)
- [Key Relationships](#key-relationships)

---

## Overview

This database supports a transportation management system (TMS) with multi-tenant architecture. Key concepts:

- **Primary Key**: Shipments use `load_id` as the primary key (NOT `shipment_id`)
- **Multi-tenancy**: Data is organized by `client_id` and `customer_id`
- **Security**: Row-Level Security (RLS) is enabled on all tables
- **Customer Views**: Special views hide sensitive financial data from customer users

---

## Entity Relationship

### Core Hierarchy
```
client (tenant)
  └── customer (end customer)
      └── shipment (load_id)
          ├── shipment_address (origin/destination stops)
          ├── shipment_carrier (carrier assignments)
          ├── shipment_item (line items/products)
          ├── shipment_detail (workflow tracking)
          ├── shipment_accessorial (extra charges)
          └── shipment_note (comments/notes)
```

### Access Control
```
auth.users (Supabase Auth)
  └── user_roles (admin/customer)
      └── users_customers (customer assignments)
```

---

## Base Tables

### shipment

**Primary table for freight shipments. Note: Primary key is `load_id`, not `shipment_id`.**

Filtered by `customer_id` for customer users. Contains sensitive financial data (`cost`, `target_rate`) that should be hidden from customers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| load_id | integer | NO | - | Primary key (unique shipment identifier) |
| client_id | integer | NO | - | Tenant/client identifier |
| client_load_id | integer | NO | - | Client-specific load number |
| customer_id | integer | NO | - | Customer who owns this shipment |
| payer_id | integer | NO | - | Customer ID of payer |
| payer_address_id | integer | NO | - | Billing address ID |
| mode_id | integer | NO | - | Transport mode (LTL, FTL, etc.) |
| equipment_type_id | integer | NO | - | Equipment type (van, flatbed, etc.) |
| status_id | integer | NO | - | Current shipment status |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | When shipment was created |
| modified_date | timestamp | YES | - | Last modification timestamp |
| pickup_date | timestamp | NO | - | Scheduled pickup date/time |
| delivery_date | timestamp | YES | - | Actual delivery date/time |
| estimated_delivery_date | timestamp | YES | - | Estimated delivery |
| expected_delivery_date | timestamp | YES | - | Expected delivery |
| requested_on_dock_date | timestamp | YES | - | Requested arrival at dock |
| **cost** | numeric | NO | 0 | **ADMIN ONLY - Carrier cost** |
| retail | numeric | NO | 0 | Customer charge/revenue |
| **target_rate** | numeric | NO | 0 | **ADMIN ONLY - Target rate** |
| shipment_value | numeric | NO | 0 | Declared value of goods |
| cost_without_tax | numeric | NO | 0 | Cost excluding taxes |
| retail_without_tax | numeric | NO | 0 | Retail excluding taxes |
| status_code | varchar | YES | - | Status code (text) |
| status_description | varchar | YES | - | Status description |
| priority | integer | NO | 0 | Shipment priority level |
| number_of_pallets | integer | NO | 0 | Total pallet count |
| linear_feet | numeric | NO | 0 | Linear feet of trailer space |
| miles | numeric | NO | 0 | Distance in miles |
| reference_number | varchar | YES | - | Customer reference number |
| bol_number | varchar | YES | - | Bill of Lading number |
| po_reference | varchar | YES | - | Purchase order reference |
| shipper_number | varchar | YES | - | Shipper ID number |
| pickup_number | varchar | YES | - | Pickup confirmation number |
| quote_number | varchar | YES | - | Quote/rate confirmation number |
| rate_carrier_id | integer | YES | - | Carrier who provided rate |
| is_rerun_rate | boolean | NO | false | Rate needs to be re-run |
| is_stackable | boolean | NO | false | Freight can be stacked |
| is_palletized | boolean | NO | false | Freight is palletized |
| is_automated_ltl | boolean | NO | false | Auto-tendered to LTL carrier |
| created_by | varchar | YES | - | User who created record |
| modified_by | varchar | YES | - | User who last modified |

**Foreign Keys:**
- `customer_id` → customer.customer_id
- `mode_id` → shipment_mode.mode_id
- `equipment_type_id` → equipment_type.equipment_type_id
- `status_id` → shipment_status.status_id
- `rate_carrier_id` → carrier.carrier_id

---

### shipment_address

**Origin and destination addresses for shipments. Linked by `load_id`.**

Multiple addresses per shipment (pickup, delivery, intermediate stops).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| shipment_address_id | integer | NO | nextval() | Primary key |
| load_id | integer | NO | - | Foreign key to shipment |
| address_id | integer | NO | - | Address record ID |
| address_line1 | varchar | YES | - | Street address line 1 |
| address_line2 | varchar | YES | - | Street address line 2 |
| city | varchar | YES | - | City name |
| state | varchar | YES | - | State/province code |
| postal_code | varchar | YES | - | ZIP/postal code |
| country | varchar | YES | - | Country code |
| contact_name | varchar | YES | - | Contact person name |
| contact_phone | varchar | YES | - | Contact phone number |
| contact_email | varchar | YES | - | Contact email address |
| company_name | varchar | YES | - | Company/business name |
| address_type | integer | NO | - | Type (1=origin, 2=destination) |
| stop_number | integer | NO | 1 | Sequential stop number |
| appointment_time | timestamp | YES | - | Scheduled appointment |
| arrival_time | timestamp | YES | - | Actual arrival time |
| departure_time | timestamp | YES | - | Actual departure time |
| latitude | numeric | YES | - | GPS latitude coordinate |
| longitude | numeric | YES | - | GPS longitude coordinate |
| reference_number | varchar | YES | - | Location reference number |
| special_instructions | text | YES | - | Delivery/pickup instructions |
| is_residential | boolean | NO | false | Residential delivery flag |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_date | timestamp | YES | - | Last modified timestamp |
| created_by | varchar | YES | - | User who created |
| modified_by | varchar | YES | - | User who modified |

**Foreign Keys:**
- `load_id` → shipment.load_id

---

### shipment_carrier

**Carrier assignments for shipments. Contains sensitive `carrier_pay` data.**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| shipment_carrier_id | integer | NO | nextval() | Primary key |
| load_id | integer | NO | - | Foreign key to shipment |
| carrier_id | integer | NO | - | Carrier company ID |
| assignment_type | integer | NO | 1 | Assignment type |
| assignment_status | integer | NO | 1 | Status (pending, accepted, declined) |
| assigned_date | timestamp | NO | CURRENT_TIMESTAMP | When assigned |
| accepted_date | timestamp | YES | - | When accepted by carrier |
| declined_date | timestamp | YES | - | When declined by carrier |
| **carrier_pay** | numeric | NO | 0 | **ADMIN ONLY - Amount paid to carrier** |
| carrier_name | varchar | YES | - | Carrier company name |
| carrier_scac | varchar | YES | - | SCAC code |
| driver_name | varchar | YES | - | Driver name |
| driver_phone | varchar | YES | - | Driver phone number |
| truck_number | varchar | YES | - | Truck/tractor number |
| trailer_number | varchar | YES | - | Trailer number |
| pro_number | varchar | YES | - | PRO tracking number |
| notes | text | YES | - | Carrier assignment notes |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_date | timestamp | YES | - | Last modified |
| created_by | varchar | YES | - | User who created |
| modified_by | varchar | YES | - | User who modified |

**Foreign Keys:**
- `load_id` → shipment.load_id
- `carrier_id` → carrier.carrier_id

---

### shipment_item

**Line items/products being shipped. Linked by `load_id`.**

Contains freight details including weight, dimensions, commodity information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| shipment_item_id | integer | NO | nextval() | Primary key |
| load_id | integer | NO | - | Foreign key to shipment |
| description | text | YES | - | Item description |
| commodity | varchar | YES | - | Commodity type |
| freight_class | varchar | YES | - | NMFC freight class |
| nmfc_code | varchar | YES | - | NMFC item code |
| quantity | integer | NO | 0 | Number of handling units |
| weight | numeric | NO | 0 | Total weight |
| weight_unit | varchar | YES | 'LBS' | Weight unit (LBS, KG) |
| length | numeric | YES | - | Length dimension |
| width | numeric | YES | - | Width dimension |
| height | numeric | YES | - | Height dimension |
| dimension_unit | varchar | YES | 'IN' | Dimension unit (IN, CM) |
| package_type | varchar | YES | - | Package type (pallet, box, etc.) |
| number_of_packages | integer | NO | 0 | Number of packages |
| is_hazmat | boolean | NO | false | Hazardous materials flag |
| is_stackable | boolean | NO | false | Can be stacked |
| hazmat_class | varchar | YES | - | Hazmat class |
| hazmat_un_number | varchar | YES | - | UN/NA identification number |
| declared_value | numeric | YES | - | Declared value for insurance |
| item_number | varchar | YES | - | Item/part number |
| sku | varchar | YES | - | SKU code |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_date | timestamp | YES | - | Last modified |
| created_by | text | YES | - | User who created |
| modified_by | text | YES | - | User who modified |

**Foreign Keys:**
- `load_id` → shipment.load_id

---

### shipment_detail

**Workflow and operational tracking for shipments.**

Tracks who performed key actions (quoting, booking, dispatching, delivery).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| load_id | integer | NO | - | Primary key, foreign key to shipment |
| quoted_by | varchar | YES | - | User who quoted shipment |
| quoted_date | timestamp | YES | - | When quoted |
| booked_by | varchar | YES | - | User who booked shipment |
| booked_date | timestamp | YES | - | When booked |
| dispatched_by | varchar | YES | - | User who dispatched |
| dispatch_date | timestamp | YES | - | When dispatched |
| delivered_by | varchar | YES | - | User who confirmed delivery |
| delivered_date | timestamp | YES | - | When delivered |
| needs_follow_up | boolean | YES | - | Requires follow-up action |
| ready_to_invoice | boolean | NO | false | Ready for billing |
| has_edi_dispatched | boolean | NO | false | EDI dispatch sent |
| created_by | varchar | YES | - | User who created |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_by | varchar | YES | - | User who modified |
| modified_date | timestamp | YES | - | Last modified |

**Foreign Keys:**
- `load_id` → shipment.load_id

---

### shipment_accessorial

**Additional charges and fees for shipments. Contains admin-only cost data.**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| shipment_accessorial_id | integer | NO | nextval() | Primary key |
| load_id | integer | NO | - | Foreign key to shipment |
| accessorial_type | text | YES | - | Type of accessorial |
| accessorial_code | text | YES | - | Standard accessorial code |
| description | text | YES | - | Description of charge |
| charge_amount | numeric | NO | 0 | Amount charged to customer |
| **cost_amount** | numeric | NO | 0 | **ADMIN ONLY - Cost from carrier** |
| is_billable | boolean | NO | true | Can be billed to customer |
| is_approved | boolean | NO | false | Approved for billing |
| quantity | integer | NO | 1 | Quantity of units |
| unit_type | varchar | YES | - | Unit of measure |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_date | timestamp | YES | - | Last modified |
| created_by | varchar | YES | - | User who created |
| modified_by | varchar | YES | - | User who modified |

**Foreign Keys:**
- `load_id` → shipment.load_id

---

### shipment_note

**Notes and comments attached to shipments.**

Controls visibility to different user types (internal, carrier, customer).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| shipment_note_id | integer | NO | nextval() | Primary key |
| load_id | integer | NO | - | Foreign key to shipment |
| note_type | integer | NO | 1 | Type of note |
| note_text | text | NO | - | Note content |
| is_internal | boolean | NO | true | Internal use only |
| is_visible_to_carrier | boolean | NO | false | Carrier can see |
| is_visible_to_customer | boolean | NO | false | Customer can see |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| created_by | varchar | YES | - | User who created |

**Foreign Keys:**
- `load_id` → shipment.load_id

---

### customer

**Customer companies that ship freight.**

Customers belong to a client (tenant) and are assigned to users via `users_customers`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| customer_id | integer | NO | nextval() | Primary key |
| client_id | integer | NO | - | Tenant/client identifier |
| company_name | varchar | NO | - | Customer company name |
| is_active | boolean | NO | true | Active status |
| is_on_hold | boolean | NO | false | Account on hold |
| comments | varchar | YES | - | Internal comments |
| logo | varchar | YES | - | Logo URL or path |
| external_customer_id | varchar | YES | - | External system ID |
| guid | uuid | NO | gen_random_uuid() | Global unique identifier |
| created_by | varchar | YES | - | User who created |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_by | varchar | YES | - | User who modified |
| modified_date | timestamp | YES | - | Last modified |

**Foreign Keys:**
- `client_id` → client.client_id

---

### carrier

**Carrier companies that transport freight.**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| carrier_id | integer | NO | nextval() | Primary key |
| client_id | integer | NO | - | Tenant/client identifier |
| carrier_name | varchar | NO | - | Carrier company name |
| status | integer | NO | 1 | Status code |
| notes | varchar | YES | - | Internal notes |
| dot_number | varchar | YES | - | DOT number |
| mc_number | varchar | YES | - | MC authority number |
| scac | varchar | YES | - | SCAC code |
| website | varchar | YES | - | Website URL |
| account_number | varchar | YES | - | Account number with carrier |
| currency_code | varchar | YES | - | Currency code |
| guid | uuid | NO | gen_random_uuid() | Global unique identifier |
| created_by | varchar | YES | - | User who created |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_by | varchar | YES | - | User who modified |
| modified_date | timestamp | YES | - | Last modified |
| disable_date | timestamp | YES | - | When disabled |

**Foreign Keys:**
- `client_id` → client.client_id

---

### client

**Top-level tenant/client organizations.**

Multi-tenant system where each client has their own customers, carriers, and shipments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| client_id | integer | NO | nextval() | Primary key |
| client_name | varchar | NO | - | Client company name |
| website | varchar | YES | - | Website URL |
| email_address | text | YES | - | Contact email |
| default_email | text | YES | - | Default sender email |
| logo | varchar | YES | - | Logo URL or path |
| theme_name | varchar | YES | - | UI theme name |
| time_zone | varchar | YES | - | Default timezone |
| has_accepted_terms | boolean | NO | false | Accepted terms of service |
| stripe_customer_id | varchar | YES | - | Stripe customer ID |
| created_by | varchar | YES | - | User who created |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_by | varchar | YES | - | User who modified |
| modified_date | timestamp | YES | - | Last modified |
| disable_date | timestamp | YES | - | When disabled |

---

### shipment_mode

**Transportation modes (LTL, FTL, Intermodal, etc.).**

Reference/lookup table for shipment modes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| mode_id | integer | NO | nextval() | Primary key |
| mode_code | varchar | NO | - | Short code (e.g., "LTL") |
| mode_name | varchar | NO | - | Display name (e.g., "Less Than Truckload") |
| description | text | YES | - | Detailed description |
| is_active | boolean | NO | true | Active status |
| display_order | integer | NO | 0 | Sort order for display |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_date | timestamp | YES | - | Last modified |

---

### shipment_status

**Shipment lifecycle statuses (Quoted, Booked, In Transit, Delivered, etc.).**

Reference/lookup table for shipment statuses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| status_id | integer | NO | nextval() | Primary key |
| status_code | varchar | NO | - | Short code |
| status_name | varchar | NO | - | Display name |
| status_description | text | YES | - | Detailed description |
| display_order | integer | NO | 0 | Sort order for display |
| is_active | boolean | NO | true | Active status |
| is_completed | boolean | NO | false | Indicates completed shipment |
| is_cancelled | boolean | NO | false | Indicates cancelled shipment |

---

### equipment_type

**Equipment types (Dry Van, Flatbed, Reefer, etc.).**

Reference/lookup table for equipment types.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| equipment_type_id | integer | NO | nextval() | Primary key |
| equipment_code | varchar | NO | - | Short code |
| equipment_name | varchar | NO | - | Display name |
| description | text | YES | - | Detailed description |
| is_active | boolean | NO | true | Active status |
| display_order | integer | NO | 0 | Sort order for display |
| created_date | timestamp | NO | CURRENT_TIMESTAMP | Creation timestamp |
| modified_date | timestamp | YES | - | Last modified |

---

### user_roles

**User role assignments (admin or customer).**

Links Supabase Auth users to their role in the system.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | bigint | NO | - | Primary key |
| user_id | uuid | NO | - | Supabase Auth user ID |
| user_role | USER-DEFINED | NO | - | Role enum ('admin' or 'customer') |

**Foreign Keys:**
- `user_id` → auth.users.id (Supabase Auth)

---

### users_customers

**Customer access assignments for users.**

Links users to the customers they can access. Customer users can only see data for their assigned customers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | bigint | NO | - | Primary key |
| user_id | uuid | NO | - | Supabase Auth user ID |
| customer_id | integer | NO | - | Customer ID they can access |
| created_at | timestamptz | YES | now() | Creation timestamp |
| created_by | uuid | YES | - | User who created assignment |

**Foreign Keys:**
- `user_id` → auth.users.id (Supabase Auth)
- `customer_id` → customer.customer_id

---

## Security Views

### Customer Views

**Purpose**: Hide sensitive financial and operational data from customer users.

These views exclude admin-only columns and automatically filter data based on the authenticated user's customer assignments via RLS policies.

#### Available Customer Views:

1. **shipment_customer_view**
   - Excludes: `cost`, `cost_without_tax`
   - Includes: `retail`, `retail_without_tax`, all non-financial columns
   - Use this instead of `shipment` table for customer queries

2. **shipment_carrier_customer_view**
   - Excludes: `carrier_pay`
   - Includes: All non-financial carrier details (driver, truck, tracking info)

3. **shipment_accessorial_customer_view**
   - Excludes: `cost_amount`
   - Includes: `charge_amount` and all descriptive fields

4. **shipment_address_customer_view**
   - No exclusions (addresses not considered sensitive)
   - Provided for consistency

5. **shipment_item_customer_view**
   - No exclusions (item details not considered sensitive)
   - Provided for consistency

6. **shipment_detail_customer_view**
   - No exclusions (operational tracking not considered sensitive)
   - Provided for consistency

7. **shipment_note_customer_view**
   - Automatically filters to only show notes where `is_visible_to_customer = true`

#### Usage Pattern:

```typescript
// INCORRECT - Exposes sensitive data
const { data } = await supabase
  .from('shipment')
  .select('load_id, customer_id, cost, retail');

// CORRECT - Use customer view for non-admin users
const table = isAdmin ? 'shipment' : 'shipment_customer_view';
const { data } = await supabase
  .from(table)
  .select('load_id, customer_id, retail');
```

---

### Secure Views

**Purpose**: Admin-facing views that include ALL columns including sensitive data.

These views are named with `_secure` suffix and should only be used by admin users.

1. **shipment_secure** - Full shipment data with all financial columns
2. **shipment_carrier_secure** - Full carrier data including carrier_pay
3. **shipment_accessorial_secure** - Full accessorial data including cost_amount

**Note**: Most admin queries should use the base tables directly, not secure views. Secure views are provided for consistency with the customer view pattern.

---

## Column Quick Reference

### Display Name → Database Column Mapping

| Display Name | Database Column | Table | Notes |
|--------------|----------------|-------|-------|
| Load ID | load_id | shipment | Primary key (NOT shipment_id) |
| Customer | customer_id | shipment | Foreign key to customer |
| Status | status_id | shipment | Foreign key to shipment_status |
| Mode | mode_id | shipment | Foreign key to shipment_mode |
| Equipment | equipment_type_id | shipment | Foreign key to equipment_type |
| Pickup Date | pickup_date | shipment | Scheduled pickup |
| Delivery Date | delivery_date | shipment | Actual delivery |
| Cost | cost | shipment | ADMIN ONLY |
| Revenue/Retail | retail | shipment | Customer-facing price |
| Target Rate | target_rate | shipment | ADMIN ONLY |
| Carrier Pay | carrier_pay | shipment_carrier | ADMIN ONLY |
| Reference # | reference_number | shipment | Customer reference |
| BOL # | bol_number | shipment | Bill of lading |
| PO # | po_reference | shipment | Purchase order |
| PRO # | pro_number | shipment_carrier | Carrier tracking |
| Origin | - | shipment_address | WHERE address_type = 1 |
| Destination | - | shipment_address | WHERE address_type = 2 |

### Common Query Patterns

#### Get shipment with addresses:
```sql
SELECT
  s.load_id,
  s.customer_id,
  s.pickup_date,
  origin.city AS origin_city,
  origin.state AS origin_state,
  dest.city AS dest_city,
  dest.state AS dest_state
FROM shipment s
LEFT JOIN shipment_address origin ON s.load_id = origin.load_id AND origin.address_type = 1
LEFT JOIN shipment_address dest ON s.load_id = dest.load_id AND dest.address_type = 2
```

#### Get shipment with carrier info:
```sql
SELECT
  s.load_id,
  s.customer_id,
  sc.carrier_name,
  sc.driver_name,
  sc.pro_number
FROM shipment s
LEFT JOIN shipment_carrier sc ON s.load_id = sc.load_id
```

---

## Key Relationships

### Data Hierarchy

```
client (tenant)
  └── customer (customer company)
      └── shipment (freight load)
          ├── shipment_address (stops/locations)
          ├── shipment_carrier (carrier assignment)
          ├── shipment_item (line items)
          ├── shipment_detail (workflow tracking)
          ├── shipment_accessorial (extra charges)
          └── shipment_note (comments)
```

### User Access Control

```
auth.users (Supabase Auth)
  └── user_roles (role: 'admin' or 'customer')
      └── users_customers (customer assignments for customer role)
```

**Access Rules:**
- **Admin users**: Can see all data across all customers
- **Customer users**: Can ONLY see data for customers in their `users_customers` assignments
- RLS policies enforce these rules at the database level

### Foreign Key Constraints

| Child Table | Foreign Key Column | Parent Table | Parent Column |
|-------------|-------------------|--------------|---------------|
| shipment | customer_id | customer | customer_id |
| shipment | mode_id | shipment_mode | mode_id |
| shipment | status_id | shipment_status | status_id |
| shipment | equipment_type_id | equipment_type | equipment_type_id |
| shipment | rate_carrier_id | carrier | carrier_id |
| shipment_address | load_id | shipment | load_id |
| shipment_carrier | load_id | shipment | load_id |
| shipment_carrier | carrier_id | carrier | carrier_id |
| shipment_item | load_id | shipment | load_id |
| shipment_detail | load_id | shipment | load_id |
| shipment_accessorial | load_id | shipment | load_id |
| shipment_note | load_id | shipment | load_id |
| customer | client_id | client | client_id |
| carrier | client_id | client | client_id |
| user_roles | user_id | auth.users | id |
| users_customers | user_id | auth.users | id |
| users_customers | customer_id | customer | customer_id |

---

## Important Notes

### Primary Keys
- **Shipment primary key is `load_id`**, NOT `shipment_id`
- This is a legacy naming convention that must be maintained
- All child tables reference `load_id` to link to shipments

### Sensitive Columns (Admin Only)
- `shipment.cost` - Carrier cost/what we pay
- `shipment.cost_without_tax` - Cost before tax
- `shipment.target_rate` - Internal target pricing
- `shipment_carrier.carrier_pay` - Amount paid to carrier
- `shipment_accessorial.cost_amount` - Cost of accessorial charge

**Security Note**: Application code should use customer views (`*_customer_view`) for customer users to prevent exposure of these sensitive columns.

### RLS Policies
All tables have Row Level Security enabled. Key policy patterns:

1. **Admin users**: Can view all rows
   ```sql
   USING (EXISTS (
     SELECT 1 FROM user_roles
     WHERE user_roles.user_id = auth.uid()
     AND user_roles.user_role = 'admin'
   ))
   ```

2. **Customer users**: Can only view rows for their assigned customers
   ```sql
   USING (
     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND user_role = 'customer')
     AND customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = auth.uid())
   )
   ```

3. **Related tables**: Filter via join to shipment.customer_id
   ```sql
   USING (
     load_id IN (
       SELECT load_id FROM shipment
       WHERE customer_id IN (SELECT customer_id FROM users_customers WHERE user_id = auth.uid())
     )
   )
   ```

---

## Schema Maintenance

To update this documentation:
1. Export current schema from Supabase
2. Update `docs/schema.json` with raw export
3. Update this `DATABASE.md` file with any structural changes
4. Document any new tables, columns, or relationships
5. Update the column quick reference if display names change

**Last Schema Export**: 2025-12-20
