import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { OAuth2Server } from 'oauth2-mock-server';

import { createFetchFunction } from './index';

describe('tokenized-fetch', () => {
  const server = new OAuth2Server();

  beforeAll(async () => {
    await server.start(20230, 'localhost');
    await server.issuer.keys.generate('RS256');
  });

  afterAll(async () => {
    await server.stop();
  });

  test('should manage simple oauth token refreshing', async () => {
    let getCount = 0;

    const fetcher = createFetchFunction({
      async getToken() {
        getCount += 1;
        const response = await fetch('http://localhost:20230/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'urn:read',
          }).toString(),
        });
        const token = await response.json();
        return {
          value: token.access_token,
          expiration: new Date(Date.now() + token.expires_in),
        };
      },
      shouldReauthenticate(response, retryCount) {
        return response.status === 401 && retryCount < 2;
      },
    });

    async function introspect() {
      return fetcher('http://localhost:20230/introspect', { method: 'POST' }).then(async (response) => {
        return {
          status: response.status,
          json: await response.json(),
        };
      });
    }

    await expect(introspect()).resolves.toEqual({ status: 200, json: { active: true } });
    expect(getCount, 'Should have called getToken').toBe(1);

    await expect(introspect()).resolves.toEqual({ status: 200, json: { active: true } });
    expect(getCount, 'Should not have called getToken again').toBe(1);

    server.service.once('beforeIntrospect', (introspectResponse) => {
      introspectResponse.statusCode = 401;
      introspectResponse.body = { active: false };
    });

    const double = await Promise.all([
      introspect(),
      introspect(),
    ]);
    expect(getCount, 'should have refreshed the token once').toBe(2);
    expect(double).toMatchInlineSnapshot(`
      [
        {
          "json": {
            "active": true,
          },
          "status": 200,
        },
        {
          "json": {
            "active": true,
          },
          "status": 200,
        },
      ]
    `);

    server.service.on('beforeIntrospect', (introspectResponse) => {
      introspectResponse.statusCode = 401;
      introspectResponse.body = { active: false };
    });
    await expect(introspect(), 'should not retry infinitely').resolves.toEqual({ status: 401, json: { active: false } });
    expect(getCount, 'should have attempted to refresh 2 more times').toBe(4);
  });
});
