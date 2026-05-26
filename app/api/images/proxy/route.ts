import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow Jellyfin image URLs (Items/...Images/...) or relative paths
  const isJellyfinUrl = /\/Items\/.+\/Images\//.test(url);
  const isRelativePath = url.startsWith("/api/");

  if (!isJellyfinUrl && !isRelativePath) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Read auth data from cookie to get server URL
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("jellyfin-auth");
  const serverUrlCookie = cookieStore.get("jellyfin-server-url");

  let upstreamUrl: string;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Absolute URL — use as-is (for external Jellyfin servers)
    upstreamUrl = url;
  } else {
    // Relative path — prepend server URL from cookie
    const serverUrl = serverUrlCookie?.value || "";
    if (!serverUrl) {
      return NextResponse.json(
        { error: "Server URL not configured" },
        { status: 400 },
      );
    }
    upstreamUrl = `${serverUrl.replace(/\/+$/, "")}${url}`;
  }

  // Append auth token if we have it
  try {
    if (authCookie?.value) {
      const authData = JSON.parse(authCookie.value);
      const token = authData?.user?.AccessToken;
      if (token && !upstreamUrl.includes("api_key=")) {
        const separator = upstreamUrl.includes("?") ? "&" : "?";
        upstreamUrl += `${separator}api_key=${token}`;
      }
    }
  } catch {
    // Invalid auth cookie, proceed without token
  }

  try {
    const response = await fetch(upstreamUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream: ${response.status}` },
        { status: response.status },
      );
    }

    const contentType =
      response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 },
    );
  }
}
