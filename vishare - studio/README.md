# VidShare - Video Sharing Platform

A modern video sharing platform built with HTML, CSS, JavaScript, and Supabase.

## Setup Instructions

1. Create a Supabase Project:
   - Go to [Supabase](https://supabase.com) and create a new project
   - Note down your project URL and anon key

2. Set up the Database:
   - Go to the SQL editor in your Supabase dashboard
   - Copy the contents of `supabase/schema.sql` and run it in the SQL editor
   - This will create the necessary tables and set up storage

3. Configure Storage:
   - Go to Storage in your Supabase dashboard
   - Verify that the 'videos' bucket was created
   - The bucket should be public for video playback to work

4. Install Dependencies:
   ```bash
   npm install
   ```

5. Start the Development Server:
   ```bash
   npm start
   ```

6. Open your browser and navigate to `http://localhost:8080`

## Features

- User authentication (signup/login)
- Video upload with title and description
- Video management (view, delete)
- Responsive design
- Modern UI/UX

## Security

- Row Level Security (RLS) policies ensure users can only modify their own content
- Storage policies restrict upload/delete operations to authenticated users
- Public read access for videos enables seamless playback

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Supabase (Backend as a Service)
  - Auth
  - Database
  - Storage
- Font Awesome (Icons)
