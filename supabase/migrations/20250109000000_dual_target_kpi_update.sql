/*
  # Dual Target KPI Update for Semester-Based Scoring
  
  This migration updates the DASHMON system to support semester-based KPI calculations
  as specified in the requirements, with both monthly and semester targets.
  
  Changes:
  1. Update kpi_definitions table to support dual targets
  2. Create new semester-based KPI definitions
  3. Update calculate_media_massa_scoring function for semester logic
  4. Add new scoring ranges based on semester targets
*/

-- Add new columns to kpi_definitions for dual targets
ALTER TABLE kpi_definitions 
ADD COLUMN IF NOT EXISTS monthly_target DECIMAL,
ADD COLUMN IF NOT EXISTS semester_target DECIMAL,
ADD COLUMN IF NOT EXISTS scoring_period TEXT DEFAULT 'monthly' CHECK (scoring_period IN ('monthly', 'semester'));

-- Update existing target_value to monthly_target for backward compatibility
UPDATE kpi_definitions 
SET monthly_target = target_value 
WHERE monthly_target IS NULL;

-- Create the new KPI definitions based on requirements

-- 1. KPI: Publikasi Siaran Pers Sub Holding
INSERT INTO kpi_definitions (
  name, code, description, monthly_target, semester_target, 
  weight_percentage, unit, calculation_type, scoring_period, is_active
) VALUES (
  'Publikasi Siaran Pers Sub Holding',
  'PUBLIKASI_SIARAN_PERS',
  'Menghitung jumlah tautan siaran pers yang valid dengan target 10 per bulan atau 60 per semester',
  10, 60, 30.0, 'siaran pers', 'count', 'semester', true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_target = EXCLUDED.monthly_target,
  semester_target = EXCLUDED.semester_target,
  weight_percentage = EXCLUDED.weight_percentage,
  unit = EXCLUDED.unit,
  calculation_type = EXCLUDED.calculation_type,
  scoring_period = EXCLUDED.scoring_period,
  is_active = EXCLUDED.is_active;

-- 2. KPI: Produksi Konten Media Sosial
INSERT INTO kpi_definitions (
  name, code, description, monthly_target, semester_target,
  weight_percentage, unit, calculation_type, scoring_period, is_active
) VALUES (
  'Produksi Konten Media Sosial',
  'PRODUKSI_KONTEN_MEDSOS',
  'Menghitung jumlah tautan konten media sosial yang valid dengan target 10 per bulan atau 60 per semester',
  10, 60, 20.0, 'konten', 'count', 'semester', true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_target = EXCLUDED.monthly_target,
  semester_target = EXCLUDED.semester_target,
  weight_percentage = EXCLUDED.weight_percentage,
  unit = EXCLUDED.unit,
  calculation_type = EXCLUDED.calculation_type,
  scoring_period = EXCLUDED.scoring_period,
  is_active = EXCLUDED.is_active;

-- 3. KPI: Skoring Hasil Publikasi Media Massa (Updated)
UPDATE kpi_definitions 
SET 
  name = 'Skoring Hasil Publikasi Media Massa',
  description = 'Penilaian hasil publikasi dengan sub-indikator Media Sosial (target 4.200 poin semester) dan Media Massa Gabungan (target 720.000 poin semester)',
  monthly_target = 120700, -- Combined monthly: 700 + 120.000
  semester_target = 724200, -- Combined semester: 4.200 + 720.000
  weight_percentage = 20.0,
  scoring_period = 'semester'
WHERE code = 'SKORING_PUBLIKASI_MEDIA';

-- 4. KPI: Pengelolaan Kampanye Komunikasi
INSERT INTO kpi_definitions (
  name, code, description, monthly_target, semester_target,
  weight_percentage, unit, calculation_type, scoring_period, is_active
) VALUES (
  'Pengelolaan Kampanye Komunikasi',
  'KAMPANYE_KOMUNIKASI',
  'Menghitung jumlah program kampanye komunikasi yang terlaksana dengan target 1 per semester',
  0.17, 1, 5.0, 'program', 'count', 'semester', true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_target = EXCLUDED.monthly_target,
  semester_target = EXCLUDED.semester_target,
  weight_percentage = EXCLUDED.weight_percentage,
  unit = EXCLUDED.unit,
  calculation_type = EXCLUDED.calculation_type,
  scoring_period = EXCLUDED.scoring_period,
  is_active = EXCLUDED.is_active;

-- 5. KPI: OFI to AFI
INSERT INTO kpi_definitions (
  name, code, description, monthly_target, semester_target,
  weight_percentage, unit, calculation_type, scoring_period, is_active
) VALUES (
  'OFI to AFI',
  'OFI_TO_AFI',
  'Menghitung jumlah program OFI to AFI yang terlaksana dengan target 1 per semester',
  0.17, 1, 5.0, 'program', 'count', 'semester', true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_target = EXCLUDED.monthly_target,
  semester_target = EXCLUDED.semester_target,
  weight_percentage = EXCLUDED.weight_percentage,
  unit = EXCLUDED.unit,
  calculation_type = EXCLUDED.calculation_type,
  scoring_period = EXCLUDED.scoring_period,
  is_active = EXCLUDED.is_active;

-- Update scoring ranges for new KPIs
DO $$
DECLARE
  kpi_uuid uuid;
BEGIN
  -- Publikasi Siaran Pers ranges
  SELECT id INTO kpi_uuid FROM kpi_definitions WHERE code = 'PUBLIKASI_SIARAN_PERS';
  IF FOUND THEN
    DELETE FROM kpi_scoring_ranges WHERE kpi_id = kpi_uuid;
    INSERT INTO kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) VALUES
    (kpi_uuid, 0, 25, 8),     -- 0-25% = 8% weight
    (kpi_uuid, 25, 50, 10),   -- 25-50% = 10% weight  
    (kpi_uuid, 50, 75, 15),   -- 50-75% = 15% weight
    (kpi_uuid, 75, 100, 30);  -- 75-100% = 30% weight
  END IF;

  -- Produksi Konten Media Sosial ranges
  SELECT id INTO kpi_uuid FROM kpi_definitions WHERE code = 'PRODUKSI_KONTEN_MEDSOS';
  IF FOUND THEN
    DELETE FROM kpi_scoring_ranges WHERE kpi_id = kpi_uuid;
    INSERT INTO kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) VALUES
    (kpi_uuid, 0, 25, 5),     -- 0-25% = 5% weight
    (kpi_uuid, 25, 50, 7),    -- 25-50% = 7% weight
    (kpi_uuid, 50, 75, 10),   -- 50-75% = 10% weight
    (kpi_uuid, 75, 100, 20);  -- 75-100% = 20% weight
  END IF;

  -- Skoring Publikasi Media Massa ranges (updated)
  SELECT id INTO kpi_uuid FROM kpi_definitions WHERE code = 'SKORING_PUBLIKASI_MEDIA';
  IF FOUND THEN
    DELETE FROM kpi_scoring_ranges WHERE kpi_id = kpi_uuid;
    INSERT INTO kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) VALUES
    (kpi_uuid, 0, 25, 5),     -- 0-25% = 5% weight
    (kpi_uuid, 25, 50, 7),    -- 25-50% = 7% weight
    (kpi_uuid, 50, 75, 10),   -- 50-75% = 10% weight
    (kpi_uuid, 75, 100, 20);  -- 75-100% = 20% weight
  END IF;

  -- Kampanye Komunikasi ranges
  SELECT id INTO kpi_uuid FROM kpi_definitions WHERE code = 'KAMPANYE_KOMUNIKASI';
  IF FOUND THEN
    DELETE FROM kpi_scoring_ranges WHERE kpi_id = kpi_uuid;
    INSERT INTO kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) VALUES
    (kpi_uuid, 0, 25, 1),     -- 0-25% = 1% weight
    (kpi_uuid, 25, 50, 2),    -- 25-50% = 2% weight
    (kpi_uuid, 50, 75, 3),    -- 50-75% = 3% weight
    (kpi_uuid, 75, 100, 5);   -- 75-100% = 5% weight
  END IF;

  -- OFI to AFI ranges
  SELECT id INTO kpi_uuid FROM kpi_definitions WHERE code = 'OFI_TO_AFI';
  IF FOUND THEN
    DELETE FROM kpi_scoring_ranges WHERE kpi_id = kpi_uuid;
    INSERT INTO kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) VALUES
    (kpi_uuid, 0, 25, 1),     -- 0-25% = 1% weight
    (kpi_uuid, 25, 50, 2),    -- 25-50% = 2% weight
    (kpi_uuid, 50, 75, 3),    -- 50-75% = 3% weight
    (kpi_uuid, 75, 100, 5);   -- 75-100% = 5% weight
  END IF;
