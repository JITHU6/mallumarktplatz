"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutDashboard, LogOut, Menu, Plus, Shield, User } from "lucide-react";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "./language-switcher";
import { NavLinks } from "./nav-links";
import type { HeaderUser } from "./user-menu";

export function MobileNav({ links, user }: { links: { href: string; label: string }[]; user: HeaderUser | null }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label={t("menu")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm bg-cream">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <SheetTitle className="text-forest">{t("menu")}</SheetTitle>
            <LanguageSwitcher />
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <NavLinks links={links} orientation="vertical" onNavigate={close} />
          <Separator />
          {user ? (
            <div className="flex flex-col gap-1">
              <p className="px-3 text-sm text-muted-foreground">{user.email}</p>
              <Button asChild variant="ghost" className="justify-start" onClick={close}>
                <Link href="/dashboard">
                  <LayoutDashboard /> {t("dashboard")}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start" onClick={close}>
                <Link href="/dashboard/profile">
                  <User /> {t("myAccount")}
                </Link>
              </Button>
              {user.isAdmin && (
                <Button asChild variant="ghost" className="justify-start" onClick={close}>
                  <Link href="/admin">
                    <Shield /> {t("admin")}
                  </Link>
                </Button>
              )}
              <form action={logout}>
                <Button type="submit" variant="ghost" className="w-full justify-start">
                  <LogOut /> {t("logout")}
                </Button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={close}>
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild variant="outline" onClick={close}>
                <Link href="/register">{t("register")}</Link>
              </Button>
            </div>
          )}
          <Button asChild size="lg" className="h-11 bg-gold text-charcoal hover:bg-gold-dark hover:text-white" onClick={close}>
            <Link href="/register-business">
              <Plus /> {t("addBusiness")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
