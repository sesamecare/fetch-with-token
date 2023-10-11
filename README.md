# fetch-with-token

A simple wrapper around fetch that manages getting a token (typically oauth2 token or other refresh-able token)
and updating it atomically when it expires or stops working.

You just need to write the code to get a new token and the code to analyze whether a retry is required.

```typescript
import { createFetchFunction } from '@sesamecare-oss/fetch-with-token';

const partnerFetch = createFetchFunction({
  async getToken() {
    const body = await fetch('https://auth.partner.com?clientId=foo&secret=bar').then((r) => r.json());
    return {
      value: body.access_token,
      expiration: new Date(Date.now() + body.expires_in),
    };
  },
});

// This call will go out with an authorization header
const response = await partnerFetch('https://partner.com');
```
