export async function refreshAzureToken({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return {
    accessToken: json.access_token as string,
    refreshToken: (json.refresh_token as string) ?? refreshToken,
    expiresAt: Date.now() + (Number(json.expires_in ?? 3600) * 1000),
  };
}
