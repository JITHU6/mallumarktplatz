import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser().catch(() => null);

  const links = [
    { href: "/", label: t("home") },
    { href: "/businesses", label: t("explore") },
    { href: "/categories", label: t("categories") },
    { href: "/about", label: t("about") },
  ];

  const userInfo = user
    ? { name: user.profile?.full_name ?? user.email ?? "", email: user.email ?? "", isAdmin: user.isAdmin }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75">
      <div className="container-page flex h-16 items-center gap-2 sm:gap-4">
        <Logo />
        <nav aria-label={t("mainNavigation")} className="ml-6 hidden lg:block">
          <NavLinks links={links} />
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <LanguageSwitcher className="px-2" />
          {userInfo ? (
            <UserMenu user={userInfo} />
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/login">{t("loginRegister")}</Link>
            </Button>
          )}
          <Button asChild size="lg" className="hidden bg-gold px-4 text-charcoal hover:bg-gold-dark hover:text-white sm:inline-flex">
            <Link href="/register-business">
              <Plus />
              {t("addBusiness")}
            </Link>
          </Button>
          <MobileNav links={links} user={userInfo} />
        </div>
      </div>
    </header>
  );
}
