"use client";

import { EditOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import {
  ProFormDigit,
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CONSOLE_MODEL_LIST_MAX_PAGE_SIZE } from "@/common/constants";
import type { ConsoleProfileResponse } from "@/common/types";
import type { ModelConfigListItem } from "@/common/types";
import { providerTagProps } from "@/app/console/models/model-provider-ui";

async function parseApiError(res: Response): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return j?.error?.message ?? `请求失败（${res.status}）`;
}

function modelOptionLabel(row: ModelConfigListItem): string {
  const p = providerTagProps(row.provider);
  const pn = p?.label ?? row.provider;
  const vis = row.visibility === "public" ? "公有" : "私有";
  const base = `[${vis}] [${pn}] ${row.modelName}`;
  const tagSuffix =
    row.tags.length > 0 ? ` · ${row.tags.join(" · ")}` : "";
  return `${base}${tagSuffix}`;
}

/** 表单项标签 + 说明图标（便于逐项扩展文案，避免页头长说明） */
function formLabelWithHint(text: string, hint: string, editing: boolean) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      <Tooltip title={hint} placement="topLeft">
        <QuestionCircleOutlined
          className={
            editing
              ? "cursor-help text-white/40 hover:text-white/65"
              : "cursor-help text-white/35 hover:text-white/55"
          }
        />
      </Tooltip>
    </span>
  );
}

/** 个人信息 / 用户配置 ProForm：标签与表单项同一行 */
const profileFormItemLayout = {
  layout: "horizontal" as const,
  labelCol: { flex: "0 0 112px" },
  wrapperCol: { flex: "1 1 auto", minWidth: 0 },
};

