-- Enable Row Level Security on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
    ON user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Admins can view all profiles
-- To avoid recursion, we use a separate check or assume admins can be identified via uid
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
    ON user_profiles
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
        AND 
        (SELECT status FROM user_profiles WHERE user_id = auth.uid()) = 'approved'
    );
-- Wait, the above is still recursive. 
-- The correct way to check admin role without recursion is usually to check if the user is the specific admin email or use a function.

-- Better approach:
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
    ON user_profiles
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' = 'hamzahadjtaieb@gmail.com'
        OR 
        (role = 'admin' AND status = 'approved' AND user_id = auth.uid())
    );

-- 3. Admins can update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
    ON user_profiles
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = 'hamzahadjtaieb@gmail.com');

-- 4. Admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles"
    ON user_profiles
    FOR DELETE
    USING (auth.jwt() ->> 'email' = 'hamzahadjtaieb@gmail.com');

-- 5. System can insert profiles (for trigger)
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;
CREATE POLICY "System can insert profiles"
    ON user_profiles
    FOR INSERT
    WITH CHECK (true);
