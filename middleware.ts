import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

  // Ohjaa tarjouskone.com → certuslex.fi/lp
  if (host === "tarjouskone.com" || host === "www.tarjouskone.com") {
    return NextResponse.redirect("https://www.certuslex.fi/lp", { status: 302 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/(.*)",
};
