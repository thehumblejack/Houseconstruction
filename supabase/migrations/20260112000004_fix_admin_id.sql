INSERT INTO user_profiles (user_id, email, full_name, status, role, requested_at, approved_at)
VALUES ('903d5bb4-538b-4ee5-95cd-37003b66ace7', 'hamzahadjtaieb@gmail.com', 'Hamza Hadj Taieb', 'approved', 'admin', now(), now())
ON CONFLICT (user_id) DO UPDATE SET status = 'approved', role = 'admin';
