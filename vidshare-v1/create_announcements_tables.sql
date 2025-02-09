-- Create announcements table
create table announcements (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    content text not null,
    type text check (type in ('info', 'warning', 'update', 'event')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create announcement reads table
create table announcement_reads (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    announcement_id uuid references announcements not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, announcement_id)
);

-- Enable RLS
alter table announcements enable row level security;
alter table announcement_reads enable row level security;

-- Announcements policies
create policy \
Announcements
are
viewable
by
all
authenticated
users\
on announcements for select
to authenticated
using (true);

-- Allow admins to insert announcements (you'll need to modify this based on your needs)
create policy \Admins
can
insert
announcements\
on announcements for insert
to authenticated
using (true);

-- Announcement reads policies
create policy \Users
can
insert
their
own
read
status\
on announcement_reads for insert
to authenticated
using (auth.uid() = user_id);

create policy \Users
can
view
their
own
read
status\
on announcement_reads for select
to authenticated
using (auth.uid() = user_id);

-- Insert a test announcement
insert into announcements (title, content, type)
values (
    'Welcome to VidShare!',
    'We are excited to launch our new video sharing platform. Stay tuned for more updates!',
    'info'
);
