# CATÁLOGO DE HILOS OPERATIVOS — GASF

## Squad de Ingeniería: `aws-cdk-nestjs-archetype-template`

> **Framework:** Genaryth Autonomous Squad Framework (GASF)  
> **Propósito:** Mantener, robustecer y evolucionar el arquetipo base de microservicios serverless en AWS y asegurar la compatibilidad con `@ricardogenaro99/scaffolder`.

---

## 1. Convención Semántica de Commits por Hilo

Para garantizar trazabilidad, prevenir colisiones de ramas y auditar cambios, cada hilo tiene asignado un prefijo de commit inmutable:

| Prefijo de Commit                    | Ámbito / Módulo Principal                            | Hilo Asignado                          |
| :----------------------------------- | :--------------------------------------------------- | :------------------------------------- |
| `feat(core):` / `fix(core):`         | `src/common/core/`, middlewares, exceptions          | **Core Runtime & Bootstrap**           |
| `feat(domain):` / `fix(domain):`     | `src/task-manager/`, nuevos dominios                 | **Backend & Hexagonal Architecture**   |
| `feat(infra):` / `fix(infra):`       | `infrastructure/lib/construct/`, `config.ts`, stacks | **DevOps & Cloud Architecture**        |
| `feat(scaffold):` / `fix(scaffold):` | `template.config.json`, scripts de build, CLI compat | **Scaffolding & Developer Experience** |
| `test(core):` / `test(infra):`       | Pruebas unitarias, e2e, CDK synth tests              | **QA & Cloud Performance**             |
| `docs(ssot):`                        | `docs/`, `GEMINI.md`, `README.md`, `ARCHITECTURE.md` | **Lead Architect & Custodian**         |

---

## 2. Catálogo de Hilos Especializados

### 1. 🏗️ ARCHETYPE - Lead Architect & Custodian

- **Responsabilidad:** Custodia de la SSOT, gobernanza de decisiones arquitectónicas (ADRs), revisión de estándares de código, mantenimiento de `GEMINI.md`, `ARCHITECTURE.md` y `docs/CONTEXTO_MAESTRO.md`.
- **Ámbitos:** Raíz, `docs/`, `package.json`, `.husky/`.
- **Modelo Recomendado:** **Gemini Pro / Sonnet** (Razonamiento profundo, alineación estratégica y consistencia de diseño).

### 2. ⚡ ARCHETYPE - Core Runtime & Bootstrap

- **Responsabilidad:** Mantenimiento del pipeline de ejecución serverless: middlewares middy (`requestMiddleware`, `ssmMiddleware`, `eventSourceMiddleware`), `AsyncLocalStorage`, logging transversal, catálogo de excepciones `ECORE-*` y bootstrap de NestJS (`AppContextHelper`, `HandlerCore`).
- **Ámbitos:** `src/common/`, `src/**/infrastructure/bootstrap/`.
- **Modelo Recomendado:** **Gemini 3.8 Flash** (Óptimo para código TypeScript conciso, tipado estricto y resolución ágil de bugs).

### 3. 🧩 ARCHETYPE - Backend & Hexagonal Architecture

- **Responsabilidad:** Implementación y evolución de dominios de negocio bajo Arquitectura Hexagonal (Domain, Application, Infrastructure), modelos de datos DynamoDB, validaciones y adaptadores. Creación de nuevos dominios de ejemplo.
- **Ámbitos:** `src/task-manager/`, `src/[nuevo-dominio]/`.
- **Modelo Recomendado:** **Gemini 3.8 Flash** (Velocidad, refactorización modular y DTOs).

### 4. ☁️ ARCHETYPE - DevOps & Cloud Architecture

- **Responsabilidad:** Evolución de la biblioteca de constructores AWS CDK v2 (`TemplateRestApi`, `TemplateLambdaFunction`, `TemplateTable`, etc.), estricto apego al Estándar de Nomenclatura Cloud AWS (Secuencial 001), tagging obligatorio, políticas de retención y mapeos VTL en API Gateway.
- **Ámbitos:** `infrastructure/`, `run-cdk.ts`.
- **Modelo Recomendado:** **Gemini Pro** (Diseño de infraestructura crítica, seguridad CloudFormation y síntesis CDK).

### 5. 🛠️ ARCHETYPE - Scaffolding & Developer Experience

- **Responsabilidad:** Compatibilidad con `@ricardogenaro99/scaffolder` v1.1.0+, optimización de `template.config.json`, scripts de ciclo de vida (`prepareBuild.ts`, empaquetado de `/app`), servidor Express local (`server-local/`) y configuración de linting/formatting.
- **Ámbitos:** `template.config.json`, `prepareBuild.ts`, `server-local/`, `package.json`.
- **Modelo Recomendado:** **Gemini 3.8 Flash** (Automatización rápida, scripts Node y DX fluida).

### 6. 🧪 ARCHETYPE - QA & Cloud Performance

- **Responsabilidad:** Configuración de suites de tests (unitarios de dominio con Jest, tests de síntesis de CDK assertions, pruebas de latencia de cold start y simulación local de eventos Lambda).
- **Ámbitos:** `test/`, `infrastructure/test/`, auditorías de performance.
- **Modelo Recomendado:** **Gemini 3.8 Flash** (Generación exhaustiva de casos de prueba y cobertura).

---

## 3. Protocolo Git Anti-Chancado

1. **Un hilo, una rama temática:** Si un hilo trabaja en una mejora, debe crear una rama con prefijo claro: `feature/[hilo]-[descripcion]` o `fix/[hilo]-[descripcion]`.
2. **Pull antes de Push:** `git pull --rebase origin master` antes de consolidar cambios.
3. **Validación estricta antes de commit:** El hook de husky ejecuta `tsc` y `commitlint`. No bypass con `--no-verify`.
4. **Construcción de `/app` verificada:** Cualquier cambio en dependencias o tipos debe validar que `pnpm run build` genere un `/app/package.json` limpio y sin librerías excluidas de Lambda.
