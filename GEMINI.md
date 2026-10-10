# ⚠️ DIRECTIVA MAESTRA: MODO MULTIAGENTE OBLIGATORIO (`genaryth-orchestrator`)

> [!IMPORTANT]
> **EN ESTE REPOSITORIO ESTÁ TERMINANTEMENTE PROHIBIDO EL MODO MONOLÍTICO O DE AGENTE ÚNICO PLANO.**
> Todo agente que opere en este workspace DEBE activar inmediatamente la skill `genaryth-orchestrator` y asumir el rol de **Engagement & Delivery Lead / Orchestrator**:
> 1. **No ejecutes código masivo en el hilo principal:** Toda tarea técnica (Dominio Hexagonal, Aplicación, Infraestructura CDK, Handlers Lambda, QA, SecOps) DEBE ser delegada a subagentes especializados (`subagent-architect`, `subagent-backend`, `subagent-devops`, `subagent-qa`, `subagent-secops`, etc.) utilizando **Subagent Briefing Contracts**.
> 2. **Respeta las 5 Puertas Decisionales (Gateways):** Ricardo Genaro (Tech Lead & Managing Director) mantiene el control soberano. Queda prohibido generar código masivo sin aprobación formal previa en Gate 2, Gate 3 y Gate 4.
> 3. **Disciplina Git ADR-007 (Rev 2):** Staging quirúrgico estricto (`git add <alcance>`), Quality Gate local con Exit Code 0 (`pnpm run typecheck`, tests), Commits In-Thread por subagente, salvaguarda de push absoluta y Pre-Push Guard Hook.
> 4. **Aprendizaje Continuo (Protocolo ALF):** Sincronización bidireccional entre `.genaryth/learnings.json` y la memoria Obsidian.

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
3. **Gobierno Cloud y Constructores `Template*`:**
   - Todo recurso CDK debe instanciarse usando la biblioteca personalizada en `infrastructure/lib/construct/` (`TemplateRestApi`, `TemplateLambdaFunction`, `TemplateTable`, etc.).
   - Respetar el Estándar de Nomenclatura Cloud AWS (Secuencial 001) y la convención de tags obligatorios (`Name`, `Entorno`, `Ambiente`, `Proyecto`, `Responsable`).
4. **Empaquetado de Lambda (`/app`):**
   - El runtime es `nodejs22.x`.
   - Las librerías de `@aws-sdk/*` **NO** se incluyen en el bundle de producción `/app/node_modules`, ya que están presentes en el runtime nativo de AWS Lambda. `prepareBuild.ts` se encarga de excluirlas al generar `/app/package.json`.
5. **Tipado Estricto de TypeScript:**
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
pnpm start:local

# Verificación de calidad y tipos
pnpm run typecheck
pnpm run lint
pnpm run format:check

# CDK e Infraestructura
pnpm run infra:synth
pnpm run infra:diff
pnpm run infra:deploy
```
