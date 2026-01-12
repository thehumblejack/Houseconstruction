# Admin User Management - Quick Setup Guide

## 🎯 What's Been Implemented

A complete user management system that allows you (as admin) to:
- ✅ Review new user sign-up requests
- ✅ Approve or reject user access
- ✅ Manage user roles (Admin, User, Viewer)
- ✅ Monitor pending requests with live notifications
- ✅ Provide rejection reasons to users

## 📁 Files Created

### Database
- `supabase/migrations/20260112_add_user_management.sql` - Main migration
- `supabase/rls_policies_user_management.sql` - Security policies

### Frontend
- `src/app/admin/users/page.tsx` - Admin dashboard for user management
- `src/app/auth/pending/page.tsx` - Page shown to users awaiting approval
- `src/app/auth/rejected/page.tsx` - Page shown to rejected users
- `src/context/AuthContext.tsx` - Updated with user profile management

### Documentation
- `docs/USER_MANAGEMENT.md` - Complete system documentation
- `scripts/migrate-user-management.sh` - Migration helper script

## 🚀 Setup Steps

### Step 1: Apply Database Migrations

Choose one of these methods:

#### Option A: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Create a new query
5. Copy the contents of `supabase/migrations/20260112_add_user_management.sql`
6. Paste and click **Run**
7. Repeat for `supabase/rls_policies_user_management.sql`

#### Option B: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

#### Option C: Direct Database Access
```bash
# If you have psql and database credentials
./scripts/migrate-user-management.sh
```

### Step 2: Verify Admin Account

After running migrations, verify your admin account:
1. Sign in with `hamzahadjtaieb@gmail.com`
2. You should see an **ADMIN** button in the navbar
3. Click it to access the user management dashboard

### Step 3: Test the Flow

1. **Sign out** from your admin account
2. **Create a test account** with a different email
3. You should see the "Pending Approval" page
4. **Sign back in as admin**
5. Click the **ADMIN** button (should show a badge with "1")
6. **Approve or reject** the test account
7. Sign in with the test account to verify

## 🎨 User Experience

### For New Users
1. Sign up → See "Pending Approval" page
2. Wait for admin approval
3. Get redirected to dashboard when approved

### For Admins (You)
1. See pending count badge in navbar
2. Click **ADMIN** to manage users
3. View all users with filters (All, Pending, Approved, Rejected)
4. Take actions:
   - **Approve** - Grant access
   - **Reject** - Deny access with optional reason
   - **Change Role** - Adjust permissions
   - **Delete** - Remove user completely

## 📊 Admin Dashboard Features

### Statistics Cards
- Total Users
- Pending Approval (with count)
- Approved Users
- Rejected Users

### User Table
- User information (name, email)
- Status badges (color-coded)
- Role dropdown (instant update)
- Action buttons
- Request date

### Filters
- **All** - Show everyone
- **Pending** - Only awaiting approval
- **Approved** - Active users
- **Rejected** - Denied access

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all user data
- Users can only see their own profile
- Only admins can view/manage all users
- Admin status verified on every request
- Automatic profile creation on signup

## 🎯 Next Steps

1. **Apply the migrations** (Step 1 above)
2. **Test the system** with a dummy account
3. **Customize rejection messages** as needed
4. **Monitor pending users** via navbar badge

## 📱 Mobile Support

The admin dashboard and all user pages are fully responsive and work great on mobile devices.

## 🆘 Troubleshooting

### "Admin button not showing"
- Verify migrations were applied successfully
- Check that you're signed in with `hamzahadjtaieb@gmail.com`
- Clear browser cache and reload

### "Can't see pending users"
- Verify RLS policies were applied
- Check Supabase logs for errors
- Ensure user_profiles table exists

### "Pending count not updating"
- Check browser console for errors
- Verify Supabase Realtime is enabled in project settings
- Refresh the page

## 📚 Additional Resources

- Full documentation: `docs/USER_MANAGEMENT.md`
- Database schema: `supabase/migrations/20260112_add_user_management.sql`
- Security policies: `supabase/rls_policies_user_management.sql`

## 🎉 You're All Set!

Once you've applied the migrations, the user management system is ready to use. Any new user who signs up will need your approval before accessing the application.

---

**Need help?** Check the full documentation in `docs/USER_MANAGEMENT.md`
