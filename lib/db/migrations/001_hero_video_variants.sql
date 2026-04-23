-- Adds multi-codec variant columns to the media table so hero slides can carry
-- a modern codec stack (AV1 WebM, VP9 WebM, mobile MP4) plus a poster image.
-- Apply via: turso db shell vietnoms < lib/db/migrations/001_hero_video_variants.sql
-- Safe to re-run: ALTER TABLE ADD COLUMN errors on a second run (column already
-- exists). Ignore the error, or skip re-running.

ALTER TABLE media ADD COLUMN blob_url_av1 TEXT;
ALTER TABLE media ADD COLUMN blob_url_webm TEXT;
ALTER TABLE media ADD COLUMN blob_url_mobile TEXT;
ALTER TABLE media ADD COLUMN poster_url TEXT;
