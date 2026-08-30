# Backup e restauração

## Uso individual com SQLite

`npm run local:start` cria automaticamente no máximo um backup por dia antes de iniciar o sistema. Por padrão são preservados os 30 backups mais recentes.

Para criar uma cópia adicional imediatamente:

```bash
npm run backup:sqlite -- --force
```

Cada cópia passa por uma verificação de integridade. Para restaurar, primeiro encerre o sistema:

```bash
npm run local:stop
npm run restore:sqlite -- --confirm backups/themuno-AAAAMMDDTHHMMSSZ.db
npm run local:start
```

Antes da substituição, a restauração cria automaticamente uma cópia adicional do banco atual. Confirme o funcionamento com `npm run local:status`.

As seções abaixo se aplicam somente a uma futura instalação com PostgreSQL.

## Política recomendada

- Backup completo diário e antes de cada implantação.
- Retenção: 7 diários, 4 semanais e 12 mensais.
- Cópia criptografada fora do servidor principal.
- Teste de restauração mensal em banco isolado.

## Criar backup

Com `pg_dump` instalado e `DATABASE_URL` apontando para o PostgreSQL:

```bash
scripts/backup-postgres.sh
```

O arquivo é criado em `backups/`, pasta ignorada pelo Git. Também é possível informar outra pasta como primeiro argumento.

## Restaurar

A restauração apaga e recria objetos existentes no banco indicado. Pare a aplicação, confirme que a URL aponta para o destino correto e execute:

```bash
scripts/restore-postgres.sh --confirm backups/themuno-AAAAMMDDTHHMMSSZ.dump
```

Depois, execute `npm run db:migrate:postgres`, inicie a aplicação e valide `/api/health`, totais financeiros e usuários autorizados.
