-- Make category optional on pca_records
ALTER TABLE "pca_records" ALTER COLUMN "category" DROP NOT NULL;

-- Rename IR status Closed to N/A
UPDATE "pca_records" SET "ir_status" = 'N/A' WHERE "ir_status" = 'Closed';
