# Implementation Plan: FAMS Excel Restructuring & Logic Enhancements

## Objective
Restructure the backend storage to use exactly three Excel files (`assets.xlsx`, `payables.xlsx`, `users.xlsx`) and implement refined business logic for Asset Management and Payables, as referenced by the user's request and provided images.

## 1. Schema & Data Model Updates (`shared/schema.ts`)

### Assets (`assets.xlsx`)
- **Sheet**: `Assets`
- **New/Modified Fields**:
  - `amc_warranty`: Text (Default 'Warranty').
  - `admin_id`: Text.
  - **Disposal/Transfer Workflow Fields**:
    - `initiated_by`, `initiated_at`, `reason`.
    - `approved_by`, `approved_at`.
    - `gate_pass_type`: Text (GatePass/Transfer).
    - `to_location`: Text.
    - `purpose`: Text.
    - `generated_by`, `generated_at`.
    - `pass_id`: Text.
    - `status`: Updated enums (Active, Disposal Initiated, Transfer Initiated, TransferApprovalPending, Transferred, etc.).

### Payables (`payables.xlsx`)
- **Sheets**: `Bills`, `Agreements`
- **Models**:
  - `Agreement`: `contract_id` (PK), `vendor_id`, `agreement_date`, `renewal_date`, etc.
  - `Bill`: `bill_no` (PK), `bill_type`, `vendor_id`, `contract_id` (FK), `amount`, `bill_date`, `due_date`, `priority`, `payment_status`, etc.

### Users (`users.xlsx`)
- **Sheet**: `Users`
- **New Fields for Permissions** (Dynamic Rights):
  - `manager_id`: Text.
  - `create_modify_assets` (Yes/No).
  - `approve_asset_creation` (Yes/No).
  - `asset_confirmation` (Yes/No).
  - `initiate_disposal` (Yes/No).
  - `approve_disposal` (Yes/No).
  - `initiate_transfer` (Yes/No).
  - `approve_transfer` (Yes/No).
  - `gate_pass_creation` (Yes/No).
  - `create_agreement` (Yes/No).
  - `create_bill` (Yes/No).
  - `approve_bill` (Yes/No).
  - `is_god_mode`: Derived from Role 'HO'.

## 2. Backend Logic (`server/storage.ts`)

### File Consolidation
- Remove/Deprecate `disposals.xlsx`, `gatepass.xlsx`.
- Map all Asset operations to `assets.xlsx` (Sheet 'Assets').
- Map Payables operations to `payables.xlsx` (Sheets 'Bills', 'Agreements').
- Map User operations to `users.xlsx` (Sheet 'Users').

### Asset Logic
- **Warranty Expiry**: On `getAssets`, check `warrantyEnd` date. If expired and `AMC/Warranty` is not 'AMC', update it to 'AMC'.
- **Status Reflection**:
  - `TransferApprovalPending`: Asset remains visible in "Old Branch" with this status. Not visible in "New Branch".
  - **Transfer Approval Action**:
    1. Update "Old Branch" asset status to `Transferred`.
    2. Create NEW asset in "New Branch" with status `Active` (copying relevant details).
- **Filtering**:
  - Ensure filters respect the new Status logic (e.g. `Transferred` assets might be filtered out of active lists but visible in history).

### Payables Logic
- **Bill Creation Refusal**: Cannot create a bill if the `contract_id` does not exist in `Agreements`.

### User Permissions
- Update `getUser` to return the full set of permissions.
- "God Mode": If User Role is 'HO', all permission checks return `true` (handled in utility or API layer).

## 3. Step-by-Step Execution

1.  **Update Schemas**: Refactor `shared/schema.ts` to include new fields and types.
2.  **Refactor Storage**: Rewrite `server/storage.ts` to handle the new 3-file structure.
    - Implement `Assets` merged read/write.
    - Implement `Payables` multi-sheet read/write.
    - Implement `Users` permission read.
3.  **Implement Business Logic**:
    - Add "Warranty -> AMC" check in `getAssets`.
    - Add Transfer Workflow (Clone asset on approval).
    - Add Bill Validation (check Agreement).
4.  **Verify/Update Frontend**:
    - Ensure Dashboard works with new data structure.
    - Update Asset Table status badges.
