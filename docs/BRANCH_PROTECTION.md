# 🛡️ Branch Protection — Configuração Recomendada

Para garantir qualidade e seguir o Git Flow, configure as proteções via **GitHub → Settings → Branches**.

## 🔴 Branch `main` (produção)

| Configuração | Valor |
|---|---|
| ☑️ Require pull request before merging | Ativado |
| ☑️ Require 1 approval | Ativado |
| ☑️ Require review from Code Owners | Ativado |
| ☑️ Require status checks (build) | Ativado |
| ☑️ Require branches to be up to date | Ativado |
| ☑️ Require linear history | Ativado |
| ☑️ Include administrators | Ativado |
| ☐ Allow force pushes | Desativado |
| ☐ Allow deletions | Desativado |

## 🟡 Branch `develop` (integração)

| Configuração | Valor |
|---|---|
| ☑️ Require pull request before merging | Ativado |
| ☑️ Require 1 approval | Ativado (ou 0 se solo) |
| ☑️ Require status checks | Ativado |
| ☐ Allow force pushes | Desativado |

## Fluxo

```
feature/xyz ──PR──> develop ──PR──> main
                     │                │
                  [staging]      [produção]
```

## Configuração rápida via GitHub CLI

```bash
gh api --method PUT \
  /repos/ivamartins/whatsapp-grok-bot/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":["Test (Node 20)"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}'
```
