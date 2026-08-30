# ThemUno

Sistema multiempresa para gestão contratual, administrativa e financeira, desenvolvido com Next.js, React, TypeScript, Prisma e PostgreSQL/SQLite.

## Recursos principais

- Autenticação, perfis de acesso e isolamento por empresa.
- Contas a pagar e receber, aprovações e conciliação bancária.
- Centros de custo, orçamentos, rateios, DRE e fechamento mensal.
- Fluxo de caixa, cenários de projeção e relatórios executivos.
- Catálogos administrativos, auditoria e cofre de credenciais criptografado.

## Desenvolvimento local

Requisitos: Node.js 22 e npm.

```bash
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev
```

O ambiente local usa SQLite em `dev.db`. O seed exige `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `CREDENTIAL_ENCRYPTION_KEY`; não existem credenciais padrão.

### Uso diário individual

Depois da instalação inicial, use estes três comandos:

```bash
npm run local:start   # cria o backup diário e inicia o sistema
npm run local:status  # verifica servidor, banco e último backup
npm run local:stop    # encerra o sistema com segurança
```

O sistema fica disponível em [http://127.0.0.1:3000](http://127.0.0.1:3000). Os logs locais ficam em `.themuno/dev.log` e os 30 backups mais recentes em `backups/`; ambas as pastas são ignoradas pelo Git.

Para criar ou atualizar somente o administrador sem apagar dados:

```bash
npm run admin:create
```

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build -- --webpack
```

## Produção

Produção usa PostgreSQL e imagem Docker sem privilégios. Consulte [operação em produção](docs/production.md) e [backup e restauração](docs/backup-restore.md).
