import { AbstractToken, FetchArugments, FetchWithTokenOptions } from './types';

function defaultOnFetch(token: AbstractToken, args: FetchArugments): FetchArugments {
  return {
    request: args.request,
    init: {
      ...args.init,
      headers: {
        ...args.init?.headers,
        Authorization: `Bearer ${token.value}`,
      },
    },
  };
}

function defaultShouldReauthenticate(response: Response, retryCount: number): boolean {
  return response.status === 401 && retryCount < 2;
}

export function createFetchFunction<TokenType extends AbstractToken = AbstractToken>({
  getToken,
  onFetch = defaultOnFetch,
  shouldReauthenticate = defaultShouldReauthenticate,
}: FetchWithTokenOptions<TokenType>) {
  let tokenResolver: Promise<TokenType> | undefined;
  let currentToken: TokenType | undefined;

  async function resolveToken(force: boolean) {
    if (!force && currentToken && currentToken.expiration > new Date()) {
      return currentToken;
    }
    if (!tokenResolver) {
      const lastToken = currentToken;
      currentToken = undefined;
      tokenResolver = getToken(lastToken).then((token) => {
        currentToken = token;
        tokenResolver = undefined;
        return currentToken;
      });
    }
    return tokenResolver;
  }

  async function fetchWithToken(
    request: FetchArugments['request'],
    init: FetchArugments['init'],
    retryCount: number = 0,
  ): Promise<Response> {
    const token = await resolveToken(false);
    const modifiedFetchArguments = onFetch(token, { request, init });
    const response = await fetch(modifiedFetchArguments.request, modifiedFetchArguments.init);
    if (shouldReauthenticate?.(response, retryCount)) {
      await resolveToken(true);
      return fetchWithToken(request, init, retryCount + 1);
    }
    return response;
  }

  return fetchWithToken as typeof fetch;
}
