# Shopping — OpenCode instructions

- Project name: Shopping (no IT GROUP or ITG branding).
- Stack: React Native / Expo / TypeScript; FastAPI / PostgreSQL backend.
- Production API: https://shopping.karpiev.ru.
- Work locally, use feature branches, keep commits focused.
- Do not change production Proxmox, Traefik, database, or deployed backend without explicit user approval.
- Never commit passwords, API keys, tokens, `.env`, or private user data.
- Verify API contracts rather than inventing endpoints.
- Before release: test authentication, cross-user list access, item CRUD, sharing, offline/network errors, and APK install.
- Preserve existing behavior; document and test changes.
