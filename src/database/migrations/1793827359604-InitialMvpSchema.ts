import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMvpSchema1793827359604 implements MigrationInterface {
  name = 'InitialMvpSchema1793827359604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('OFFER_OWNER', 'PRODUCT_MANAGER', 'ANALYST', 'OPERATIONS_MANAGER', 'CLIENT', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(254) NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."user_role" NOT NULL, CONSTRAINT "CHK_39d0ebe3a72c0fa29ddc0701f0" CHECK ("email" = lower("email")), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."offer_type" AS ENUM('PARTNER', 'INTERNAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."offer_status" AS ENUM('DRAFT', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'READY_TO_LAUNCH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ownerId" uuid NOT NULL, "title" character varying(200), "category" character varying(100), "type" "public"."offer_type", "cashbackPercent" numeric(5,2), "startsAt" TIMESTAMP WITH TIME ZONE, "endsAt" TIMESTAMP WITH TIME ZONE, "payoutLimit" numeric(18,2), "payoutSpent" numeric(18,2) NOT NULL DEFAULT '0', "mccCodes" text array NOT NULL DEFAULT '{}', "clientDescription" text, "status" "public"."offer_status" NOT NULL DEFAULT 'DRAFT', "roundNumber" integer NOT NULL DEFAULT '0', "version" integer NOT NULL, CONSTRAINT "CHK_52656e6af60aa474819fd6b075" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt"), CONSTRAINT "CHK_1bdabc072a6c6a73dfdeb8fa2c" CHECK ("payoutLimit" IS NULL OR "payoutLimit" > 0), CONSTRAINT "CHK_7086db29f881b581b353f2b2ad" CHECK ("cashbackPercent" IS NULL OR ("cashbackPercent" > 0 AND "cashbackPercent" <= 100)), CONSTRAINT "CHK_20ab90fd6d71a43a61e5b31019" CHECK ("payoutSpent" >= 0 AND ("payoutLimit" IS NULL OR "payoutSpent" <= "payoutLimit")), CONSTRAINT "PK_4c88e956195bba85977da21b8f4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b3d2e02b02f46a78defedc3650" ON "offers" ("ownerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a301d1d443898c8f032abf58d1" ON "offers" ("status", "startsAt", "endsAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "purchases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "clientId" uuid NOT NULL, "offerId" uuid NOT NULL, "reference" character varying(100) NOT NULL, "amount" numeric(18,2) NOT NULL, "mcc" character varying(4) NOT NULL, "purchasedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "CHK_adebc76eedf6ef77480179d2fd" CHECK ("mcc" ~ '^[0-9]{4}$'), CONSTRAINT "CHK_b1330501c283b485af9a74cddf" CHECK ("amount" > 0), CONSTRAINT "PK_1d55032f37a34c6eceacbbca6b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82a6025d70968bcc8870d3ab0e" ON "purchases" ("offerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_44ce96b069ec28e4a6dbdac307" ON "purchases" ("clientId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3da59467ce75255c15cfb284a2" ON "purchases" ("clientId", "reference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "offer_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "offerId" uuid NOT NULL, "actorId" uuid NOT NULL, "type" character varying(60) NOT NULL, "data" jsonb NOT NULL, CONSTRAINT "PK_2d8f1d0243ba9ef28afb61fd8d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73fae63e4e8884615e7c1f8cf2" ON "offer_events" ("offerId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "offer_revisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "offerId" uuid NOT NULL, "number" integer NOT NULL, "authorId" uuid NOT NULL, "snapshot" jsonb NOT NULL, CONSTRAINT "PK_837c283067d05e5018c7e6cc769" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d89113f3adb34bd300230108ef" ON "offer_revisions" ("offerId", "number") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."evaluation_result" AS ENUM('ACCRUED', 'DECLINED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cashback_reason" AS ENUM('OFFER_NOT_ACTIVATED', 'MCC_NOT_ELIGIBLE', 'OFFER_NOT_STARTED', 'OFFER_EXPIRED', 'OFFER_NOT_READY', 'PAYOUT_LIMIT_EXCEEDED', 'CASHBACK_ROUNDED_TO_ZERO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cashback_evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "purchaseId" uuid NOT NULL, "offerId" uuid NOT NULL, "revisionId" uuid, "result" "public"."evaluation_result" NOT NULL, "reason" "public"."cashback_reason", "explanation" text, "amount" numeric(18,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_6d502beb78b65f92787887c3262" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0b76acb7fb70aad25b381cac4a" ON "cashback_evaluations" ("purchaseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ef2d3ff1082f7430f12d09ce9" ON "cashback_evaluations" ("offerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cashback_accruals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "evaluationId" uuid NOT NULL, "purchaseId" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, CONSTRAINT "CHK_08e3da3ba606b5ea75565e69f4" CHECK ("amount" > 0), CONSTRAINT "PK_51b10c9131839d527d28dc80a98" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_95a1136249af0fad394147367d" ON "cashback_accruals" ("evaluationId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fafe798638a0adf27a81063afa" ON "cashback_accruals" ("purchaseId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9190032f6967b7971dca07d69f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78744bff965517952df6c02da7" ON "refresh_sessions" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "approval_rounds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "offerId" uuid NOT NULL, "revisionId" uuid NOT NULL, "number" integer NOT NULL, "closedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_4831d2eab643f0d490ea0b04543" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_704bb3bb41893359a90d089748" ON "approval_rounds" ("revisionId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "one_open_round_per_offer" ON "approval_rounds" ("offerId") WHERE "closedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e127a45dae7127aafa1b9cd637" ON "approval_rounds" ("offerId", "number") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."review_decision" AS ENUM('APPROVED', 'CHANGES_REQUESTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "roundId" uuid NOT NULL, "reviewerId" uuid NOT NULL, "reviewerRole" "public"."user_role" NOT NULL, "decision" "public"."review_decision" NOT NULL, "comment" text NOT NULL, CONSTRAINT "CHK_a6758b4997f25d65869d981824" CHECK (length(btrim("comment")) > 0), CONSTRAINT "CHK_d1df21ca3fe0c6ea8b8b8391c3" CHECK ("reviewerRole" IN ('PRODUCT_MANAGER', 'ANALYST', 'OPERATIONS_MANAGER')), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9238c3e3739dc40322f577fc4" ON "reviews" ("reviewerId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2087947c097c8af51096959b7a" ON "reviews" ("roundId", "reviewerRole") `,
    );
    await queryRunner.query(
      `CREATE TABLE "offer_activations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "clientId" uuid NOT NULL, "offerId" uuid NOT NULL, CONSTRAINT "PK_3a11d5314b091febe08c85ebad7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9358a1d999b9b926df2457654" ON "offer_activations" ("offerId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a727cda02178b3bd0fd902677b" ON "offer_activations" ("clientId", "offerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_b3d2e02b02f46a78defedc3650c" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_aa5c6e08be4d0718ac981749e14" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_82a6025d70968bcc8870d3ab0e9" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_events" ADD CONSTRAINT "FK_8314272bc7d0f27e9216ed8ee22" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_events" ADD CONSTRAINT "FK_a2caf73088d99dcd4bfeacc4849" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_revisions" ADD CONSTRAINT "FK_c875928b5cec111dfa25d700875" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_revisions" ADD CONSTRAINT "FK_fa925c00da7cac257882a5f099f" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_evaluations" ADD CONSTRAINT "FK_0b76acb7fb70aad25b381cac4a7" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_evaluations" ADD CONSTRAINT "FK_0ef2d3ff1082f7430f12d09ce9d" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_evaluations" ADD CONSTRAINT "FK_58b2c01ca6e6e06505098311e13" FOREIGN KEY ("revisionId") REFERENCES "offer_revisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_accruals" ADD CONSTRAINT "FK_95a1136249af0fad394147367d5" FOREIGN KEY ("evaluationId") REFERENCES "cashback_evaluations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_accruals" ADD CONSTRAINT "FK_fafe798638a0adf27a81063afa0" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_78744bff965517952df6c02da76" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_rounds" ADD CONSTRAINT "FK_c4755baeb420dde4971c54d50b6" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_rounds" ADD CONSTRAINT "FK_704bb3bb41893359a90d0897481" FOREIGN KEY ("revisionId") REFERENCES "offer_revisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_d7a99bc73209204b4c3256e4f3f" FOREIGN KEY ("roundId") REFERENCES "approval_rounds"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_f9238c3e3739dc40322f577fc46" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activations" ADD CONSTRAINT "FK_17bfa3931e5923ed218180b8b3e" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activations" ADD CONSTRAINT "FK_c9358a1d999b9b926df24576543" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "offer_activations" DROP CONSTRAINT "FK_c9358a1d999b9b926df24576543"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activations" DROP CONSTRAINT "FK_17bfa3931e5923ed218180b8b3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_f9238c3e3739dc40322f577fc46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_d7a99bc73209204b4c3256e4f3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_rounds" DROP CONSTRAINT "FK_704bb3bb41893359a90d0897481"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_rounds" DROP CONSTRAINT "FK_c4755baeb420dde4971c54d50b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_78744bff965517952df6c02da76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_accruals" DROP CONSTRAINT "FK_fafe798638a0adf27a81063afa0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_accruals" DROP CONSTRAINT "FK_95a1136249af0fad394147367d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_evaluations" DROP CONSTRAINT "FK_58b2c01ca6e6e06505098311e13"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_evaluations" DROP CONSTRAINT "FK_0ef2d3ff1082f7430f12d09ce9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cashback_evaluations" DROP CONSTRAINT "FK_0b76acb7fb70aad25b381cac4a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_revisions" DROP CONSTRAINT "FK_fa925c00da7cac257882a5f099f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_revisions" DROP CONSTRAINT "FK_c875928b5cec111dfa25d700875"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_events" DROP CONSTRAINT "FK_a2caf73088d99dcd4bfeacc4849"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offer_events" DROP CONSTRAINT "FK_8314272bc7d0f27e9216ed8ee22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_82a6025d70968bcc8870d3ab0e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_aa5c6e08be4d0718ac981749e14"`,
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_b3d2e02b02f46a78defedc3650c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a727cda02178b3bd0fd902677b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c9358a1d999b9b926df2457654"`,
    );
    await queryRunner.query(`DROP TABLE "offer_activations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2087947c097c8af51096959b7a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9238c3e3739dc40322f577fc4"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TYPE "public"."review_decision"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e127a45dae7127aafa1b9cd637"`,
    );
    await queryRunner.query(`DROP INDEX "public"."one_open_round_per_offer"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_704bb3bb41893359a90d089748"`,
    );
    await queryRunner.query(`DROP TABLE "approval_rounds"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78744bff965517952df6c02da7"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fafe798638a0adf27a81063afa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95a1136249af0fad394147367d"`,
    );
    await queryRunner.query(`DROP TABLE "cashback_accruals"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0ef2d3ff1082f7430f12d09ce9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0b76acb7fb70aad25b381cac4a"`,
    );
    await queryRunner.query(`DROP TABLE "cashback_evaluations"`);
    await queryRunner.query(`DROP TYPE "public"."cashback_reason"`);
    await queryRunner.query(`DROP TYPE "public"."evaluation_result"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d89113f3adb34bd300230108ef"`,
    );
    await queryRunner.query(`DROP TABLE "offer_revisions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73fae63e4e8884615e7c1f8cf2"`,
    );
    await queryRunner.query(`DROP TABLE "offer_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3da59467ce75255c15cfb284a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_44ce96b069ec28e4a6dbdac307"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82a6025d70968bcc8870d3ab0e"`,
    );
    await queryRunner.query(`DROP TABLE "purchases"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a301d1d443898c8f032abf58d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3d2e02b02f46a78defedc3650"`,
    );
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TYPE "public"."offer_status"`);
    await queryRunner.query(`DROP TYPE "public"."offer_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }
}
