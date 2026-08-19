# Contributing

Thank you for improving ThreadScout for Reddit.

## Principles

- Keep public, credential-free research useful as the default experience.
- Preserve explicit confirmation before posting, messaging, deleting, reporting, or moderating.
- Do not add voting, karma manipulation, arbitrary API pass-through, or browser-based policy workarounds.
- Do not add collection or profiling of personal data.
- Make claims about implemented behavior match the actual plugin.
- Keep instructions concise and place mode-specific details in references.

## Before opening a pull request

Run:

```sh
python3 scripts/check.py
npm test --prefix plugins/threadscout-for-reddit/server
```

If behavior changes, exercise the affected mode with a realistic prompt and include the result or a concise description of the verification in the pull request.
