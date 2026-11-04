import type { Metadata, Viewport } from "next";
import { Noto_Sans_Malayalam, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin", "latin-ext"], display: "swap" });
const malayalam = Noto_Sans_Malayalam({
  variable: "--font-malayalam",
  subsets: ["malayalam"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t("metaTitle"), template: "%s | MalluMarktplatz" },
    description: t("metaDescription"),
    applicationName: "MalluMarktplatz",
    openGraph: {
      type: "website",
      siteName: "MalluMarktplatz",
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: "/",
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#173E35",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${jakarta.variable} ${malayalam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <NextIntlClientProvider>
          <TooltipProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-cream"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>
            <SiteFooter />
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