END $$;

-- Update the calculate_media_massa_scoring function for semester-based calculation
CREATE OR REPLACE FUNCTION calculate_media_massa_scoring(report_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  media_counts JSONB;
  scoring_result JSONB;
  total_score DECIMAL := 0;
  media_type TEXT;
  count_val INTEGER;
  semester_target_val INTEGER;
  achievement_pct DECIMAL;
  score_val INTEGER;
  weight_pct DECIMAL;
  weighted_score DECIMAL;
  semester_start DATE;
  semester_end DATE;
  cumulative_count INTEGER;
BEGIN
  -- Get current semester boundaries (January-June or July-December)
  IF EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN
    semester_start := DATE_TRUNC('year', CURRENT_DATE);
    semester_end := semester_start + INTERVAL '5 months' + INTERVAL '1 month' - INTERVAL '1 day';
  ELSE
    semester_start := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months';
    semester_end := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '11 months' + INTERVAL '1 month' - INTERVAL '1 day';
  END IF;

  -- Get media counts from all approved reports in current semester
  SELECT jsonb_object_agg(media_type, total_count) INTO media_counts
  FROM (
    SELECT 
      media_type, 
      COUNT(*) as total_count
    FROM processed_media_items pmi
    INNER JOIN reports r ON pmi.report_id = r.id
    WHERE r.status = 'completed' 
      AND r.created_at >= semester_start 
      AND r.created_at <= semester_end
      AND pmi.is_valid = true 
      AND pmi.is_duplicate = false
    GROUP BY media_type
  ) counts;

  -- Initialize scoring_result
  scoring_result := jsonb_build_object(
    'semester_period', jsonb_build_object(
      'start', semester_start,
      'end', semester_end
    )
  );

  -- Calculate scores for each KPI based on new semester targets
  FOR media_type, count_val IN 
    SELECT * FROM jsonb_each_text(COALESCE(media_counts, '{}'::jsonb))
  LOOP
    -- Set semester targets based on KPI requirements
    CASE media_type
      -- Sub-indikator A: Media Sosial (Skor = Count × 50, Target: 4.200)
      WHEN 'social_media' THEN 
        semester_target_val := 4200;
        cumulative_count := count_val * 50; -- Each social media counts as 50 points
      
      -- Sub-indikator B: Media Massa Gabungan (Target: 720.000)
      WHEN 'online_news' THEN 
        semester_target_val := 720000;
        cumulative_count := count_val * 100; -- Media Online × 100
      WHEN 'radio' THEN 
        semester_target_val := 720000;
        cumulative_count := count_val * 50; -- Radio × 50
      WHEN 'print_media' THEN 
        semester_target_val := 720000;
        cumulative_count := count_val * 150; -- Media Cetak × 150
      WHEN 'running_text' THEN 
        semester_target_val := 720000;
        cumulative_count := count_val * 500; -- Running Text × 500
      WHEN 'tv' THEN 
        semester_target_val := 720000;
        cumulative_count := count_val * 600; -- Siaran TV × 600
      
      -- Other KPIs - direct count
      WHEN 'press_release' THEN 
        semester_target_val := 60; -- Publikasi Siaran Pers: 60/semester
        cumulative_count := count_val;
      WHEN 'campaign' THEN 
        semester_target_val := 1; -- Kampanye Komunikasi: 1/semester
        cumulative_count := count_val;
      WHEN 'ofi_afi' THEN 
        semester_target_val := 1; -- OFI to AFI: 1/semester
        cumulative_count := count_val;
      ELSE 
        semester_target_val := 100;
        cumulative_count := count_val;
    END CASE;

    -- Calculate achievement percentage based on semester targets
    achievement_pct := (cumulative_count::DECIMAL / semester_target_val::DECIMAL) * 100;
    
    -- Determine weight based on achievement and media type
    IF media_type IN ('social_media', 'online_news', 'radio', 'print_media', 'running_text', 'tv') THEN
      -- Skoring Publikasi Media Massa weights
      IF achievement_pct >= 75 THEN weight_pct := 20.0;
      ELSIF achievement_pct >= 50 THEN weight_pct := 10.0;
      ELSIF achievement_pct >= 25 THEN weight_pct := 7.0;
      ELSE weight_pct := 5.0;
      END IF;
    ELSIF media_type = 'press_release' THEN
      -- Publikasi Siaran Pers weights
      IF achievement_pct >= 75 THEN weight_pct := 30.0;
      ELSIF achievement_pct >= 50 THEN weight_pct := 15.0;
      ELSIF achievement_pct >= 25 THEN weight_pct := 10.0;
      ELSE weight_pct := 8.0;
      END IF;
    ELSIF media_type IN ('campaign', 'ofi_afi') THEN
      -- Kampanye and OFI weights
      IF achievement_pct >= 75 THEN weight_pct := 5.0;
      ELSIF achievement_pct >= 50 THEN weight_pct := 3.0;
      ELSIF achievement_pct >= 25 THEN weight_pct := 2.0;
      ELSE weight_pct := 1.0;
      END IF;
    ELSE
      weight_pct := 5.0; -- Default weight
    END IF;

    -- Calculate score value (1-5 based on achievement)
    IF achievement_pct >= 100 THEN score_val := 5;
    ELSIF achievement_pct >= 75 THEN score_val := 4;
    ELSIF achievement_pct >= 50 THEN score_val := 3;
    ELSIF achievement_pct >= 25 THEN score_val := 2;
    ELSE score_val := 1;
    END IF;

    weighted_score := weight_pct; -- Use the weight as final score for this implementation
    total_score := total_score + weighted_score;

    -- Store in scoring_result
    scoring_result := scoring_result || jsonb_build_object(
      media_type, jsonb_build_object(
        'semester_target', semester_target_val,
        'actual_count', count_val,
        'calculated_score', cumulative_count,
        'achievement_percentage', achievement_pct,
        'score_value', score_val,
        'weight_percentage', weight_pct,
        'weighted_score', weighted_score
      )
    );

    -- Insert or update scoring details
    INSERT INTO report_scoring_details (
      report_id, media_type, target_count, actual_count, 
      achievement_percentage, score_value, weight_percentage, weighted_score
    ) VALUES (
      report_id_param, media_type, semester_target_val, cumulative_count,
      achievement_pct, score_val, weight_pct, weighted_score
    ) ON CONFLICT (report_id, media_type) DO UPDATE SET
      target_count = EXCLUDED.target_count,
      actual_count = EXCLUDED.actual_count,
      achievement_percentage = EXCLUDED.achievement_percentage,
      score_value = EXCLUDED.score_value,
      weight_percentage = EXCLUDED.weight_percentage,
      weighted_score = EXCLUDED.weighted_score;
  END LOOP;

  -- Add total score to result
  scoring_result := scoring_result || jsonb_build_object('total_score', total_score);

  RETURN scoring_result;
END;
$$;

-- Create leaderboard_history table for tracking historical leaderboard scores
CREATE TABLE IF NOT EXISTS leaderboard_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sbu_name TEXT,
  score DECIMAL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_user_id ON leaderboard_history(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_period ON leaderboard_history(period_start, period_end);

-- Create app_settings table for persistent application/user settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  is_global BOOLEAN DEFAULT false,
  settings JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, is_global)
);
CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON app_settings(user_id);

-- Create enhanced notifications table for advanced notification system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  category TEXT NOT NULL CHECK (category IN ('upload', 'approval', 'rejection', 'system', 'kpi', 'report', 'deadline')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  action_text TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);