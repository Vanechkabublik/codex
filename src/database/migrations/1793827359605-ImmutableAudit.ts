import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImmutableAudit1793827359605 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit and financial records are immutable'; END; $$`,
    );
    for (const table of [
      'offer_revisions',
      'offer_events',
      'reviews',
      'purchases',
      'cashback_evaluations',
      'cashback_accruals',
    ]) {
      await queryRunner.query(
        `CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation()`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE cashback_evaluations ADD CONSTRAINT evaluation_outcome_consistent CHECK ((result = 'ACCRUED' AND reason IS NULL AND explanation IS NULL AND amount > 0 AND "revisionId" IS NOT NULL) OR (result = 'DECLINED' AND reason IS NOT NULL AND explanation IS NOT NULL AND amount = 0))`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE cashback_evaluations DROP CONSTRAINT evaluation_outcome_consistent',
    );
    for (const table of [
      'offer_revisions',
      'offer_events',
      'reviews',
      'purchases',
      'cashback_evaluations',
      'cashback_accruals',
    ]) {
      await queryRunner.query(`DROP TRIGGER immutable_record ON "${table}"`);
    }
    await queryRunner.query('DROP FUNCTION prevent_audit_mutation()');
  }
}
