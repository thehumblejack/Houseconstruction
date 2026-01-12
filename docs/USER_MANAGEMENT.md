# User Management System

This document explains the admin user management system that has been implemented for the House Construction application.

## Overview

The system provides administrators with the ability to:
- Review new user sign-up requests
- Approve or reject user access
- Manage user roles and permissions
- Monitor user activity and status

## Features

### 1. **User Registration Flow**
When a new user signs up:
1. Their account is automatically created in the authentication system
2. A user profile is created with `pending` status
3. The user is redirected to a "Pending Approval" page
4. Admin receives a notification badge in the navbar

### 2. **User Statuses**
- **Pending**: User has signed up but awaits admin approval
- **Approved**: User has been approved and can access the application
- **Rejected**: User's access request has been denied

### 3. **User Roles**
- **Admin**: Full access to all features including user management
- **User**: Standard access to application features
- **Viewer**: Read-only access (can be customized)

### 4. **Admin Dashboard** (`/admin/users`)
Accessible only to administrators, provides:
- Overview statistics (total users, pending, approved, rejected)
- Filterable user list by status
- User management actions:
  - Approve pending users
  - Reject users with optional reason
  - Change user roles
  - Delete users
  - Revoke access for approved users

### 5. **Real-time Updates**
- Admin navbar shows live count of pending users
- Updates automatically when new users sign up
- Uses Supabase real-time subscriptions

## Database Schema

### `user_profiles` Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- email: TEXT
- full_name: TEXT
- status: TEXT (pending | approved | rejected)
- role: TEXT (admin | user | viewer)
- requested_at: TIMESTAMPTZ
- approved_at: TIMESTAMPTZ
- approved_by: UUID
- rejection_reason: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Security

### Row Level Security (RLS)
All user profile data is protected with RLS policies:
- Users can only view their own profile
- Admins can view and manage all profiles
- System can create profiles automatically on signup

### Admin Identification
- Admin user: `hamzahadjtaieb@gmail.com`
- Automatically approved on first migration
- Cannot be deleted or downgraded through UI

## User Experience

### For New Users
1. **Sign Up**: Create account with email/password
2. **Pending Page**: See status and wait for approval
3. **Email Notification**: Receive email when approved (if configured)
4. **Access Granted**: Automatically redirected to dashboard when approved

### For Rejected Users
- See rejection page with reason (if provided)
- Contact information for admin support
- Cannot access application features

### For Admins
- **Navbar Badge**: Shows pending user count
- **Quick Access**: Direct link to user management
- **Bulk Actions**: Manage multiple users efficiently
- **Audit Trail**: See when users were approved/rejected

## Setup Instructions

### 1. Run Database Migrations
```bash
# Apply the user management migration
psql -h [your-supabase-host] -U postgres -d postgres -f supabase/migrations/20260112_add_user_management.sql

# Apply RLS policies
psql -h [your-supabase-host] -U postgres -d postgres -f supabase/rls_policies_user_management.sql
```

### 2. Verify Admin Account
The admin account (`hamzahadjtaieb@gmail.com`) should be automatically approved. Verify by checking the `user_profiles` table.

### 3. Test the Flow
1. Sign out and create a new test account
2. Verify the pending page appears
3. Sign in as admin
4. Navigate to `/admin/users`
5. Approve or reject the test account

## API Endpoints

All user management is handled through Supabase client-side SDK:
- `supabase.from('user_profiles').select()` - Fetch users
- `supabase.from('user_profiles').update()` - Update user status/role
- `supabase.from('user_profiles').delete()` - Delete user

## Customization

### Adding More Roles
Edit the role enum in the migration:
```sql
role TEXT CHECK (role IN ('admin', 'user', 'viewer', 'your_new_role'))
```

### Custom Approval Logic
Modify the `create_user_profile()` trigger function to implement custom auto-approval rules.

### Email Notifications
Integrate with Supabase Edge Functions or external email service to send notifications on approval/rejection.

## Troubleshooting

### Users Not Redirecting
- Check AuthContext is properly wrapped around the app
- Verify RLS policies are enabled
- Check browser console for errors

### Admin Not Seeing Users
- Verify admin email matches exactly
- Check user_profiles table exists
- Verify RLS policies allow admin access

### Pending Count Not Updating
- Check Supabase real-time is enabled
- Verify channel subscription is active
- Check browser console for subscription errors

## Future Enhancements

Potential improvements:
- Email notifications on approval/rejection
- User invitation system
- Bulk user import
- Activity logs and audit trail
- Custom permission levels per feature
- User groups/teams
- Self-service password reset
- Two-factor authentication
