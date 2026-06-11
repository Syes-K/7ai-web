"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import { PageContainer, ProForm, ProFormTextArea } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Form,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PROMPT_CONFIG } from "@/common/constants/defautPromptConfig";
import { validatePromptTemplate } from "@/common/prompt/validatePromptTemplate";
import {
  buildDefaultPromptConfigItems,
  localizePromptConfigItems,
} from "@/common/prompt/localize-prompt-config-item";
import type {
  PromptConfigApiItem,
  PromptConfigFileState,
} from "@/common/types";
import { parseApiError } from "@/common/utils/parse-api-error";
import { handleAdminApiAuthStatus } from "../admin-api-guards";

type PromptFormValues = { values: Record<string, string> };

/** 提示词模版配置页 */
export default function PromptsClient() {
  const locale = useLocale();
  const t = useTranslations("page.admin.prompts");
  const tShell = useTranslations("page.admin.shell");
  const tConfirm = useTranslations("page.shell.confirm");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<PromptFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileState, setFileState] = useState<PromptConfigFileState | null>(null);
  const [items, setItems] = useState<PromptConfigApiItem[]>([]);

  const returnPath = `/${locale}/admin/prompts`;

  const templateValueRules = (item: PromptConfigApiItem) => [
    { required: true, whitespace: true, message: t("form.template.rules.required") },
    {
      validator: async (_: unknown, v: string) => {
        const r = validatePromptTemplate(v ?? "", item.params);
        if (!r.valid) {
          const msg =
            r.code === "invalidBrace"
              ? t("form.template.rules.invalidBrace")
              : t("form.template.rules.undeclaredParam", { param: `{${r.param}}` });
          throw new Error(msg);
        }
      },
    },
  ];

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompt-config", {
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
        items: PromptConfigApiItem[];
        fileState: PromptConfigFileState;
      };
      const localized = localizePromptConfigItems(data.items, t);
      setItems(localized);
      setFileState(data.fileState);
      const values = Object.fromEntries(localized.map((i) => [i.key, i.value]));
      form.setFieldsValue({ values });
      return true;
    } finally {
      setLoading(false);
    }
  }, [form, locale, message, returnPath, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrompts = useCallback(
    async (fields: PromptFormValues) => {
      setSaving(true);
      try {
        const body = {
          items: items.map((i) => ({
            key: i.key,
            value: fields.values[i.key],
          })),
        };
        const res = await fetch("/api/admin/prompt-config", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as {
          items: PromptConfigApiItem[];
          fileState: PromptConfigFileState;
        };
        const localized = localizePromptConfigItems(data.items, t);
        setItems(localized);
        setFileState(data.fileState);
        const values = Object.fromEntries(localized.map((i) => [i.key, i.value]));
        form.setFieldsValue({ values });
        message.success(t("toast.saved"));
      } finally {
        setSaving(false);
      }
    },
    [form, items, locale, message, returnPath, t, tShell],
  );

  const openResetConfirm = () => {
    modal.confirm({
      title: t("confirm.reset.title"),
      content: t("confirm.reset.content"),
      okText: t("confirm.reset.ok"),
      cancelText: tConfirm("cancel"),
      okButtonProps: { danger: true },
      onOk: () => {
        const nextItems = buildDefaultPromptConfigItems(t);
        setItems(nextItems);
        form.setFieldsValue({
          values: Object.fromEntries(nextItems.map((i) => [i.key, i.value])),
        });
      },
    });
  };

  const openSaveConfirm = () => {
    void form
      .validateFields()
      .then((fields) => {
        modal.confirm({
          title: t("confirm.save.title"),
          content: t("confirm.save.content"),
          okText: t("confirm.save.ok"),
          cancelText: tConfirm("cancel"),
          onOk: () => savePrompts(fields as PromptFormValues),
        });
      })
      .catch(() => {
        /* 校验失败由表单项展示 */
      });
  };

  return (
    <PageContainer ghost title={t("title")}>
      <div style={{ maxWidth: 960 }}>
        {fileState === "invalid_json" && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={t("fileState.invalidJson.title")}
            description={t("fileState.invalidJson.description")}
          />
        )}

        <Spin spinning={loading}>
          <ProForm<PromptFormValues>
            form={form}
            layout="vertical"
            disabled={loading || saving}
            submitter={false}
            preserve={false}
          >
            {items.map((item) => (
              <ProFormTextArea
                key={item.key}
                name={["values", item.key]}
                label={
                  <span className="inline-flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.desc.trim() ? (
                      <Tooltip
                        title={
                          <div style={{ maxHeight: 280, overflowY: "auto" }}>{item.desc}</div>
                        }
                        overlayStyle={{ maxWidth: 420 }}
                      >
                        <QuestionCircleOutlined
                          tabIndex={0}
                          className="cursor-help text-cyan-400/80"
                          aria-label={t("form.item.ariaViewDesc", { name: item.name })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              (e.currentTarget as HTMLElement).click();
                            }
                          }}
                        />
                      </Tooltip>
                    ) : null}
                  </span>
                }
                extra={
                  <div className="mt-3 flex flex-col gap-2">
                    {item.params.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Typography.Text type="secondary" className="text-xs">
                          {t("label.supportedParams")}
                        </Typography.Text>
                        {item.params.map((p) => (
                          <Tooltip key={p.name} title={p.description}>
                            <Tag className="m-0 cursor-default border-cyan-500/40 text-cyan-100/90">
                              {p.name}
                            </Tag>
                          </Tooltip>
                        ))}
                      </div>
                    ) : null}
                    <Typography.Text type="secondary" className="text-xs">
                      {t("label.configKey", { key: item.key })}
                    </Typography.Text>
                  </div>
                }
                rules={templateValueRules(item)}
                fieldProps={{
                  autoSize: { minRows: 6, maxRows: 20 },
                }}
              />
            ))}

            <Space wrap className="w-full justify-end" style={{ marginBottom: 16 }}>
              <Button type="default" onClick={openResetConfirm} disabled={loading || saving}>
                {t("actions.reset")}
              </Button>
              <Button
                type="primary"
                ghost
                onClick={openSaveConfirm}
                loading={saving}
                disabled={loading}
              >
                {t("actions.save")}
              </Button>
            </Space>
          </ProForm>
        </Spin>

        {process.env.NODE_ENV === "development" ? (
          <Typography.Text type="secondary" className="text-xs">
            {t("hint.dev.persistPath")}
          </Typography.Text>
        ) : null}
      </div>
    </PageContainer>
  );
}
