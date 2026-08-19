# Privacy policy

Effective August 19, 2026

ThreadScout for Reddit is an independent, open-source Codex plugin. It is not affiliated with Reddit, Inc.

## Data handled

The plugin can access Reddit data authorized by the scopes a user approves on Reddit. Depending on the request, this can include account identity, feeds, subscriptions, saved or hidden items, posting history, inbox messages, and moderator queues. The connector sends only user-requested API calls to Reddit.

The project owner does not operate a token service and does not receive users' Reddit data or OAuth tokens. The connector runs locally. On macOS, the refresh token is stored in the user's Keychain. On other supported systems, it is stored in a user-only file at `~/.config/threadscout-for-reddit/refresh-token`, unless supplied through the `REDDIT_REFRESH_TOKEN` environment variable. Short-lived access tokens remain in process memory.

The plugin does not ask for or store a Reddit password. It does not sell data, use Reddit data for advertising, or use Reddit data to train models.

## Retention and deletion

The connector does not build a Reddit-content database. Tool results may appear in the user's Codex task history according to their OpenAI/Codex settings. Disconnecting with `reddit_auth_disconnect` removes the locally stored refresh token. Users can also revoke the application from Reddit's account settings.

## Third parties

Reddit API calls are governed by Reddit's terms and privacy policy. Codex processing is governed by the user's OpenAI agreement and settings.

## Contact

Open a privacy issue at <https://github.com/mihirkavi/reddit-agent/issues> without including credentials, private messages, or personal data.
