import type { Metadata } from "next";
import BoxStudio from "./BoxStudio";
import { dictionaries, resolveLocale } from "./i18n";
import { getRequestLocale } from "./locale-server";

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

async function getPageLocale({ searchParams }: PageProps) {
  const [params, requestLocale] = await Promise.all([searchParams, getRequestLocale()]);
  const queryLocale = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  return resolveLocale(queryLocale, requestLocale);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const locale = await getPageLocale(props);
  const t = dictionaries[locale];
  return {
    title: t.meta.title,
    description: t.meta.description,
  };
}

export default async function Home(props: PageProps) {
  return <BoxStudio initialLocale={await getPageLocale(props)} />;
}
