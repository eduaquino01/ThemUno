# Operação em produção

## Arquitetura recomendada

- Aplicação Next.js executada pelo container `app` como usuário sem privilégios.
- PostgreSQL persistente no serviço `postgres`.
- Migrações aplicadas uma única vez pelo serviço `migrate`, antes da aplicação iniciar.
- Verificação de disponibilidade em `GET /api/health`.

O SQLite permanece disponível apenas para desenvolvimento local. O schema PostgreSQL é gerado a partir do schema principal por `npm run db:generate:postgres`, evitando duas definições de negócio divergentes.

## Preparação

1. Copie `.env.example` para `.env.production` fora do controle de versão.
2. Troque todas as senhas e gere `CREDENTIAL_ENCRYPTION_KEY` com pelo menos 32 caracteres aleatórios.
3. Restrinja o acesso à porta 5432; no Compose ela é exposta apenas em `127.0.0.1`.
4. Configure TLS no proxy reverso e encaminhe somente as portas 80/443.

## Implantação com Docker Compose

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
curl --fail http://127.0.0.1:3000/api/health
```

O serviço `migrate` usa as migrações de `prisma/migrations-postgresql`. Nunca use `prisma db push` em produção.

## Monitoramento mínimo

- Consultar `/api/health` a cada 30 segundos e alertar após três falhas.
- Alertar para uso de disco acima de 80%, CPU sustentada acima de 85% e conexões PostgreSQL acima de 80% do limite.
- Centralizar os logs dos containers e reter pelo menos 30 dias.
- Monitorar erros HTTP 5xx, tempo de resposta e falhas de login, sem registrar senhas, cookies ou segredos.

## Checklist de nova versão

1. `npm ci`
2. `npx prisma generate`
3. `npm run typecheck`
4. `npm run lint`
5. `npm test`
6. `npm run build -- --webpack`
7. Criar backup do banco.
8. Aplicar migrações PostgreSQL.
9. Implantar a aplicação e validar `/api/health`, login e uma consulta financeira somente leitura.

Em caso de falha, reverta a imagem da aplicação. Migrações destrutivas exigem um plano específico de reversão e ensaio prévio em uma cópia do banco.
