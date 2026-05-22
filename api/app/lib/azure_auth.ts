/**
 * Azure Managed Identity helper for PostgreSQL authentication.
 *
 * When AZURE_AD_AUTH_ENABLED=true, the app uses the Azure Instance Metadata
 * Service (IMDS) to obtain a short-lived OAuth2 access token for the
 * PostgreSQL resource. This token is passed as the password to the pg Pool,
 * replacing username/password credentials entirely.
 *
 * The token is cached and refreshed 5 minutes before expiry so that
 * long-running pool connections always present a valid credential.
 */

const IMDS_TOKEN_URL =
  "http://169.254.169.254/metadata/identity/oauth2/token" +
  "?api-version=2018-02-01" +
  "&resource=https%3A%2F%2Fossrdbms-aad.database.windows.net";

interface ImdsTokenResponse {
  access_token: string;
  expires_on: string; // Unix timestamp as string
}

interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
}

let cachedToken: CachedToken | null = null;

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export const getAzureAdToken = async (): Promise<string> => {
  const now = Date.now();

  if (cachedToken && now < cachedToken.expiresAt - REFRESH_BUFFER_MS) {
    return cachedToken.token;
  }

  const response = await fetch(IMDS_TOKEN_URL, {
    headers: { Metadata: "true" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Azure AD token from IMDS: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ImdsTokenResponse;

  cachedToken = {
    token: data.access_token,
    expiresAt: parseInt(data.expires_on, 10) * 1000,
  };

  return cachedToken.token;
};
