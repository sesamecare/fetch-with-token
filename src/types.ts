/**
 * AbstractToken defines the basic properties of a token. You can derive from it
 * if your token format is more complex or needs other context during operation.
 */
export interface AbstractToken {
  value: string;
  expiration: Date;
}

/**
 * Encapsulates the arguments to the WHATWG fetch function.
 */
export interface FetchArugments {
  request: Parameters<typeof fetch>[0];
  init: Parameters<typeof fetch>[1];
}

/**
 * FetchWithTokenOptions define the functions required to fetch new tokens,
 * add them to outbound requests, and reauthenticate if necessary.
 */
export interface FetchWithTokenOptions<TokenType extends AbstractToken = AbstractToken> {
  /**
   * getToken is called to fetch a new token.
   */
  getToken(previousToken?: TokenType): Promise<TokenType>;

  /**
   * onFetch runs when a token is available and a fetch request is going to be made.
   * Typically, it will add an authorization header to a request. Note that you should
   * generally copy the request/init arguments rather than modifying them, as the same
   * objects may be used for multiple requests if retry is necessary.
   * @default Adds the token as a Bearer token to the Authorization header.
   */
  onFetch?: (token: TokenType, request: FetchArugments) => FetchArugments;

  /**
   * Given a request response, determine if a reauthentication attempt should be made.
   * (Note that ALL responses are passed to this method, not just 401/403 responses.)
   * If reauthentication is required, the current token is blanked out and all requests
   * will wait until reauthentication is complete.
   * @default Retries up to twice on 401 responses.
   */
  shouldReauthenticate?: (response: Response, retryCount: number) => boolean;
}
