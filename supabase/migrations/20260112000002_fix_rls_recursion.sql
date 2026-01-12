-- Fix recursive RLS policies for user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
    ON user_profiles
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' = 'hamzahadjtaieb@gmail.com'
        OR 
        (role = 'admin' AND status = 'approved' AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
    ON user_profiles
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = 'hamzahadjtaieb@gmail.com');

DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles"
    ON user_profiles
    FOR DELETE
    USING (auth.jwt() ->> 'email' = 'hamzahadjtaieb@gmail.com');
