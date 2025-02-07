import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://flegqeqeymbaeuihmtyk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZWdxZXFleW1iYWV1aWhtdHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3MDI3NjIsImV4cCI6MjA1NDI3ODc2Mn0.ORCBPkV24UlBW8w2VtD_crFA4pyZ3m3j6wxx8UOvfH0'

export const supabase = createClient(supabaseUrl, supabaseKey) 