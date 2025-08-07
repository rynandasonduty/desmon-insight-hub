# DASHMON Migration Guide

## Overview
This guide provides the complete migration sequence for DASHMON system to Supabase, including all new features and optimizations.

## Migration Files Order

### 1. **20250806061857_green_wave.sql** (FIRST)
**Purpose:** Update report status constraints for enhanced ETL process
**Changes:**
- Update status check constraint to include new statuses
- Add support for `pending_approval`, `system_rejected`, `failed` states
- New status flow: `queued` → `processing` → `pending_approval` → `approved`/`rejected`

### 2. **20250806062000_media_massa_etl.sql** (SECOND)
**Purpose:** Enhanced ETL schema for media massa processing
**Changes:**
- Add new columns to reports table for enhanced ETL tracking
- Create `processed_media_items` table for tracking individual media items
- Create `report_scoring_details` table for detailed scoring breakdown
- Add indexes for performance optimization
- Enable RLS policies for new tables

### 3. **20250806061606_velvet_frost.sql** (THIRD)
**Purpose:** Setup KPI data for Skoring Publikasi Media Massa
**Changes:**
- Insert KPI definition for "Skoring Publikasi Media Massa"
- Insert scoring ranges based on brainstorm.xlsx guidelines
- Set up proper target values and weights
- Define scoring ranges for different achievement levels

### 4. **20250109000000_dual_target_kpi_update.sql** (LAST)
**Purpose:** Complete system update with dual targets and new features
**Changes:**
- Update kpi_definitions table to support dual targets (monthly & semester)
- Create new semester-based KPI definitions
- Update calculate_media_massa_scoring function for semester logic
- Add new scoring ranges based on semester targets
- **NEW:** Create `leaderboard_history` table for analytics
- **NEW:** Create `app_settings` table for persistent settings
- **NEW:** Create enhanced `notifications` table with categories and priority levels

## Command to Run Migrations

```bash
# Navigate to your project directory
cd /path/to/your/dashmon/project

# Run all migrations in order
supabase db push

# Or run individual migrations if needed
supabase db push --include-all
```

## New Tables Created

### 1. `leaderboard_history`
- Tracks historical leaderboard scores for change calculation
- Supports analytics with actual change values instead of mock data

### 2. `app_settings`
- Persistent application and user settings
- Replaces localStorage-only approach
- Supports SMTP configuration, notification preferences, etc.

### 3. `notifications` (Enhanced)
- Advanced notification system with categories and priority levels
- Supports read/unread status, action URLs, metadata
- Real-time notifications for dashboard

### 4. `processed_media_items`
- Tracks individual media items with validation status
- Supports various media types (online_news, social_media, radio, etc.)
- Content hashing for duplicate detection

### 5. `report_scoring_details`
- Stores detailed scoring breakdown per media type
- Achievement percentages, score values, weighted scores
- Supports semester-based calculations

## New Features Added

### 1. **Excel Template System**
- Template files location: `/public/templates/excel/`
- Supported templates:
  - `PUBLIKASI_SIARAN_PERS.xlsx`
  - `PRODUKSI_KONTEN_MEDSOS.xlsx`
  - `SKORING_PUBLIKASI_MEDIA.xlsx`
  - `KAMPANYE_KOMUNIKASI.xlsx`
  - `OFI_TO_AFI.xlsx`

### 2. **Advanced Reporting**
- PDF, Excel, CSV export functionality
- Bulk export for multiple reports
- Scheduled reports (framework ready)
- Custom report templates

### 3. **Enhanced Notification System**
- Categories: upload, approval, rejection, system, kpi, report, deadline
- Priority levels: low, medium, high, urgent
- Read/unread status with timestamps
- Real-time dashboard notifications
- Notification preferences

### 4. **Email Notification System**
- SMTP configuration through settings
- Automatic email notifications on approval/rejection
- Email templates support
- Integrated with Supabase Edge Functions

### 5. **Optimized Analytics**
- Real leaderboard change calculation (no more mock data)
- Historical data tracking
- Performance optimizations

## Post-Migration Setup

### 1. **Template Files**
Place your Excel template files in:
```
public/templates/excel/
├── PUBLIKASI_SIARAN_PERS.xlsx
├── PRODUKSI_KONTEN_MEDSOS.xlsx
├── SKORING_PUBLIKASI_MEDIA.xlsx
├── KAMPANYE_KOMUNIKASI.xlsx
└── OFI_TO_AFI.xlsx
```

### 2. **SMTP Configuration**
Configure email settings in the admin panel:
- Go to Settings → Email
- Enter SMTP configuration
- Test email functionality

### 3. **Notification Preferences**
Users can configure notification preferences:
- Go to Settings → Notifications
- Enable/disable notification categories
- Set priority level filters

### 4. **System Setup**
Run system initialization:
- Go to Settings → Setup ETL
- Click "Jalankan Setup Sistem"
- This will clean dummy data and setup KPI definitions

## Testing Checklist

### Core Functionality
- [ ] User authentication and role-based access
- [ ] File upload with Excel template validation
- [ ] ETL processing and scoring calculation
- [ ] Report approval/rejection workflow
- [ ] Email notifications on approval/rejection

### New Features
- [ ] Excel template download and validation
- [ ] Report export (PDF, Excel, CSV)
- [ ] Bulk export functionality
- [ ] Enhanced notification center
- [ ] Real-time notification updates
- [ ] Leaderboard with actual change calculation
- [ ] Persistent settings storage

### Analytics
- [ ] Dashboard metrics calculation
- [ ] Leaderboard with historical data
- [ ] KPI tracking and scoring
- [ ] Report analytics and trends

### Admin Features
- [ ] User management
- [ ] KPI management
- [ ] System settings
- [ ] Notification management

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check Supabase connection
   - Verify service role key permissions
   - Run migrations one by one if needed

2. **Template Files Not Found**
   - Ensure files are placed in correct directory
   - Check file permissions
   - Verify file naming convention

3. **Email Notifications Not Working**
   - Verify SMTP configuration
   - Check Supabase Edge Function logs
   - Test SMTP settings manually

4. **Real-time Notifications Not Updating**
   - Check Supabase real-time subscriptions
   - Verify RLS policies
   - Check browser console for errors

### Support
For issues or questions, check:
1. Supabase dashboard logs
2. Browser developer console
3. Network tab for API calls
4. Application error logs

## Version Information
- **DASHMON Version:** 2.0.0
- **Supabase Version:** 2.53.0+
- **React Version:** 18.3.1
- **Last Updated:** January 2025