# Diagrams

PlantUML source files (`.puml`) and their rendered PNGs for the portfolio docs.

## Source of truth

The `.puml` files are the source of truth. The `.png` files are generated artifacts — do not edit them directly.

The portfolio markdown files in `docs/portfolio/*.md` embed the PNGs via `![alt](assets/diagrams/<name>.png)`. When a diagram needs to change, edit the matching `.puml` first, re-render the PNG, then commit both.

## Rendering

GitHub does not render PlantUML inline, so PNGs are committed alongside their sources.

**Option 1 — Kroki (no install required):**

```sh
curl -sS -X POST -H "Content-Type: text/plain" \
  --data-binary @runtime-topology.puml \
  https://kroki.io/plantuml/png \
  -o runtime-topology.png
```

**Option 2 — Local PlantUML CLI (needs Java + Graphviz):**

```sh
brew install plantuml graphviz
plantuml -tpng runtime-topology.puml
```

To re-render every diagram in this directory:

```sh
for f in *.puml; do
  curl -sS -X POST -H "Content-Type: text/plain" --data-binary @"$f" \
    https://kroki.io/plantuml/png -o "${f%.puml}.png"
done
```

## Current diagrams

| `.puml` | UML type | Referenced from |
|---|---|---|
| `recommendation-pipeline.puml` | Sequence | `02-system-architecture.md` (via `screenshots/plantumlflow.png`) |
| `runtime-topology.puml` | Component (C4 Container) | `02-system-architecture.md` |
| `evaluation-pipeline.puml` | Activity | `05-evaluation-framework.md` |
| `sse-state-machine.puml` | State | `07-streaming-architecture-and-ux.md` |
| `usage-logging-flow.puml` | Activity | `08-observability-and-cost-tracking.md` |

## Do not

- Edit the `.png` files directly
- Re-introduce ASCII tree/flow diagrams (`├──`, `└──`, `│`) in the markdown — they were intentionally replaced
- Commit a `.puml` change without re-rendering the matching `.png`
