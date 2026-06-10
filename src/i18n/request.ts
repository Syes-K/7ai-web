import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  const [pageHome, apiMessage] = await Promise.all([
    import(`../../messages/${locale}/page/home.json`),
    import(`../../messages/${locale}/api/message.json`),
  ]);

  return {
    locale,
    messages: {
      page: {
        home: pageHome.default,
      },
      api: {
        message: apiMessage.default,
      },
    },
  };
});
