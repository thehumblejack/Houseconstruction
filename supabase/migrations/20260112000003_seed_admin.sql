-- Seed admin profile for existing user
INSERT INTO user_profiles (user_id, email, full_name, status, role, approved_at)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'approved', 'admin', now()
FROM auth.users
WHERE email = 'hamzahadjtaieb@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    status = 'approved',
    role = 'admin',
    approved_at = now();
