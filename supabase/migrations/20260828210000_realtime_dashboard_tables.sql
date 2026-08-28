-- Enable Supabase Realtime for dashboard live updates (bookings + conversations).
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.conversations;
