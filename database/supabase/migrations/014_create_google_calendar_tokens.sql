-- Migration: Create user_google_tokens table for Google Calendar OAuth
-- This table stores encrypted OAuth tokens for Google Calendar integration

-- Create table for storing Google OAuth tokens
CREATE TABLE IF NOT EXISTS app.user_google_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- OAuth tokens (should be encrypted at application level for extra security)
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Google account info
    google_email TEXT,
    google_account_id TEXT,

    -- Calendar sync settings
    selected_calendar_ids JSONB DEFAULT '[]'::jsonb,
    sync_enabled BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,

    -- Ensure one token record per user
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id
    ON app.user_google_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_user_google_tokens_google_email
    ON app.user_google_tokens(google_email);

-- Enable RLS
ALTER TABLE app.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY user_google_tokens_select_own
    ON app.user_google_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY user_google_tokens_insert_own
    ON app.user_google_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY user_google_tokens_update_own
    ON app.user_google_tokens
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY user_google_tokens_delete_own
    ON app.user_google_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION app.update_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_google_tokens_updated_at
    BEFORE UPDATE ON app.user_google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION app.update_google_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE app.user_google_tokens IS
    'Stores Google OAuth tokens for Calendar integration. Tokens are encrypted at application level.';
