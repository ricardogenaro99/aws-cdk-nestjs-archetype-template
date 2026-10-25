# ⚠️ DIRECTIVA MAESTRA: MODO MULTIAGENTE OBLIGATORIO (`genaryth-orchestrator`)

> [!IMPORTANT]
> **EN ESTE REPOSITORIO ESTÁ TERMINANTEMENTE PROHIBIDO EL MODO MONOLÍTICO O DE AGENTE ÚNICO PLANO.**
> Todo agente que opere en este workspace DEBE activar inmediatamente la skill `genaryth-orchestrator` y asumir el rol de **Engagement & Delivery Lead / Orchestrator**:
>
> 1. **🚫 Regla de Manos Limpias (Hands-Off Code Rule):** El Orchestrator NUNCA debe tocar código fuente de aplicaciones o infraestructura (`app/**`, `infrastructure/**`, `src/**`). No existe tarea o hotfix demasiado pequeño: cualquier ajuste en constructs CDK, handlers Lambda o dominio hexagonal DEBE ser delegado al subagente especialista (`subagent-devops`, `subagent-backend`, etc.) mediante `invoke_subagent`. El Orchestrator solo edita `docs/**`, `.genaryth/**`, `GEMINI.md` y gestiona Git remoto.
> 2. **Transición Consulta a Despacho:** Cuando Ricardo Genaro pregunte dudas técnicas o plantee errores y luego apruebe (_"procede"_, _"adelante"_), el Orchestrator NO pica el código; redacta el Subagent Briefing Contract y dispara `invoke_subagent`.
> 3. **Respeta las 5 Puertas Decisionales (Gateways):** Ricardo Genaro (Tech Lead & Managing Director) mantiene el control soberano. Queda prohibido generar código masivo sin aprobación formal previa en Gate 2, Gate 3 y Gate 4.
> 4. **Disciplina Git ADR-007 (Rev 2):** Staging quirúrgico estricto (`git add <alcance>`), Quality Gate local con Exit Code 0 (`pnpm run typecheck`, tests), Commits In-Thread por subagente, salvaguarda de push absoluta y Pre-Push Guard Hook.
> 5. **Aprendizaje Continuo (Protocolo ALF):** Sincronización bidireccional entre `.genaryth/learnings.json` y la memoria Obsidian.
> 6. **Gobernanza Universal Multi-Agente (ADR-010):** `GEMINI.md` es el archivo canónico SSOT en la raíz. La compatibilidad con Claude Code, Cursor y OpenCode se garantiza mediante la Tríada de Symlinks Relativos POSIX (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`).
> 7. **Execution Harness & Guardrails (ADR-011):** Respeto estricto a las matrices de sandboxing (`interceptor-rules.json`), escaneo de pre-escritura contra fugas de secretos (AWS, Stripe, JWT), boundaries hexagonales puros y cuotas Cloud AWS (< 20 KB).

---

# GEMINI.md — REGLAS DEL PROYECTO & SSOT

## Repositorio: `aws-cdk-nestjs-archetype-template`

Este archivo es la directiva primaria de contexto y comportamiento para cualquier agente de IA o desarrollador que opere dentro de este repositorio.

---

## 1. Fuente Única de Verdad (SSOT)

Antes de realizar modificaciones estructurales, consulta la documentación viva:

- **Especificación Técnica y Arquitectura:** [`docs/CONTEXTO_MAESTRO.md`](docs/CONTEXTO_MAESTRO.md)
- **Detalle de Funcionamiento Real:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Catálogo de Hilos Operativos:** [`docs/OPERATING_THREADS.md`](docs/OPERATING_THREADS.md)
- **Instrucciones de Uso y Comandos:** [`README.md`](README.md)
- **Configuración de Plantilla Scaffolder:** [`template.config.json`](template.config.json)

---

## 2. Principios y Estándares de Ingeniería

1. **Clean Architecture & Hexagonal:**
   - La capa `domain/` no debe importar nada de AWS SDK ni de frameworks externos (excepto `@Injectable` de NestJS por pragmatismo).
   - Inversión de dependencias obligatoria usando tokens de inyección string (e.g. `'TaskRepository'`).
   - La capa `application/` orquesta la lógica y valida imperativamente.
   - La capa `infrastructure/` encapsula los clientes de AWS, DynamoDB DocumentClient y bootstrap Lambda.
2. **Serverless Ultraliviano (NestJS sin HTTP Server):**
   - **PROHIBIDO** inicializar adaptadores HTTP como Express o Fastify en el runtime de Lambda. Se debe utilizar únicamente `NestFactory.createApplicationContext(AppModule)` mediante el patrón singleton de `AppContextHelper`.
   - El enrutamiento se delega a **API Gateway REST** (no-proxy + VTL) que mapea el método y recurso a un parámetro `{ action, ... }`.
3. **Persistencia Dual & Topología Zero-Cost Serverless:**
   - Cómputo Lambda Core fuera de VPC (acceso directo a internet a costo $0.00 sin NAT Gateways ni ENI delay).
   - Base de datos dual: Contenedor Docker centralizado local (`localhost:5432`) y PostgreSQL Serverless Cloud (Neon / Supabase con PgBouncer).
   - Separación de connection pooling en Prisma: `DATABASE_URL` (puerto 6543 con PgBouncer para runtime serverless) vs `DIRECT_URL` (puerto 5432 sin pooler para Prisma CLI / DDL).
   - **PROHIBIDO** ejecutar migraciones DDL en caliente (`CREATE TABLE`, `CREATE TYPE`, `ensureSchemaAndSeed`) en el bootstrap de la Lambda (`onModuleInit`); el DDL pertenece exclusivamente a los pipelines de despliegue (`prisma db push / migrate`).
   - Gestión de secretos vía AWS SSM Parameter Store Standard (`ssm.StringParameter` a costo $0.00/mes), erradicando el uso de AWS Secrets Manager ($0.40/mes).
4. **Gobierno Cloud y Constructores `Template*`:**
   - Todo recurso CDK debe instanciarse usando la biblioteca personalizada en `infrastructure/lib/construct/` (`TemplateRestApi`, `TemplateLambdaFunction`, `TemplateTable`, etc.).
   - Respetar el Estándar de Nomenclatura Cloud AWS (Secuencial 001) y la convención de tags obligatorios (`Name`, `Entorno`, `Ambiente`, `Proyecto`, `Responsable`).
   - Resolver posibles colisiones en CloudFormation por recursos retenidos con `RemovalPolicy.RETAIN` (S3 Buckets o DynamoDB en PROD) parametrizando sufijos únicos o limpieza previa.
5. **Empaquetado de Lambda (`/app`):**
   - El runtime es `nodejs22.x`.
   - Las librerías de `@aws-sdk/*` **NO** se incluyen en el bundle de producción `/app/node_modules`, ya que están presentes en el runtime nativo de AWS Lambda. `prepareBuild.ts` se encarga de excluirlas al generar `/app/package.json`.
6. **Tipado Estricto de TypeScript:**
   - No usar `any` salvo en límites externos de serialización justificados.
   - Correr `pnpm run typecheck` antes de dar por finalizada cualquier tarea.

---

## 3. Convención de Commits y Protocolo Git Anti-Chancado

El repositorio cuenta con hooks de Husky (`pre-commit` con `tsc` y `commit-msg` con `commitlint`). Todos los commits deben apegarse estrictamente a la especificación Conventional Commits:

- `feat(core): ...` / `fix(core): ...` → Cambios en middlewares o núcleo común.
- `feat(domain): ...` / `fix(domain): ...` → Lógica de negocio hexagonal.
- `feat(infra): ...` / `fix(infra): ...` → Constructores o stacks CDK.
- `feat(scaffold): ...` / `fix(scaffold): ...` → Configuración de plantilla o scripts de build.
- `docs(ssot): ...` → Documentación en `docs/` o markdown maestros.
- `test(core): ...` / `test(infra): ...` → Pruebas unitarias o de integración.

---

## 4. Comandos Frecuentes

```bash
# Desarrollo local
pnpm install
pnpm run dev

# Verificación de calidad y tipos (Quality Gate Local)
pnpm run ci:local         # Runner completo (Arnés + Tipos + Lint + Formato + Test + CDK Synth)
pnpm run ci:local:fast    # Runner rápido (Arnés + Tipos + Lint)
pnpm run typecheck
pnpm run lint
pnpm run format:check

# CDK e Infraestructura
pnpm run infra:synth
pnpm run infra:diff
pnpm run infra:deploy
```
