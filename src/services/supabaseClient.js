// ✅ src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zthqfysrjvjkypozoafd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aHFmeXNyanZqa3lwb3pvYWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTQ1NzcsImV4cCI6MjA2MjMzMDU3N30.yjC871-HRBBJXfub3L1M93kzx2xKsG2PbfX9Tv-lUxk';

export const supabase = createClient(supabaseUrl, supabaseKey);