export default function ConsoleProfilePage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ConsoleProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelConfigListItem[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [personalEditing, setPersonalEditing] = useState(false);
  const [prefEditing, setPrefEditing] = useState(false);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);

  const [personalForm] = ProForm.useForm<{
    email: string;
    nickName: string;
    telNo: string;
  }>();
  const [prefForm] = ProForm.useForm<{
    preferredModelConfigId?: string;
    preferredVectorModelConfigId?: string;
    preferredKnowledgeTopK?: number;
    preferredKnowledgeThreshold?: number;
    preferredKnowledgeChunkSize?: number;
    preferredKnowledgeChunkOverlap?: number;
  }>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    setModelsError(null);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/console/profile", { credentials: "include" }),
        fetch(
          `/api/console/models?page=1&pageSize=${CONSOLE_MODEL_LIST_MAX_PAGE_SIZE}`,
          { credentials: "include" },
        ),
      ]);
      if (pRes.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/profile");
        return;
      }
      if (!pRes.ok) {
        setProfileError(await parseApiError(pRes));
        setProfile(null);
      } else {
        const data = (await pRes.json()) as ConsoleProfileResponse;
        setProfile(data);
      }
      if (mRes.status === 401) {
        return;
      }
      if (!mRes.ok) {
        setModelsError(await parseApiError(mRes));
        setModels([]);
      } else {
        const list = (await mRes.json()) as {
          items: ModelConfigListItem[];
        };
        setModels(list.items);
      }
    } catch {
      setProfileError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /** 浏览态：与 profile 同步；手机号空时展示「未填写」 */
  useEffect(() => {
    if (!profile || personalEditing) return;
    personalForm.setFieldsValue({
      email: profile.profile.email,
      nickName: profile.profile.nickName,
      telNo: profile.profile.telNo?.trim() ? profile.profile.telNo : "未填写",
    });
  }, [profile, personalEditing, personalForm]);

  /** 浏览态：偏好选择与 profile 同步 */
  useEffect(() => {
    if (!profile || prefEditing) return;
    prefForm.setFieldsValue({
      preferredModelConfigId: profile.preference.preferredModelConfigId ?? undefined,
      preferredVectorModelConfigId:
        profile.preference.preferredVectorModelConfigId ?? undefined,
      preferredKnowledgeTopK: profile.preference.knowledgeTopKEffective,
      preferredKnowledgeThreshold: profile.preference.knowledgeThresholdEffective,
      preferredKnowledgeChunkSize: profile.preference.knowledgeChunkSizeEffective,
      preferredKnowledgeChunkOverlap: profile.preference.knowledgeChunkOverlapEffective,
    });
  }, [profile, prefEditing, prefForm]);

  const openPersonalEdit = useCallback(() => {
    if (!profile) return;
    personalForm.setFieldsValue({
      email: profile.profile.email,
      nickName: profile.profile.nickName,
      telNo: profile.profile.telNo ?? "",
    });
    setPersonalEditing(true);
  }, [personalForm, profile]);

  const cancelPersonal = useCallback(() => {
    setPersonalEditing(false);
  }, []);

  const submitPersonal = useCallback(async () => {
    try {
      await personalForm.validateFields();
    } catch {
      return;
    }
    const v = personalForm.getFieldsValue();
    setPersonalSaving(true);
    try {
      const telTrim = (v.telNo ?? "").trim();
      const res = await fetch("/api/console/profile/personal", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          nickName: v.nickName.trim(),
          telNo: telTrim === "" ? null : telTrim,
        }),
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/profile");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      message.success("已保存");
      setPersonalEditing(false);
      await loadAll();
    } finally {
      setPersonalSaving(false);
    }
  }, [loadAll, message, personalForm]);

  const openPrefEdit = useCallback(() => {
    if (!profile) return;
    prefForm.setFieldsValue({
      preferredModelConfigId: profile.preference.preferredModelConfigId ?? undefined,
      preferredVectorModelConfigId:
        profile.preference.preferredVectorModelConfigId ?? undefined,
      preferredKnowledgeTopK: profile.preference.preferredKnowledgeTopK ?? undefined,
      preferredKnowledgeThreshold:
        profile.preference.preferredKnowledgeThreshold ?? undefined,
      preferredKnowledgeChunkSize:
        profile.preference.preferredKnowledgeChunkSize ?? undefined,
      preferredKnowledgeChunkOverlap:
        profile.preference.preferredKnowledgeChunkOverlap ?? undefined,
    });
    setPrefEditing(true);
  }, [prefForm, profile]);

  const cancelPref = useCallback(() => {
    setPrefEditing(false);
  }, []);

  const submitPref = useCallback(async () => {
    try {
      const v = await prefForm.validateFields();
      setPrefSaving(true);
      const res = await fetch("/api/console/profile/preference", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          preferredModelConfigId: v.preferredModelConfigId ?? null,
          preferredVectorModelConfigId: v.preferredVectorModelConfigId ?? null,
          preferredKnowledgeTopK:
            typeof v.preferredKnowledgeTopK === "number"
              ? Math.floor(v.preferredKnowledgeTopK)
              : null,
          preferredKnowledgeThreshold:
            typeof v.preferredKnowledgeThreshold === "number"
              ? v.preferredKnowledgeThreshold
              : null,
          preferredKnowledgeChunkSize:
            typeof v.preferredKnowledgeChunkSize === "number"
              ? Math.floor(v.preferredKnowledgeChunkSize)
              : null,
          preferredKnowledgeChunkOverlap:
            typeof v.preferredKnowledgeChunkOverlap === "number"
              ? Math.floor(v.preferredKnowledgeChunkOverlap)
              : null,
        }),
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/profile");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      message.success("已保存");
      setPrefEditing(false);
      await loadAll();
    } catch {
      /* validateFields failed */
    } finally {
      setPrefSaving(false);
    }
  }, [loadAll, message, prefForm]);

  return (
    <PageContainer ghost title="账号与偏好">
      <div className="max-w-[1400px]">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Card
              className="mb-5"
              title={
                <Typography.Title level={5} className="!mb-0 !text-white/90">
                  个人信息
                </Typography.Title>
              }
              extra={
                !personalEditing ? (
                  <Button
                    type="link"
                    ghost
                    icon={<EditOutlined />}
                    onClick={openPersonalEdit}
                  >
                    编辑
                  </Button>
                ) : (
                  <Space>
                    <Button onClick={cancelPersonal} disabled={personalSaving}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      ghost
                      loading={personalSaving}
                      onClick={() => void submitPersonal()}
                    >
                      保存
                    </Button>
                  </Space>
                )
              }
              styles={{ body: { paddingTop: 16 } }}
            >
              {profileError ? (
                <Alert
                  type="error"
                  showIcon
                  message="加载失败"
                  description={profileError}
                  action={
                    <Button size="small" type="primary" ghost onClick={() => void loadAll()}>
                      重试
                    </Button>
                  }
                />
              ) : profile ? (
                <ProForm
                  {...profileFormItemLayout}
                  form={personalForm}
                  submitter={false}
                  readonly={!personalEditing}
                  className="max-w-2xl"
                  requiredMark={personalEditing}
                  colon={false}
                >
                  <ProFormText
                    name="email"
                    label="邮箱"
                    fieldProps={{ disabled: true, className: "!text-white/90" }}
                  />
                  <ProFormText
                    name="nickName"
                    label="昵称"
                    rules={
                      personalEditing
                        ? [{ required: true, message: "请输入昵称" }]
                        : []
                    }
                    fieldProps={
                      personalEditing
                        ? {
                            maxLength: 32,
                            showCount: true,
                            placeholder: "1～32 个字符",
                          }
                        : {}
                    }
                  />
                  <ProFormText
                    name="telNo"
                    label="手机号"
                    extra={personalEditing ? "留空表示不绑定手机号" : undefined}
                    fieldProps={
                      personalEditing
                        ? { placeholder: "11 位数字，可选", maxLength: 11 }
                        : {}
                    }
                  />
                </ProForm>
              ) : null}
            </Card>

            <Card
              title={
                <Typography.Title level={5} className="!mb-0 !text-white/90">
                  用户配置
                </Typography.Title>
              }
              extra={
                models.length === 0 ? (
                  <Tooltip title="请先在模型管理中新增至少一条接入配置">
                    <span>
                      <Button type="link" ghost disabled icon={<EditOutlined />}>
                        编辑
                      </Button>
                    </span>
                  </Tooltip>
                ) : !prefEditing ? (
                  <Button
                    type="primary"
                    ghost
                    icon={<EditOutlined />}
                    onClick={openPrefEdit}
                  >
                    编辑
                  </Button>
                ) : (
                  <Space>
                    <Button onClick={cancelPref} disabled={prefSaving}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      ghost
                      loading={prefSaving}
                      onClick={() => void submitPref()}
                    >
                      保存
                    </Button>
                  </Space>
                )
              }
              styles={{ body: { paddingTop: 16 } }}
            >
              {modelsError ? (
                <Alert
                  type="error"
                  showIcon
                  message="模型列表加载失败"
                  description={modelsError}
                  action={
                    <Button size="small" type="primary" ghost onClick={() => void loadAll()}>
                      重试
                    </Button>
                  }
                />
              ) : null}

              {profile?.preference.preferenceStale ? (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-4"
                  message="原对话模型默认配置已失效，请重新选择。"
                />
              ) : null}

              {profile?.preference.vectorPreferenceStale ? (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-4"
                  message="原向量模型默认配置已失效，请重新选择。"
                />
              ) : null}

              {!profile ? null : models.length === 0 && !modelsError ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-white/55">
                      尚未登记模型。请先在模型管理中新增接入配置。
                    </span>
                  }
                >
                  <Link href="/console/models">
                    <Button type="primary" ghost>前往模型管理</Button>
                  </Link>
                </Empty>
              ) : (
                <ProForm
                  {...profileFormItemLayout}
                  form={prefForm}
                  submitter={false}
                  readonly={!prefEditing}
                  className="max-w-3xl"
                  requiredMark={false}
                  colon={false}
                >
                  <ProFormSelect
                    name="preferredModelConfigId"
                    label={formLabelWithHint(
                      "对话模型",
                      "账号级默认对话（Chat）模型，用于新会话等。请先在「模型管理」登记接入后再选；可与向量模型分别绑定，同一条登记也可复用。",
                      prefEditing,
                    )}
                    placeholder={prefEditing ? "请选择" : "未选择"}
                    allowClear={prefEditing}
                    showSearch={prefEditing}
                    options={models.map((m) => ({
                      value: m.id,
                      label: modelOptionLabel(m),
                    }))}
                    fieldProps={{
                      className: "w-full",
                      ...(prefEditing
                        ? {
                            filterOption: (input: string, option) =>
                              (option?.label ?? "")
                                .toString()
                                .toLowerCase()
                                .includes(input.toLowerCase()),
                          }
                        : {}),
                    }}
                  />
                  <ProFormSelect
                    name="preferredVectorModelConfigId"
                    label={formLabelWithHint(
                      "向量模型",
                      "用于知识库检索、文档分段嵌入（Embedding）等。请先在「模型管理」登记接入后再选；与对话模型可分别绑定。",
                      prefEditing,
                    )}
                    placeholder={prefEditing ? "请选择" : "未选择"}
                    allowClear={prefEditing}
                    showSearch={prefEditing}
                    options={models.map((m) => ({
                      value: m.id,
                      label: modelOptionLabel(m),
                    }))}
                    fieldProps={{
                      className: "w-full",
                      ...(prefEditing
                        ? {
                            filterOption: (input: string, option) =>
                              (option?.label ?? "")
                                .toString()
                                .toLowerCase()
                                .includes(input.toLowerCase()),
                          }
                        : {}),
                    }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeTopK"
                    label={formLabelWithHint(
                      "检索 topK",
                      "知识库检索每次最多返回的命中条数。留空时使用系统默认值。",
                      prefEditing,
                    )}
                    placeholder={prefEditing ? "留空使用默认值（3）" : undefined}
                    min={1}
                    max={20}
                    fieldProps={{ precision: 0, className: "w-full" }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeThreshold"
                    label={formLabelWithHint(
                      "检索置信度",
                      "知识库检索命中阈值（0-1）。留空时使用系统默认值。",
                      prefEditing,
                    )}
                    placeholder={prefEditing ? "留空使用默认值（0.75）" : undefined}
                    min={0}
                    max={1}
                    fieldProps={{ precision: 3, step: 0.05, className: "w-full" }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeChunkSize"
                    label={formLabelWithHint(
                      "分片长度",
                      "知识库向量化分片长度。留空时使用系统默认值。",
                      prefEditing,
                    )}
                    placeholder={prefEditing ? "留空使用默认值（1000）" : undefined}
                    min={200}
                    max={4000}
                    fieldProps={{ precision: 0, className: "w-full" }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeChunkOverlap"
                    label={formLabelWithHint(
                      "重叠长度",
                      "知识库向量化分片重叠长度。留空时使用系统默认值。",
                      prefEditing,
                    )}
                    placeholder={prefEditing ? "留空使用默认值（200）" : undefined}
                    min={0}
                    max={1000}
                    fieldProps={{ precision: 0, className: "w-full" }}
                  />
                </ProForm>
              )}
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
