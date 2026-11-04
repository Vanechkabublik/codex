import dataSource from './data-source';
async function check(): Promise<void> {
  try {
    await dataSource.initialize();
    if (await dataSource.showMigrations())
      throw new Error('Pending migrations');
    const drift = await dataSource.driver.createSchemaBuilder().log();
    if (drift.upQueries.length) throw new Error('Entity/schema drift');
    console.log(
      'Migration check passed: no pending migrations and no entity/schema drift.',
    );
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}
void check().catch(() => {
  console.error(
    'Migration check failed: verify connection, pending migrations and entity/schema consistency.',
  );
  process.exitCode = 1;
});
