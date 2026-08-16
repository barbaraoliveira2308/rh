const currentDb = process.env.POSTGRES_DB;

if (!currentDb || currentDb === 'srh') {
  // eslint-disable-next-line no-console
  console.warn(
    `[e2e] POSTGRES_DB era "${currentDb ?? '(não definido)'}" — forçado para "srh_test" ` +
      'para nunca apagar a base de dados de desenvolvimento partilhada (ver R-046).',
  );
  process.env.POSTGRES_DB = 'srh_test';
}
