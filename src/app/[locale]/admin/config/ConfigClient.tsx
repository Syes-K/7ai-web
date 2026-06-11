"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import {
  PageContainer,
  ProForm,
  ProFormDependency,
  ProFormDigit,
  ProFormSelect,
} from "@ant-design/pro-components";
import { Alert, App, Button, Card, Space, Spin, Tooltip, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
  CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
  CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
  CONVERSATION_SUMMARY_MAX_CHARS_MAX,
  CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
  CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
} from "@/common/constants";
import { DEFAULT_CONVERSATION_SUMMARY_CONFIG } from "@/common/constants/defaultConversationSummaryConfig";
import type { ConversationSummaryConfig, ConversationSummaryConfigFileState } from "@/common/types";
import { parseApiError } from "@/common/utils/parse-api-error";
import { Link } from "@/i18n/navigation";
import { handleAdminApiAuthStatus } from "../admin-api-guards";

type FormValues = ConversationSummaryConfig;

function FieldLabel({ text, hint }: { text: string; hint: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{text}</span>
      <Tooltip title={hint}>
        <QuestionCircleOutlined className="cursor-help opacity-60" />
      </Tooltip>
    </span>
  );
}

/** 对话摘要配置管理 */
export default function ConfigClient() {
  const locale = useLocale();
  const t = useTranslations("page.admin.config");
  const tShell = useTranslations("page.admin.shell");
  const { message } = App.useApp();
  const [form] = ProForm.useForm<FormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileState, setFileState] = useState<ConversationSummaryConfigFileState | null>(null);

  const returnPath = `/${locale}/admin/config`;

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config/conversation-summary", {
        credentials: "same-origin",
      });
      if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
        return false;
      }
      if (!res.ok) {
        message.error(t("toast.loadFailed"));
        return false;
      }
      const data = (await res.json()) as {
        config: ConversationSummaryConfig;
        fileState: ConversationSummaryConfigFileState;
      };
      form.setFieldsValue(data.config);
      setFileState(data.fileState);
      return true;
    } finally {
      setLoading(false);
    }
  }, [form, locale, message, returnPath, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (values: FormValues) => {
      setSaving(true);
      try {
        const res = await fetch("/api/admin/config/conversation-summary", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: values }),
        });
        if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as {
          config: ConversationSummaryConfig;
          fileState: ConversationSummaryConfigFileState;
        };
        setFileState(data.fileState);
        form.setFieldsValue(data.config);
        message.success(t("toast.saved"));
      } finally {
        setSaving(false);
      }
    },
    [form, locale, message, returnPath, t, tShell],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div style={{ maxWidth: 920 }}>
        {fileState === "invalid_json" && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={t("fileState.invalidJson.title")}
            description={t("fileState.invalidJson.description")}
          />
        )}

        <Spin spinning={loading || saving}>
          <Card title={t("section.conversationSummary")} variant="outlined">
            <ProForm<FormValues>
              form={form}
              layout="vertical"
              disabled={loading || saving}
              initialValues={DEFAULT_CONVERSATION_SUMMARY_CONFIG}
              onFinish={async (v) => {
                await save(v);
              }}
              submitter={false}
              preserve
            >
              <ProFormSelect
                name="enabled"
                label={
                  <FieldLabel text={t("form.enabled.label")} hint={t("form.enabled.hint")} />
                }
                rules={[{ required: true, message: t("form.enabled.rules.required") }]}
                options={[
                  { value: true, label: t("form.enabled.option.on") },
                  { value: false, label: t("form.enabled.option.off") },
                ]}
              />

              <ProFormDigit
                name="maxChars"
                label={
                  <FieldLabel text={t("form.maxChars.label")} hint={t("form.maxChars.hint")} />
                }
                min={1}
                max={CONVERSATION_SUMMARY_MAX_CHARS_MAX}
                fieldProps={{ style: { width: "100%" }, precision: 0 }}
                rules={[
                  { required: true, message: t("form.maxChars.rules.required") },
                  {
                    type: "number",
                    min: 1,
                    max: CONVERSATION_SUMMARY_MAX_CHARS_MAX,
                    message: t("form.maxChars.rules.range", {
                      max: CONVERSATION_SUMMARY_MAX_CHARS_MAX,
                    }),
                  },
                ]}
              />

              <ProFormSelect
                name="mode"
                label={
                  <FieldLabel text={t("form.mode.label")} hint={t("form.mode.hint")} />
                }
                rules={[{ required: true, message: t("form.mode.rules.required") }]}
                options={[
                  { value: "messages", label: t("form.mode.option.messages") },
                  { value: "tokens", label: t("form.mode.option.tokens") },
                ]}
              />

              <ProFormDependency name={["mode"]}>
                {({ mode }) =>
                  mode === "tokens" ? (
                    <>
                      <ProFormDigit
                        name="summaryTriggerTokens"
                        preserve
                        label={
                          <FieldLabel
                            text={t("form.triggerTokens.label")}
                            hint={t("form.triggerTokens.hint")}
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: t("form.triggerTokens.rules.required") },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
                            message: t("form.triggerTokens.rules.range", {
                              max: CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
                            }),
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryKeepTokens"
                        preserve
                        label={
                          <FieldLabel
                            text={t("form.keepTokens.label")}
                            hint={t("form.keepTokens.hint")}
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_KEEP_TOKENS_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: t("form.keepTokens.rules.required") },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
                            message: t("form.keepTokens.rules.range", {
                              max: CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
                            }),
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryMinRecentMessages"
                        preserve
                        label={
                          <FieldLabel
                            text={t("form.minRecentMessages.label")}
                            hint={t("form.minRecentMessages.hint")}
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          {
                            required: true,
                            message: t("form.minRecentMessages.rules.required"),
                          },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
                            message: t("form.minRecentMessages.rules.range", {
                              max: CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
                            }),
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <>
                      <ProFormDigit
                        name="summaryTriggerMessages"
                        preserve
                        label={
                          <FieldLabel
                            text={t("form.triggerMessages.label")}
                            hint={t("form.triggerMessages.hint")}
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: t("form.triggerMessages.rules.required") },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
                            message: t("form.triggerMessages.rules.range", {
                              max: CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
                            }),
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryKeepMessages"
                        preserve
                        label={
                          <FieldLabel
                            text={t("form.keepMessages.label")}
                            hint={t("form.keepMessages.hint")}
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: t("form.keepMessages.rules.required") },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
                            message: t("form.keepMessages.rules.range", {
                              max: CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
                            }),
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryMinRecentMessages"
                        preserve
                        label={
                          <FieldLabel
                            text={t("form.minRecentMessages.label")}
                            hint={t("form.minRecentMessages.hint")}
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          {
                            required: true,
                            message: t("form.minRecentMessages.rules.required"),
                          },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
                            message: t("form.minRecentMessages.rules.range", {
                              max: CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
                            }),
                          },
                        ]}
                      />
                    </>
                  )
                }
              </ProFormDependency>

              <Space className="mt-2 w-full justify-end" size="middle">
                <Button
                  disabled={loading || saving}
                  onClick={() => {
                    form.setFieldsValue(DEFAULT_CONVERSATION_SUMMARY_CONFIG);
                  }}
                >
                  {t("actions.resetDefaults")}
                </Button>
                <Button
                  type="primary"
                  ghost
                  loading={saving}
                  onClick={() => void form.submit()}
                >
                  {t("actions.save")}
                </Button>
              </Space>
            </ProForm>
          </Card>
        </Spin>

        <Typography.Paragraph type="secondary" className="mt-4">
          {t.rich("hint.promptTemplates", {
            link: (chunks) => (
              <Link href="/admin/prompts" className="text-cyan-400/90 hover:text-cyan-300">
                {chunks}
              </Link>
            ),
          })}
        </Typography.Paragraph>
      </div>
    </PageContainer>
  );
}
