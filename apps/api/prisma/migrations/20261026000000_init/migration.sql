-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "StudyPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudyTaskStatus" AS ENUM ('TODO', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FeedbackTag" AS ENUM ('AI_PERFORMANCE', 'STUDY_PLAN', 'UI_UX', 'LEARNING_ANALYTICS', 'OTHER');

-- CreateEnum
CREATE TYPE "AIRequestStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ContextType" AS ENUM ('STUDY_PLAN_PREVIEW', 'STUDY_PLAN_ADJUSTMENT', 'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_ANALYSIS');

-- CreateEnum
CREATE TYPE "ContextStatus" AS ENUM ('OPEN', 'CONSUMED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "teacher_id" UUID NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_members" (
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,

    CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id","student_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "evaluated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plans" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "available_minutes_per_week" INTEGER NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "end_date" TIMESTAMPTZ(3) NOT NULL,
    "status" "StudyPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_tasks" (
    "id" UUID NOT NULL,
    "study_plan_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "expected_minutes" INTEGER NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "StudyTaskStatus" NOT NULL DEFAULT 'TODO',
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "study_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_analysis_reports" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "analysis_result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tag" "FeedbackTag" NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_analyses" (
    "id" UUID NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "analysis_result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_request_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "status" "AIRequestStatus" NOT NULL,
    "error_code" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporary_contexts" (
    "id" UUID NOT NULL,
    "opaque_ref" TEXT NOT NULL,
    "context_type" "ContextType" NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "resource_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ContextStatus" NOT NULL DEFAULT 'OPEN',
    "request_fingerprint" TEXT,
    "replay_result" JSONB,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "retention_until" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "temporary_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id");

-- CreateIndex
CREATE INDEX "class_members_student_id_idx" ON "class_members"("student_id");

-- CreateIndex
CREATE INDEX "topics_course_id_idx" ON "topics"("course_id");

-- CreateIndex
CREATE INDEX "assessment_results_student_id_topic_id_evaluated_at_idx" ON "assessment_results"("student_id", "topic_id", "evaluated_at" DESC);

-- CreateIndex
CREATE INDEX "study_plans_student_id_status_idx" ON "study_plans"("student_id", "status");

-- CreateIndex
CREATE INDEX "study_plans_student_id_created_at_idx" ON "study_plans"("student_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "study_tasks_study_plan_id_status_idx" ON "study_tasks"("study_plan_id", "status");

-- CreateIndex
CREATE INDEX "study_tasks_study_plan_id_due_date_idx" ON "study_tasks"("study_plan_id", "due_date");

-- CreateIndex
CREATE INDEX "study_tasks_topic_id_idx" ON "study_tasks"("topic_id");

-- CreateIndex
CREATE INDEX "class_analysis_reports_class_id_created_at_idx" ON "class_analysis_reports"("class_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_tag_created_at_idx" ON "feedback"("tag", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_rating_created_at_idx" ON "feedback"("rating", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_user_id_created_at_idx" ON "feedback"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_analyses_created_at_idx" ON "feedback_analyses"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_request_logs_status_idx" ON "ai_request_logs"("status");

-- CreateIndex
CREATE INDEX "ai_request_logs_created_at_idx" ON "ai_request_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_request_logs_feature_created_at_idx" ON "ai_request_logs"("feature", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_request_logs_user_id_created_at_idx" ON "ai_request_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "temporary_contexts_opaque_ref_key" ON "temporary_contexts"("opaque_ref");

-- CreateIndex
CREATE INDEX "temporary_contexts_owner_user_id_context_type_status_idx" ON "temporary_contexts"("owner_user_id", "context_type", "status");

-- CreateIndex
CREATE INDEX "temporary_contexts_status_expires_at_idx" ON "temporary_contexts"("status", "expires_at");

-- CreateIndex
CREATE INDEX "temporary_contexts_retention_until_idx" ON "temporary_contexts"("retention_until");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_study_plan_id_fkey" FOREIGN KEY ("study_plan_id") REFERENCES "study_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_analysis_reports" ADD CONSTRAINT "class_analysis_reports_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_contexts" ADD CONSTRAINT "temporary_contexts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The database design requires arbitrary score scale; Prisma's Decimal default is bounded.
ALTER TABLE "assessment_results" ALTER COLUMN "score" TYPE numeric USING "score"::numeric;

ALTER TABLE "users" ADD CONSTRAINT "ck_users_email_normalized" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "assessment_results" ADD CONSTRAINT "ck_assessment_results_score_range" CHECK ("score" >= 0 AND "score" <= 100);
ALTER TABLE "study_plans" ADD CONSTRAINT "ck_study_plans_title_not_blank" CHECK (char_length(btrim("title")) > 0);
ALTER TABLE "study_plans" ADD CONSTRAINT "ck_study_plans_available_minutes_positive" CHECK ("available_minutes_per_week" > 0);
ALTER TABLE "study_plans" ADD CONSTRAINT "ck_study_plans_goal_not_blank" CHECK (char_length(btrim("goal")) > 0);
ALTER TABLE "study_plans" ADD CONSTRAINT "ck_study_plans_date_range" CHECK ("end_date" > "start_date");
CREATE UNIQUE INDEX "uq_study_plans_one_current_per_student" ON "study_plans"("student_id") WHERE "status" IN ('ACTIVE', 'COMPLETED');
ALTER TABLE "study_tasks" ADD CONSTRAINT "ck_study_tasks_title_not_blank" CHECK (char_length(btrim("title")) > 0);
ALTER TABLE "study_tasks" ADD CONSTRAINT "ck_study_tasks_expected_minutes_positive" CHECK ("expected_minutes" > 0);
ALTER TABLE "study_tasks" ADD CONSTRAINT "ck_study_tasks_completed_at_status" CHECK (("status" = 'TODO' AND "completed_at" IS NULL) OR ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL));
ALTER TABLE "feedback" ADD CONSTRAINT "ck_feedback_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "feedback" ADD CONSTRAINT "ck_feedback_content_not_blank" CHECK (char_length(btrim("content")) > 0);
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ck_ai_request_logs_duration_nonnegative" CHECK ("duration_ms" IS NULL OR "duration_ms" >= 0);
ALTER TABLE "temporary_contexts" ADD CONSTRAINT "ck_temporary_contexts_status_replay" CHECK (("status" = 'OPEN' AND "consumed_at" IS NULL AND "replay_result" IS NULL) OR ("status" = 'CONSUMED' AND "consumed_at" IS NOT NULL AND "replay_result" IS NOT NULL));
ALTER TABLE "temporary_contexts" ADD CONSTRAINT "ck_temporary_contexts_retention" CHECK ("retention_until" >= "expires_at" AND ("status" <> 'CONSUMED' OR "retention_until" >= "consumed_at" + INTERVAL '10 minutes'));
