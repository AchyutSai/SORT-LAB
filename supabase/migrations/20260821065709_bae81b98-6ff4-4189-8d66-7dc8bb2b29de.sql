CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.benchmark_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_name VARCHAR(100) NOT NULL,
  array_distribution VARCHAR(50) NOT NULL,
  max_input_size INT NOT NULL,
  step_size INT NOT NULL,
  repeats INT NOT NULL DEFAULT 3,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benchmark_runs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmark_runs TO authenticated;
GRANT ALL ON public.benchmark_runs TO service_role;
ALTER TABLE public.benchmark_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_public_read" ON public.benchmark_runs FOR SELECT USING (is_public = true);
CREATE POLICY "runs_owner_read" ON public.benchmark_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "runs_owner_insert" ON public.benchmark_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_owner_update" ON public.benchmark_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_owner_delete" ON public.benchmark_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.benchmark_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.benchmark_runs(id) ON DELETE CASCADE,
  algorithm_name VARCHAR(50) NOT NULL,
  input_size INT NOT NULL,
  execution_time_ms DOUBLE PRECISION NOT NULL,
  comparisons BIGINT,
  swaps BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benchmark_metrics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmark_metrics TO authenticated;
GRANT ALL ON public.benchmark_metrics TO service_role;
ALTER TABLE public.benchmark_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_public_read" ON public.benchmark_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.benchmark_runs r WHERE r.id = run_id AND r.is_public = true)
);
CREATE POLICY "metrics_owner_all" ON public.benchmark_metrics FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.benchmark_runs r WHERE r.id = run_id AND r.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.benchmark_runs r WHERE r.id = run_id AND r.user_id = auth.uid())
);

CREATE INDEX idx_metrics_run ON public.benchmark_metrics(run_id);
CREATE INDEX idx_runs_user ON public.benchmark_runs(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON public.benchmark_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Anonymous'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();