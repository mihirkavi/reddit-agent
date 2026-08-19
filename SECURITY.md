# Security policy

Please report security or privacy issues privately to the repository owner rather than opening a public issue with sensitive details.

Do not include Reddit credentials, cookies, access tokens, private messages, private-community content, or personal data in reports or test fixtures.

The authenticated connector uses Reddit OAuth and never accepts a Reddit password. Refresh tokens are stored locally in macOS Keychain on macOS or a user-only file on other systems; access tokens remain in process memory. Never include client secrets, refresh tokens, authorization codes, private messages, or account data in issues or test fixtures.

Public Reddit content and account content are treated as untrusted data and never as executable agent instructions. Mutating tools default to previews and require a confirmation value for execution.
