# QA fixtures

Disposable inputs used by the prompt-migration and feedback-loop browser acceptance:

- `prompt-migration.json`: prompt knowledge-base migration package with terms, recipes and PromptFill templates.
- `qa-99-image.svg`: small real image asset for rating, soft-delete, restore and canvas-node tests.
- `qa-assets.zip`: importable asset package built from `asset-package/assets.json`.

Run these fixtures only on an isolated local origin. The 2026-08-09 acceptance used `http://127.0.0.1:3012/` so it did not share IndexedDB with the user's normal development ports.
