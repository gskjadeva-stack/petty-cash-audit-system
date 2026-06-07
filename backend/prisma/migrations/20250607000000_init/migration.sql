-- CreateTable
CREATE TABLE "pca_records" (
    "id" TEXT NOT NULL,
    "record_number" TEXT,
    "title" TEXT NOT NULL,
    "site_office" TEXT NOT NULL,
    "audit_date" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "issue_type" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "description" TEXT NOT NULL,
    "amount_involved" DOUBLE PRECISION,
    "resolution_date" TEXT,
    "corrective_action" TEXT,
    "assigned_to" TEXT,
    "ir_status" TEXT NOT NULL DEFAULT 'Not Filed',
    "need_ir_filing" BOOLEAN NOT NULL DEFAULT false,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pca_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pcf_cash_counts" (
    "id" TEXT NOT NULL,
    "tally_number" TEXT,
    "site_office" TEXT NOT NULL,
    "audit_date" TEXT NOT NULL,
    "auditor_name" TEXT,
    "fund_type" TEXT,
    "revolving_fund" DOUBLE PRECISION NOT NULL,
    "beginning_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beginning_balance_as_of" TEXT,
    "total_expense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_expense_as_of" TEXT,
    "bills_1000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bills_500" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bills_200" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bills_100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bills_50" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bills_20" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_20" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_10" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_5" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_025" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_010" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coins_005" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gcash_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atm_bank_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "by_hand_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pcf_cash_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pcf_disbursements" (
    "id" TEXT NOT NULL,
    "cash_count_id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "remittance_status" TEXT NOT NULL DEFAULT 'Not Remitted',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pcf_disbursements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_offices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT,
    "manager" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_offices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "pca_record_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_name" TEXT,
    "author_role" TEXT,
    "tagged_users" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parent_comment_id" TEXT,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "pca_record_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_email" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_record_id" TEXT,
    "trigger_event" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_schedules" (
    "id" TEXT NOT NULL,
    "site_office" TEXT NOT NULL,
    "scheduled_date" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'Monthly',
    "assigned_auditor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "reason" TEXT,
    "notes" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "pca_record_id" TEXT NOT NULL,
    "issue_description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "notes" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);
