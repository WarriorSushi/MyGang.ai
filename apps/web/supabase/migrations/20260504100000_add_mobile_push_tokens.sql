-- Mobile push notification tokens (Expo Push Tokens).
-- Separate from push_subscriptions (which is W3C Web Push schema for browsers).
CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- Index for the common lookup: "give me all active tokens for this user"
CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user_id
  ON public.mobile_push_tokens(user_id);

-- RLS: users can only see/insert/delete their own tokens
ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own mobile push tokens"
  ON public.mobile_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS automatically for server-side push send/cleanup.

-- Auto-update the updated_at timestamp on row changes
CREATE TRIGGER mobile_push_tokens_updated_at
  BEFORE UPDATE ON public.mobile_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
