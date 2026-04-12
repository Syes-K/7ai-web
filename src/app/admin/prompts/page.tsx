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
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PROMPT_CONFIG } from "@/common/constants/defautPromptConfig";
import { validatePromptTemplate } from "@/common/prompt/validatePromptTemplate";
import type {
  PromptConfigApiItem,
  PromptConfigFileState,
  PromptConfigKey,
} from "@/common/types";

type PromptFormValues = { values: Record<string, string> };

/** 与 `defautPromptConfig.ts` 常量一致，用于「重置」恢复内置默认（不读磁盘）。 */
function itemsFromDefaultConstants(): PromptConfigApiItem[] {
  return (Object.keys(DEFAULT_PROMPT_CONFIG) as PromptConfigKey[]).map(
    (key) => {
      const f = DEFAULT_PROMPT_CONFIG[key];
      return {
        key,
        name: f.name,
        desc: f.desc,
        value: f.value,
        params: [...(f.params ?? [])],
      };
    },
  );
}

function templateValueRules(item: PromptConfigApiItem) {
  return [
    { required: true, whitespace: true, message: "请输入模版正文" },
    {
      validator: async (_: unknown, v: string) => {
        const r = validatePromptTemplate(v ?? "", item.params);
        if (!r.valid) throw new Error(r.message);
      },
    },
  ];
}

export default function AdminPromptsPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<PromptFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileState, setFileState] = useState<PromptConfigFileState | null>(null);
  const [fileHint, setFileHint] = useState<string | undefined>();
  const [items, setItems] = useState<PromptConfigApiItem[]>([]);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompt-config", {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/admin/prompts");
        return false;
      }
      if (res.status === 403) {
        window.location.replace("/console?notice=admin_forbidden");
        return false;
      }
      if (!res.ok) {
        message.error("加载配置失败");
        return false;
      }
      const data = (await res.json()) as {
        items: PromptConfigApiItem[];
        fileState: PromptConfigFileState;
        fileHint?: string;
      };
      setItems(data.items);
      setFileState(data.fileState);
      setFileHint(data.fileHint);
      const values = Object.fromEntries(data.items.map((i) => [i.key, i.value]));
      form.setFieldsValue({ values });
      return true;
    } finally {
      setLoading(false);
    }
  }, [form, message]);

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
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/admin/prompts");
          return;
        }
        if (res.status === 403) {
          window.location.replace("/console?notice=admin_forbidden");
          return;
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          message.error(j?.error?.message ?? "保存失败");
          return;
        }
        const data = (await res.json()) as {
          items: PromptConfigApiItem[];
          fileState: PromptConfigFileState;
        };
        setItems(data.items);
        setFileState(data.fileState);
        setFileHint(undefined);
        const values = Object.fromEntries(data.items.map((i) => [i.key, i.value]));
        form.setFieldsValue({ values });
        message.success("保存成功");
      } finally {
        setSaving(false);
      }
    },
    [form, items, message],
  );

  const openResetConfirm = () => {
    modal.confirm({
      title: "确认重置",
      content:
        "将把表单恢复为代码内置默认；当前未保存的编辑将丢失。若需使用重置的配置，请再点「保存」。",
      okText: "确认重置",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        const nextItems = itemsFromDefaultConstants();
        setItems(nextItems);
        form.setFieldsValue({
          values: Object.fromEntries(
            nextItems.map((i) => [i.key, i.value]),
          ),
        });
      },
    });
  };

  /** 先通过 ProForm 全量校验，再弹出二次确认，避免未校验即保存 */
  const openSaveConfirm = () => {
    void form
      .validateFields()
      .then((fields) => {
        modal.confirm({
          title: "确认保存",
          content:
            "将把当前表单中的提示词模版写入服务器。是否继续？",
          okText: "确认保存",
          cancelText: "取消",
          onOk: () => savePrompts(fields as PromptFormValues),
        });
      })
      .catch(() => {
        /* 校验失败由表单项展示，不打开弹窗 */
      });
  };

  return (
    <PageContainer ghost title="提示词模版">
      <div style={{ maxWidth: 960 }}>
        {fileState === "invalid_json" && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="配置文件无法解析"
            description={fileHint ?? "已使用内置默认文案；保存后将写入合法 JSON 文件。"}
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
                          <div
                            style={{
                              maxHeight: 280,
                              overflowY: "auto",
                            }}
                          >
                            {item.desc}
                          </div>
                        }
                        overlayStyle={{ maxWidth: 420 }}
                      >
                        <QuestionCircleOutlined
                          tabIndex={0}
                          className="cursor-help text-cyan-400/80"
                          aria-label={`查看说明：${item.name}`}
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
                  <div className="flex flex-col gap-2">
                    {item.params.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Typography.Text type="secondary" className="text-xs">
                          支持参数：
                        </Typography.Text>
                        {item.params.map((p) => (
                          <Tooltip key={p.name} title={p.description}>
                            <Tag className="m-0 cursor-default border-cyan-500/40 text-cyan-100/90">
                              {`${p.name}`}
                            </Tag>
                          </Tooltip>
                        ))}
                      </div>
                    ) : null}
                    <Typography.Text type="secondary" className="text-xs">
                      配置 key：{item.key}
                    </Typography.Text>
                  </div>
                }
                rules={templateValueRules(item)}
                fieldProps={{
                  autoSize: { minRows: 6, maxRows: 20 },
                }}
              />
            ))}

            <Space
              wrap
              className="w-full justify-end"
              style={{ marginBottom: 16 }}
            >
              <Button
                type="default"
                onClick={openResetConfirm}
                disabled={loading || saving}
              >
                重置
              </Button>
              <Button
                type="primary"
                ghost
                onClick={openSaveConfirm}
                loading={saving}
                disabled={loading}
              >
                保存
              </Button>
            </Space>
          </ProForm>
        </Spin>

        {process.env.NODE_ENV === "development" ? (
          <Typography.Text type="secondary" className="text-xs">
            开发提示：持久化路径为项目根目录下 data/promptConfig.json（目录已加入
            .gitignore）
          </Typography.Text>
        ) : null}
      </div>
    </PageContainer>
  );
}
