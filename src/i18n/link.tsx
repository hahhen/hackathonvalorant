"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localizedHref } from "./config";
import { useI18n } from "./provider";

export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  const localized = typeof href === "string"
    ? localizedHref(href, locale)
    : href.protocol || href.host || href.hostname
      ? href
      : { ...href, pathname: href.pathname ? localizedHref(href.pathname, locale) : href.pathname };
  return <NextLink href={localized} {...props} />;
}
