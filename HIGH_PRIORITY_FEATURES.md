# High Priority Features Implementation Plan

## ✅ Already Implemented
1. **Automated Rent Reminders** - Complete
   - User settings: `reminder_enabled`, `reminder_days_before`, `reminder_time`
   - Background scheduler: `check_and_send_reminders()`
   - Email function: `send_rent_reminder_email()`

## 🚧 To Implement

### 2. Late Fee Calculator
**Changes needed:**
- Add to `Tenant` model: `late_fee_amount`, `grace_period_days`, `late_fee_type` (flat/percentage)
- Add to `Payment` model: `late_fee_applied` (boolean), `late_fee_amount`
- Add calculation logic in payment processing
- Add UI in AddTenant/EditTenant for late fee settings
- Add auto-apply logic in background scheduler

### 3. Lease Document Upload
**Changes needed:**
- Add to `Tenant` model: `lease_document_path`
- Create `/uploads/leases/` directory
- Add upload route in app.py
- Add UI to view/upload lease documents
- Add PDF viewer or download link

### 4. Maintenance Photo Uploads
**Changes needed:**
- Add to `MaintenanceRequest` model: `photo_paths` (JSON or separate table)
- Create `/uploads/maintenance/` directory
- Add upload handling in tenant portal route
- Add photo display in manager portal
- Add image compression/resizing

### 5. Dashboard Charts/Graphs
**Changes needed:**
- Install Recharts: `npm install recharts`
- Add charts to Dashboard.jsx:
  - Monthly income bar chart
  - Occupancy rate pie chart
  - Payment trends line chart
- Add API endpoint for chart data

---

## Implementation Order
1. Late Fee Calculator (quickest, highest impact)
2. Maintenance Photo Uploads (tenant experience)
3. Lease Document Upload (landlord org)
4. Dashboard Charts (visual polish)
