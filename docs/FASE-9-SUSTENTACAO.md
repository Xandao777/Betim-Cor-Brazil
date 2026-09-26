# Fase 9 — Sustentação e recuperação

Esta fase reduz o risco operacional depois do lançamento sem contratar serviços externos.

## Backup verificável

Os backups novos exportados pelo painel incluem um checksum SHA-256. Antes de restaurar, o servidor confirma automaticamente que o conteúdo não foi truncado nem alterado. Backups antigos continuam aceitos e são identificados como legados, sem confirmação criptográfica de integridade.

Para verificar um arquivo sem restaurá-lo:

```sh
npm run check:backup -- backup-betim-cor-AAAA-MM-DD.json
```

Resultado esperado: `Backup válido`, `Integridade SHA-256: confirmada` e o número de coleções encontradas.

## Rotina mensal

1. Entrar no painel como administrador.
2. Baixar o backup JSON.
3. Executar a verificação acima.
4. Guardar uma cópia fora da Railway, em local privado e com acesso restrito.
5. Registrar a data e o responsável pela cópia.

## Recuperação

1. Confirmar que existe pelo menos um administrador real no sistema atual.
2. Verificar o arquivo offline.
3. No painel, escolher **Restaurar backup** e confirmar `RESTAURAR`.
4. Conferir homepage, eventos, formulários, membros e documentos.
5. Exportar um novo backup após a validação.

As senhas não são exportadas. Na restauração, o sistema preserva credenciais atuais que correspondam aos mesmos IDs ou nomes de utilizador. Registros sem credencial correspondente são ignorados e apresentados nos avisos da operação.

## Monitoramento mínimo

O endereço `/api/health` deve responder HTTP 200 com `ok: true`, `database: ok` e `backend: postgres`. Um monitor externo pode consultar esse endereço a cada cinco minutos, mas a contratação e o destino dos alertas dependem do responsável.

## Limites ainda existentes

- Os uploads continuam em disco efêmero até a configuração de volume ou S3/R2.
- O backup JSON protege os dados da aplicação, mas não substitui backup nativo do PostgreSQL.
- Um teste integral de recuperação em ambiente separado exige infraestrutura adicional e autorização.
