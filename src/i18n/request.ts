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
    consoleSkills,
    consoleSettings,
    adminShell,
    adminConfig,
    adminUsers,
    adminModels,
    adminSkills,
    adminPrompts,
    adminLogs,
    adminAssistants,
    pageKnowledge,
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
    import(`../../messages/${locale}/page/console/skills.json`),
    import(`../../messages/${locale}/page/console/settings.json`),
    import(`../../messages/${locale}/page/admin/shell.json`),
    import(`../../messages/${locale}/page/admin/config.json`),
    import(`../../messages/${locale}/page/admin/users.json`),
    import(`../../messages/${locale}/page/admin/models.json`),
    import(`../../messages/${locale}/page/admin/skills.json`),
    import(`../../messages/${locale}/page/admin/prompts.json`),
    import(`../../messages/${locale}/page/admin/logs.json`),
    import(`../../messages/${locale}/page/admin/assistants.json`),
    import(`../../messages/${locale}/page/knowledge.json`),
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
          skills: consoleSkills.default,
          settings: consoleSettings.default,
        },
        admin: {
          shell: adminShell.default,
          config: adminConfig.default,
          users: adminUsers.default,
          models: adminModels.default,
          skills: adminSkills.default,
          prompts: adminPrompts.default,
          logs: adminLogs.default,
          assistants: adminAssistants.default,
        },
        knowledge: pageKnowledge.default,
      },
      api: {
        message: apiMessage.default,
      },
    },
  };
});
