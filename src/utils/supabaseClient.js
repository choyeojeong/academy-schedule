import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aazqgrsrbkyfjeehokge.supabase.co'; // 실제 프로젝트 URL
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenFncnNyYmt5ZmplZWhva2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMjUyMTgsImV4cCI6MjA2MjYwMTIxOH0.TeIjaRal5EW81HazGw19NcqUrxNyWdqQjzbHif8094Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
