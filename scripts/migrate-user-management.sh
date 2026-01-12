#!/bin/bash

# User Management Migration Script
# This script applies the user management migrations to your Supabase database

echo "🚀 Starting User Management Migration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your Supabase credentials"
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Warning: No service role key found. Using anon key (limited permissions)"
fi

echo "📋 Migration Plan:"
echo "  1. Create user_profiles table"
echo "  2. Set up automatic profile creation trigger"
echo "  3. Apply Row Level Security policies"
echo "  4. Auto-approve admin user"
echo ""

read -p "Do you want to proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "📦 Applying migrations..."
echo ""

# Note: This script requires the Supabase CLI or direct database access
# For now, we'll provide instructions for manual application

echo "⚠️  Manual Migration Required"
echo ""
echo "Please apply the migrations manually using one of these methods:"
echo ""
echo "Method 1: Using Supabase Dashboard"
echo "  1. Go to your Supabase project dashboard"
echo "  2. Navigate to SQL Editor"
echo "  3. Copy and paste the contents of:"
echo "     - supabase/migrations/20260112_add_user_management.sql"
echo "     - supabase/rls_policies_user_management.sql"
echo "  4. Run each migration"
echo ""
echo "Method 2: Using Supabase CLI (if installed)"
echo "  1. Run: supabase db push"
echo ""
echo "Method 3: Using psql (if you have direct database access)"
echo "  1. Get your database connection string from Supabase dashboard"
echo "  2. Run: psql 'your-connection-string' -f supabase/migrations/20260112_add_user_management.sql"
echo "  3. Run: psql 'your-connection-string' -f supabase/rls_policies_user_management.sql"
echo ""

echo "✅ Migration files are ready in:"
echo "   - supabase/migrations/20260112_add_user_management.sql"
echo "   - supabase/rls_policies_user_management.sql"
echo ""
echo "📚 For more information, see: docs/USER_MANAGEMENT.md"
