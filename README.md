# Nuxt Auth Utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Minimalist Authentication module for Nuxt exposing Vue composables and server utils.

- [Release Notes](/CHANGELOG.md)
- [Demo](https://github.com/atinux/nuxt-todos-edge)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-auth-utils?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- Secured & sealed cookies sessions
- [OAuth Providers](#supported-oauth-providers)

## Requirements

This module only works with SSR (server-side rendering) enabled as it uses server API routes. You cannot use this module with `nuxt generate`.

## Quick Setup

1. Add `nuxt-auth-utils` in your Nuxt project

```bash
npx nuxi@latest module add auth-utils
```

2. Add a `NUXT_SESSION_PASSWORD` env variable with at least 32 characters in the `.env`.

```bash
# .env
NUXT_SESSION_PASSWORD=password-with-at-least-32-characters
```

Nuxt Auth Utils generates one for you when running Nuxt in development the first time if no `NUXT_SESSION_PASSWORD` is set.

3. That's it! You can now add authentication to your Nuxt app ✨

## Vue Composables

Nuxt Auth Utils automatically adds some plugins to fetch the current user session to let you access it from your Vue components.

### User Session

```vue
<script setup>
const { loggedIn, user, session, clear } = useUserSession()
</script>

<template>
  <div v-if="loggedIn">
    <h1>Welcome {{ user.login }}!</h1>
    <p>Logged in since {{ session.loggedInAt }}</p>
    <button @click="clear">Logout</button>
  </div>
  <div v-else>
    <h1>Not logged in</h1>
    <a href="/auth/github">Login with GitHub</a>
  </div>
</template>
```

## Server Utils

The following helpers are auto-imported in your `server/` directory.

### Session Management

```ts
// Set a user session, note that this data is encrypted in the cookie but can be decrypted with an API call
// Only store the data that allow you to recognize an user, but do not store sensitive data
// Merges new data with existing data using defu()
await setUserSession(event, {
  user: {
    // ... user data
  },
  loggedInAt: new Date()
  // Any extra fields
})

// Replace a user session. Same behaviour as setUserSession, except it does not merge data with existing data
await replaceUserSession(event, data)

// Get the current user session
const session = await getUserSession(event)

// Clear the current user session
await clearUserSession(event)

// Require a user session (send back 401 if no `user` key in session)
const session = await requireUserSession(event)
```

You can define the type for your user session by creating a type declaration file (for example, `auth.d.ts`) in your project to augment the `UserSession` type:

```ts
// auth.d.ts
declare module '#auth-utils' {
  interface User {
    // Add your own fields
  }

  interface UserSession {
    // Add your own fields
  }
}

export {}
```

### OAuth Event Handlers

All helpers are exposed from the `oauth` global variable and can be used in your server routes or API routes.

The pattern is `oauth.<provider>EventHandler({ onSuccess, config?, onError? })`, example: `oauth.githubEventHandler`.

The helper returns an event handler that automatically redirects to the provider authorization page and then call `onSuccess` or `onError` depending on the result.

The `config` can be defined directly from the `runtimeConfig` in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    oauth: {
      <provider>: {
        clientId: '...',
        clientSecret: '...'
      }
    }
  }
})
```

It can also be set using environment variables:

- `NUXT_OAUTH_<PROVIDER>_CLIENT_ID`
- `NUXT_OAUTH_<PROVIDER>_CLIENT_SECRET`

#### Supported OAuth Providers

- Auth0
- AWS Cognito
- Battle.net
- Discord
- Facebook
- GitHub
- Google
- Keycloak
- LinkedIn
- Microsoft
- Spotify
- Twitch
- X

You can add your favorite provider by creating a new file in [src/runtime/server/lib/oauth/](./src/runtime/server/lib/oauth/).

### Example

Example: `~/server/routes/auth/github.get.ts`

```ts
export default oauth.githubEventHandler({
  config: {
    emailRequired: true
  },
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        githubId: user.id
      }
    })
    return sendRedirect(event, '/')
  },
  // Optional, will return a json error and 401 status code by default
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
```

Make sure to set the callback URL in your OAuth app settings as `<your-domain>/auth/github`.

### Extend Session

We leverage hooks to let you extend the session data with your own data or to log when the user clear its session.

```ts
// server/plugins/session.ts
export default defineNitroPlugin(() => {
  // Called when the session is fetched during SSR for the Vue composable (/api/_auth/session)
  // Or when we call useUserSession().fetch()
  sessionHooks.hook('fetch', async (session, event) => {
    // extend User Session by calling your database
    // or
    // throw createError({ ... }) if session is invalid for example
  })

  // Called when we call useServerSession().clear() or clearUserSession(event)
  sessionHooks.hook('clear', async (session, event) => {
    // Log that user logged out
  })
})
```

## Configuration

We leverage `runtimeConfig.session` to give the defaults option to [h3 `useSession`](https://h3.unjs.io/examples/handle-session).

You can overwrite the options in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 7 // 1 week
    }
  }
})
```

Our defaults are:

```ts
{
  name: 'nuxt-session',
  password: process.env.NUXT_SESSION_PASSWORD || '',
  cookie: {
    sameSite: 'lax'
  }
}
```

Checkout the [`SessionConfig`](https://github.com/unjs/h3/blob/c04c458810e34eb15c1647e1369e7d7ef19f567d/src/utils/session.ts#L20) for all options.

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-auth-utils/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-auth-utils

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-auth-utils.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/nuxt-auth-utils

[license-src]: https://img.shields.io/npm/l/nuxt-auth-utils.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-auth-utils

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
