import type { H3Event } from 'h3'
import {
  eventHandler,
  createError,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthXConfig {
  /**
   * X OAuth Client ID
   * @default process.env.NUXT_OAUTH_X_CLIENT_ID
   */
  clientId?: string
  /**
   * X OAuth Client Secret
   * @default process.env.NUXT_OAUTH_X_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * X OAuth Scope
   * @default []
   * @see https://developers.X.com/docs/permissions
   * @example [ 'email' ],
   */
  scope?: string[]

  /**
   * X OAuth Authorization URL
   * @default 'https://www.X.com/v19.0/dialog/oauth'
   */
  authorizationURL?: string

  /**
   * X OAuth Token URL
   * @default 'https://graph.X.com/v19.0/oauth/access_token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.X.com/docs/X-login/guides/advanced/manual-flow/
   */
  authorizationParams?: Record<string, string>
}

export function xEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthXConfig>) {
  return eventHandler(async (event: H3Event) => {
    // await $fetch("https://api.twitter.com/oauth/request_token" as string, {
    //   method: "POST",
    //   body: {
    //     oauth_callback: getRequestURL(event).href,
    //     x_auth_access_type: "read",

    //     // client_id: config.clientId,
    //     // client_secret: config.clientSecret,
    //     // redirect_uri: redirectUrl,
    //     // code: query.code,
    //   },
    // });

    // return;
    config = defu(config, useRuntimeConfig(event).oauth?.x, {
      authorizationURL: 'https://www.X.com/v19.0/dialog/oauth',
      tokenURL: 'https://graph.X.com/v19.0/oauth/access_token',
      authorizationParams: {},
    }) as OAuthXConfig
    const query = getQuery(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `X login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId) {
      const error = createError({
        statusCode: 500,
        message:
          'Missing NUXT_OAUTH_X_CLIENT_ID or NUXT_OAUTH_X_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectUrl = getRequestURL(event).href

    if (!query.code) {
      config.scope = config.scope || []
      // Redirect to X Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
        }),
      )
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(config.tokenURL as string, {
      method: 'POST',
      body: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUrl,
        code: query.code,
      },
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `X login failed: ${tokens.error || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await ofetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`,
    )

    if (!user) {
      throw new Error('X login failed: no user found')
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
