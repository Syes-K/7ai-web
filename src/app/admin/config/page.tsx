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
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_CONVERSATION_SUMMARY_CONFIG } from "@/common/constants/defaultConversationSummaryConfig";
import {
  CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
  CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
  CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
  CONVERSATION_SUMMARY_MAX_CHARS_MAX,
  CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
  CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
} from "@/common/constants";
import type { ConversationSummaryConfig, ConversationSummaryConfigFileState } from "@/common/types";

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

export default function AdminConfigPage() {
  const { message } = App.useApp();
  const [form] = ProForm.useForm<FormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileState, setFileState] = useState<ConversationSummaryConfigFileState | null>(null);
  const [fileHint, setFileHint] = useState<string | undefined>();

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config/conversation-summary", {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        window.location.href = "/login?redirect=" + encodeURIComponent("/admin/config");
        return false;
      }
      if (res.status === 403) {
        window.location.replace("/console?notice=admin_forbidden");
        return false;
      }
      if (!res.ok) {
        message.error("加载对话摘要配置失败");
        return false;
      }
      const data = (await res.json()) as {
        config: ConversationSummaryConfig;
        fileState: ConversationSummaryConfigFileState;
        fileHint?: string;
      };
      form.setFieldsValue(data.config);
      setFileState(data.fileState);
      setFileHint(data.fileHint);
      return true;
    } finally {
      setLoading(false);
    }
  }, [form, message]);

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
        if (res.status === 401) {
          window.location.href = "/login?redirect=" + encodeURIComponent("/admin/config");
          return;
        }
        if (res.status === 403) {
          window.location.replace("/console?notice=admin_forbidden");
          return;
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          message.error(j?.error?.message ?? "保存失败");
          return;
        }
        const data = (await res.json()) as {
          config: ConversationSummaryConfig;
          fileState: ConversationSummaryConfigFileState;
        };
        setFileState(data.fileState);
        setFileHint(undefined);
        form.setFieldsValue(data.config);
        message.success("保存成功");
      } finally {
        setSaving(false);
      }
    },
    [form, message],
  );

  return (
    <PageContainer ghost title="配置管理">
      <div style={{ maxWidth: 920 }}>
        {fileState === "invalid_json" && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="配置文件无法解析"
            description={fileHint ?? "已回退到默认配置，保存后将覆盖为合法 JSON。"}
          />
        )}

        <Spin spinning={loading || saving}>
          <Card title="对话摘要" variant="outlined">
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
                  <FieldLabel
                    text="启用对话摘要"
                    hint="关闭后对话链路不再挂载摘要中间件；开启后按下方参数与提示词模版生成会话级摘要。"
                  />
                }
                rules={[{ required: true, message: "请选择是否启用" }]}
                options={[
                  { value: true, label: "启用" },
                  { value: false, label: "关闭" },
                ]}
              />

              <ProFormDigit
                name="maxChars"
                label={
                  <FieldLabel
                    text="摘要最大字数"
                    hint={
                      <>
                        对应提示词中的 {"{maxChars}"}，用于约束模型生成摘要时的正文长度（按字符计，含标点与空格）。仅作提示词参数，服务端不会对摘要结果做二次截断。
                      </>
                    }
                  />
                }
                min={1}
                max={CONVERSATION_SUMMARY_MAX_CHARS_MAX}
                fieldProps={{ style: { width: "100%" }, precision: 0 }}
                rules={[
                  { required: true, message: "请输入摘要最大字数" },
                  {
                    type: "number",
                    min: 1,
                    max: CONVERSATION_SUMMARY_MAX_CHARS_MAX,
                    message: `请输入 1~${CONVERSATION_SUMMARY_MAX_CHARS_MAX} 的整数`,
                  },
                ]}
              />

              <ProFormSelect
                name="mode"
                label={
                  <FieldLabel
                    text="摘要触发模式"
                    hint="按消息条数：累计若干条对话后触发摘要；按 Token：按估算 token 量触发。触发后较早内容会折叠进摘要，与「保留窗口」配合使用。"
                  />
                }
                rules={[{ required: true, message: "请选择模式" }]}
                options={[
                  { value: "messages", label: "按消息条数" },
                  { value: "tokens", label: "按 Token 估算" },
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
                            text="触发阈值（Token）"
                            hint="当累计上下文 token 估算超过该值时触发摘要，将更早的消息折叠进摘要。"
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: "请输入触发阈值" },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
                            message: `请输入 1~${CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX} 的整数`,
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryKeepTokens"
                        preserve
                        label={
                          <FieldLabel
                            text="保留窗口（Token）"
                            hint="在最近对话中保留约多少 token 规模的原文不折叠；与 LangChain 摘要中间件的 keep.tokens 一致。"
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_KEEP_TOKENS_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: "请输入保留窗口" },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
                            message: `请输入 1~${CONVERSATION_SUMMARY_KEEP_TOKENS_MAX} 的整数`,
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryMinRecentMessages"
                        preserve
                        label={
                          <FieldLabel
                            text="最少保留消息条数"
                            hint="摘要后至少保留最近多少条原文消息（无论当前模式是 messages 还是 tokens），用于保留近几轮细节。"
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: "请输入最少保留消息条数" },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
                            message: `请输入 1~${CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX} 的整数`,
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
                            text="触发阈值（消息条数）"
                            hint="当消息条数达到该值时触发摘要，将更早的消息折叠进摘要。"
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: "请输入触发阈值" },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
                            message: `请输入 1~${CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX} 的整数`,
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryKeepMessages"
                        preserve
                        label={
                          <FieldLabel
                            text="保留窗口（消息条数）"
                            hint="在最近对话中保留多少条消息不折叠；与摘要中间件的 keep.messages 一致。"
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: "请输入保留窗口" },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
                            message: `请输入 1~${CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX} 的整数`,
                          },
                        ]}
                      />
                      <ProFormDigit
                        name="summaryMinRecentMessages"
                        preserve
                        label={
                          <FieldLabel
                            text="最少保留消息条数"
                            hint="摘要后至少保留最近多少条原文消息（无论当前模式是 messages 还是 tokens），用于保留近几轮细节。"
                          />
                        }
                        min={1}
                        max={CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX}
                        fieldProps={{ style: { width: "100%" }, precision: 0 }}
                        rules={[
                          { required: true, message: "请输入最少保留消息条数" },
                          {
                            type: "number",
                            min: 1,
                            max: CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
                            message: `请输入 1~${CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX} 的整数`,
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
                  恢复默认
                </Button>
                <Button
                  type="primary"
                  ghost
                  loading={saving}
                  onClick={() => void form.submit()}
                >
                  保存
                </Button>
              </Space>
            </ProForm>
          </Card>
        </Spin>

        <Typography.Paragraph type="secondary" className="mt-4">
          摘要提示词请在
          {" "}
          <Link href="/admin/prompts">提示词模版</Link>
          {" "}
          页面维护（`contextSummarySystem` / `summarySystemPrefix`）。
        </Typography.Paragraph>
      </div>
    </PageContainer>
  );
}
