/**
 * Azure Managed Identity helper for PostgreSQL authentication.
 *
 * When AZURE_AD_AUTH_ENABLED=true, the app uses the Azure Managed Identity
 * token endpoint to obtain a short-lived OAuth2 access token for the
 * PostgreSQL resource. This token is passed as the password to the pg Pool,
 * replacing username/password credentials entirely.
 *
 * Azure App Service exposes the token endpoint via the IDENTITY_ENDPOINT and
 * IDENTITY_HEADER environment variables (MSI endpoint). This is different from
 * the raw IMDS address (169.254.169.254) used by Azure VMs and ACI.
 *
 * The token is cached and refreshed 5 minutes before expiry so that
 * long-running pool connections always present a valid credential.
 */

const PG_RESOURCE = "https://ossrdbms-aad.database.windows.net";

interface MsiTokenResponse {
  access_token: string;
  expires_on: string; // Unix timestamp as string
}

interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
}

let cachedToken: CachedToken | null = null;

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

const fetchToken = async (): Promise<MsiTokenResponse> => {
  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;

  if (identityEndpoint && identityHeader) {
    // Azure App Service MSI endpoint
    const url =
      `${identityEndpoint}?api-version=2019-08-01` +
      `&resource=${encodeURIComponent(PG_RESOURCE)}`;
    const response = await fetch(url, {
      headers: { "X-IDENTITY-HEADER": identityHeader },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Azure AD token from App Service MSI: ${response.status} ${response.statusText}`
      );
    }
    return response.json() as Promise<MsiTokenResponse>;
  }

  // Fallback: Azure VM / ACI IMDS endpoint
  const url =
    `http://169.254.169.254/metadata/identity/oauth2/token` +
    `?api-version=2018-02-01` +
    `&resource=${encodeURIComponent(PG_RESOURCE)}`;
  const response = await fetch(url, {
    headers: { Metadata: "true" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Azure AD token from IMDS: ${response.status} ${response.statusText}`
    );
  }
  return response.json() as Promise<MsiTokenResponse>;
};

export const getAzureAdToken = async (): Promise<string> => {
  const now = Date.now();

  if (cachedToken && now < cachedToken.expiresAt - REFRESH_BUFFER_MS) {
    return cachedToken.token;
  }

  const data = await fetchToken();

  cachedToken = {
    token: data.access_token,
    expiresAt: parseInt(data.expires_on, 10) * 1000,
  };

  return cachedToken.token;
};
