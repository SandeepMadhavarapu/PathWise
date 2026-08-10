# Archived snapshot — not the runtime rule packs

**The rule packs PathWise actually runs on live in [`../../pathwise-app/lib/rulepacks/`](../../pathwise-app/lib/rulepacks/).
Read those. Nothing in this directory is imported, built, tested, or served.**

These files are a frozen copy taken while `pathwise-core/` was the project's recovery blueprint. They
have deliberately **not** been kept in step with the live packs, and they differ in ways that matter:
the `va-domicile.json` here predates the status-classification fix, so it still treats "no gate
matched" as permission for a status the pack was never authored against. That is the exact defect the
live pack exists to prevent.

They also carry the `verified_on` dates they had when the snapshot was taken. Those dates describe
the snapshot, not a verification of these files.

Kept rather than deleted because `pathwise-core/` is the project's recovery record and deleting half
of it would make the other half misleading. Every file now carries an `_ARCHIVED_SNAPSHOT` key saying
the same thing, so the warning travels with the file even if this README is never opened.

| This snapshot | The pack that governs |
|---|---|
| `va-domicile.json` | `pathwise-app/lib/rulepacks/va-domicile.json` |
| `va-aid.json` | `pathwise-app/lib/rulepacks/va-aid.json` |
| `f1-practical-training.json` | `pathwise-app/lib/rulepacks/f1-practical-training.json` |
| `consequence-map.json` | `pathwise-app/lib/rulepacks/consequence-map.json` |
| `coverage.json` | `pathwise-app/lib/rulepacks/coverage.json` |
