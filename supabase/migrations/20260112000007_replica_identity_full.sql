-- Enable full replica identity to allow real-time listeners to see old values
ALTER TABLE user_profiles REPLICA IDENTITY FULL;
