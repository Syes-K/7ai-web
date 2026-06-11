import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  const [
    pageHome,
    pageLogin,
    pageRegister,
    pageChat,
    pageShell,
    consoleShell,
    consoleProfile,
    consoleModels,
    consoleAssistants,
    consoleKnowledge,
    consoleMcp,
    consoleSettings,
    apiMessage,
  ] = await Promise.all([
    import(`../../messages/${locale}/page/home.json`),
    import(`../../messages/${locale}/page/login.json`),
    import(`../../messages/${locale}/page/register.json`),
    import(`../../messages/${locale}/page/chat.json`),
    import(`../../messages/${locale}/page/shell.json`),
    import(`../../messages/${locale}/page/console/shell.json`),
    import(`../../messages/${locale}/page/console/profile.json`),
    import(`../../messages/${locale}/page/console/models.json`),
    import(`../../messages/${locale}/page/console/assistants.json`),
    import(`../../messages/${locale}/page/console/knowledge.json`),
    import(`../../messages/${locale}/page/console/mcp.json`),
    import(`../../messages/${locale}/page/console/settings.json`),
    import(`../../messages/${locale}/api/message.json`),
  ]);

  return {
    locale,
    messages: {
      page: {
        home: pageHome.default,
        login: pageLogin.default,
        register: pageRegister.default,
        chat: pageChat.default,
        shell: pageShell.default,
        console: {
          shell: consoleShell.default,
          profile: consoleProfile.default,
          models: consoleModels.default,
          assistants: consoleAssistants.default,
          knowledge: consoleKnowledge.default,
          mcp: consoleMcp.default,
          settings: consoleSettings.default,
        },
      },
      api: {
        message: apiMessage.default,
      },
    },
  };
});
