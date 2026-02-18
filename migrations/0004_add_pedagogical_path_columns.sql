-- Add pedagogical learning path columns to roadmap_nodes
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "phase_id" text;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "unit_id" text;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "week_range" text;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "chapter" text;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "article_refs" jsonb;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "node_type" text;
ALTER TABLE "roadmap_nodes" ADD COLUMN IF NOT EXISTS "path_type" text;

-- Mark existing nodes as syllabus-based
UPDATE "roadmap_nodes" SET "path_type" = 'syllabus' WHERE "path_type" IS NULL;

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS "idx_roadmap_phase_id" ON "roadmap_nodes" ("phase_id");
CREATE INDEX IF NOT EXISTS "idx_roadmap_path_type" ON "roadmap_nodes" ("path_type");
