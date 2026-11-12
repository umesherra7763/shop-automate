import { NextRequest, NextResponse } from "next/server";

// Password gate. Required on the hosted app; optional when running on a home/shop computer.
export async function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) {
    if (process.env.VERCEL)
      return new NextResponse("APP_PASSWORD is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.", {
        status: 503,
      });
    return NextResponse.next();
  }
  if (req.nextUrl.pathname === "/login") return NextResponse.next();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("shop:" + pw));
  const token = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  if (req.cookies.get("shop_auth")?.value === token) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
