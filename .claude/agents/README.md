# Custom Agents

Place custom agent definition files here. Each `.md` file defines a specialized subagent for Claude Code to use.

## File Naming
`<agent-name>.md` — e.g., `backend-dev.md`, `frontend-dev.md`, `ml-engineer.md`

## Agent File Format

```markdown
---
name: agent-name
description: When to use this agent (used by Claude to decide when to invoke it)
tools: Read, Write, Edit, Bash, Glob, Grep   # comma-separated list of allowed tools
---

# System Prompt

Your instructions for the agent go here...
```

## Example Agents for This Project
- `backend-dev.md` — FastAPI routes, model inference, Grad-CAM logic
- `frontend-dev.md` — React components, TypeScript, Vite config
- `ml-engineer.md` — HuggingFace model loading, dataset handling, ViT fine-tuning details
- `qa-tester.md` — Writing and running tests, validating API contracts
