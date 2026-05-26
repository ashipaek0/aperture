import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ path: string[] }> },
) {
  const params = await props.params;
  const path = params.path.join("/");

  // Read auth data from cookie
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("jellyfin-auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let authData: { serverUrl: string; user: { AccessToken?: string } };
  try {
    authData = JSON.parse(authCookie.value);
  } catch {
    return NextResponse.json({ error: "Invalid auth data" }, { status: 401 });
  }

  const { serverUrl, user } = authData;
  if (!serverUrl || !user?.AccessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Build the upstream Jellyfin URL
  const upstreamUrl = `${serverUrl.replace(/\/+$/, "")}/${path}?api_key=${user.AccessToken}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/vtt, application/octet-stream, */*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status },
      );
    }

    const body = await response.text();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Subtitle proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subtitle" },
      { status: 502 },
    );
  }
}
