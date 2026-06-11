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
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CONSOLE_MODEL_LIST_MAX_PAGE_SIZE } from "@/common/constants";
import type { ConsoleProfileResponse } from "@/common/types";
import type { ModelConfigListItem } from "@/common/types";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import { Link } from "@/i18n/navigation";
import { formatModelConfigTag } from "@/common/model-config/model-tag-ui";
import { getProviderTagProps } from "../models/model-provider-ui";

/** 模型下拉展示：类型 + Provider + 名称 + 标签 */
function modelOptionLabel(
  row: ModelConfigListItem,
  t: ReturnType<typeof useTranslations<"page.console.profile">>,
  tModels: ReturnType<typeof useTranslations<"page.console.models">>,
): string {
  const p = getProviderTagProps(tModels, row.provider);
  const pn = p?.label ?? row.provider;
  const vis =
    row.visibility === "public"
      ? t("modelOption.public")
      : t("modelOption.private");
  const base = `[${vis}] [${pn}] ${row.modelName}`;
  const tagSuffix =
    row.tags.length > 0
      ? ` · ${row.tags.map((tag) => formatModelConfigTag(tag, tModels)).join(" · ")}`
      : "";
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

/** 个人信息 / 用户配置 ProForm：label 右对齐 + 冒号；列宽由 page.console.profile.formLayout.labelWidth 配置 */
function getProfileFormItemLayout(labelWidth: number) {
  return {
    layout: "horizontal" as const,
    labelAlign: "right" as const,
    colon: true,
    labelCol: { flex: `0 0 ${labelWidth}px` },
    wrapperCol: { flex: "1 1 auto", minWidth: 0 },
  };
}

export default function ProfileClient() {
  const locale = useLocale();
  const t = useTranslations("page.console.profile");
  const tShell = useTranslations("page.console.shell");
  const formLayout = useMemo(() => {
    const labelWidth = Number(t.raw("formLayout.labelWidth"));
    return getProfileFormItemLayout(labelWidth);
  }, [t]);
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

  const profileReturnPath = `/${locale}/console/profile`;

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
        redirectToLocaleLogin(locale, profileReturnPath);
        return;
      }
      if (!pRes.ok) {
        setProfileError(await parseApiError(pRes, { t: tShell }));
        setProfile(null);
      } else {
        const data = (await pRes.json()) as ConsoleProfileResponse;
        setProfile(data);
      }
      if (mRes.status === 401) {
        return;
      }
      if (!mRes.ok) {
        setModelsError(await parseApiError(mRes, { t: tShell }));
        setModels([]);
      } else {
        const list = (await mRes.json()) as {
          items: ModelConfigListItem[];
        };
        setModels(list.items);
      }
    } catch {
      setProfileError(tShell("errors.networkRetry"));
    } finally {
      setLoading(false);
    }
  }, [locale, profileReturnPath, tShell]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /** 浏览态：与 profile 同步；手机号空时展示未填写文案 */
  useEffect(() => {
    if (!profile || personalEditing) return;
    personalForm.setFieldsValue({
      email: profile.profile.email,
      nickName: profile.profile.nickName,
      telNo: profile.profile.telNo?.trim()
        ? profile.profile.telNo
        : t("form.personal.telNo.notSet"),
    });
  }, [profile, personalEditing, personalForm, t]);

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
        redirectToLocaleLogin(locale, profileReturnPath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      message.success(t("toast.saved"));
      setPersonalEditing(false);
      await loadAll();
    } finally {
      setPersonalSaving(false);
    }
  }, [loadAll, locale, message, personalForm, profileReturnPath, t, tShell]);

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
        redirectToLocaleLogin(locale, profileReturnPath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      message.success(t("toast.saved"));
      setPrefEditing(false);
      await loadAll();
    } catch {
      /* validateFields failed */
    } finally {
      setPrefSaving(false);
    }
  }, [loadAll, locale, message, prefForm, profileReturnPath, t, tShell]);

  const tModels = useTranslations("page.console.models");

  return (
    <PageContainer ghost title={t("title")}>
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
                  {t("section.personal")}
                </Typography.Title>
              }
              extra={
                !personalEditing ? (
                  <Button
                    type="primary"
                    ghost
                    icon={<EditOutlined />}
                    onClick={openPersonalEdit}
                  >
                    {t("actions.edit")}
                  </Button>
                ) : (
                  <Space>
                    <Button onClick={cancelPersonal} disabled={personalSaving}>
                      {t("actions.cancel")}
                    </Button>
                    <Button
                      type="primary"
                      ghost
                      loading={personalSaving}
                      onClick={() => void submitPersonal()}
                    >
                      {t("actions.save")}
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
                  message={t("alert.loadProfileFailed")}
                  description={profileError}
                  action={
                    <Button size="small" type="primary" ghost onClick={() => void loadAll()}>
                      {t("actions.retry")}
                    </Button>
                  }
                />
              ) : profile ? (
                <ProForm
                  {...formLayout}
                  form={personalForm}
                  submitter={false}
                  readonly={!personalEditing}
                  className="max-w-2xl"
                  requiredMark={personalEditing}
                >
                  <ProFormText
                    name="email"
                    label={t("form.personal.email.label")}
                    fieldProps={{ disabled: true, className: "!text-white/90" }}
                  />
                  <ProFormText
                    name="nickName"
                    label={t("form.personal.nickName.label")}
                    rules={
                      personalEditing
                        ? [
                            {
                              required: true,
                              message: t("form.personal.nickName.rules.required"),
                            },
                          ]
                        : []
                    }
                    fieldProps={
                      personalEditing
                        ? {
                            maxLength: 32,
                            showCount: true,
                            placeholder: t("form.personal.nickName.placeholder"),
                          }
                        : {}
                    }
                  />
                  <ProFormText
                    name="telNo"
                    label={t("form.personal.telNo.label")}
                    extra={
                      personalEditing ? t("form.personal.telNo.extra") : undefined
                    }
                    fieldProps={
                      personalEditing
                        ? {
                            placeholder: t("form.personal.telNo.placeholder"),
                            maxLength: 11,
                          }
                        : {}
                    }
                  />
                </ProForm>
              ) : null}
            </Card>

            <Card
              title={
                <Typography.Title level={5} className="!mb-0 !text-white/90">
                  {t("section.preferences")}
                </Typography.Title>
              }
              extra={
                models.length === 0 ? (
                  <Tooltip title={t("tooltip.prefEditDisabled")}>
                    <span>
                      <Button type="link" ghost disabled icon={<EditOutlined />}>
                        {t("actions.edit")}
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
                    {t("actions.edit")}
                  </Button>
                ) : (
                  <Space>
                    <Button onClick={cancelPref} disabled={prefSaving}>
                      {t("actions.cancel")}
                    </Button>
                    <Button
                      type="primary"
                      ghost
                      loading={prefSaving}
                      onClick={() => void submitPref()}
                    >
                      {t("actions.save")}
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
                  message={t("alert.loadModelsFailed")}
                  description={modelsError}
                  action={
                    <Button size="small" type="primary" ghost onClick={() => void loadAll()}>
                      {t("actions.retry")}
                    </Button>
                  }
                />
              ) : null}

              {profile?.preference.preferenceStale ? (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-4"
                  message={t("alert.chatModelStale")}
                />
              ) : null}

              {profile?.preference.vectorPreferenceStale ? (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-4"
                  message={t("alert.vectorModelStale")}
                />
              ) : null}

              {!profile ? null : models.length === 0 && !modelsError ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-white/55">{t("empty.noModels")}</span>
                  }
                >
                  <Link href="/console/models">
                    <Button type="primary" ghost>{t("empty.goToModels")}</Button>
                  </Link>
                </Empty>
              ) : (
                <ProForm
                  {...formLayout}
                  form={prefForm}
                  submitter={false}
                  readonly={!prefEditing}
                  className="max-w-3xl"
                  requiredMark={false}
                >
                  <ProFormSelect
                    name="preferredModelConfigId"
                    label={formLabelWithHint(
                      t("form.preferences.chatModel.label"),
                      t("form.preferences.chatModel.hint"),
                      prefEditing,
                    )}
                    placeholder={
                      prefEditing
                        ? t("form.preferences.selectPlaceholder")
                        : t("form.preferences.notSelected")
                    }
                    allowClear={prefEditing}
                    showSearch={prefEditing}
                    options={models.map((m) => ({
                      value: m.id,
                      label: modelOptionLabel(m, t, tModels),
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
                      t("form.preferences.vectorModel.label"),
                      t("form.preferences.vectorModel.hint"),
                      prefEditing,
                    )}
                    placeholder={
                      prefEditing
                        ? t("form.preferences.selectPlaceholder")
                        : t("form.preferences.notSelected")
                    }
                    allowClear={prefEditing}
                    showSearch={prefEditing}
                    options={models.map((m) => ({
                      value: m.id,
                      label: modelOptionLabel(m, t, tModels),
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
                      t("form.preferences.topK.label"),
                      t("form.preferences.topK.hint"),
                      prefEditing,
                    )}
                    placeholder={
                      prefEditing ? t("form.preferences.topK.placeholder") : undefined
                    }
                    min={1}
                    max={20}
                    fieldProps={{ precision: 0, className: "w-full" }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeThreshold"
                    label={formLabelWithHint(
                      t("form.preferences.threshold.label"),
                      t("form.preferences.threshold.hint"),
                      prefEditing,
                    )}
                    placeholder={
                      prefEditing
                        ? t("form.preferences.threshold.placeholder")
                        : undefined
                    }
                    min={0}
                    max={1}
                    fieldProps={{ precision: 3, step: 0.05, className: "w-full" }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeChunkSize"
                    label={formLabelWithHint(
                      t("form.preferences.chunkSize.label"),
                      t("form.preferences.chunkSize.hint"),
                      prefEditing,
                    )}
                    placeholder={
                      prefEditing
                        ? t("form.preferences.chunkSize.placeholder")
                        : undefined
                    }
                    min={200}
                    max={4000}
                    fieldProps={{ precision: 0, className: "w-full" }}
                  />
                  <ProFormDigit
                    name="preferredKnowledgeChunkOverlap"
                    label={formLabelWithHint(
                      t("form.preferences.chunkOverlap.label"),
                      t("form.preferences.chunkOverlap.hint"),
                      prefEditing,
                    )}
                    placeholder={
                      prefEditing
                        ? t("form.preferences.chunkOverlap.placeholder")
                        : undefined
                    }
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
