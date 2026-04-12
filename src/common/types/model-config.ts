import type { ModelConfigTag } from "@/common/constants";

/** 列表/详情返回项（永不包含明文 apiKey） */
export type ModelConfigListItem = {
  id: string;
  provider: string;
  modelName: string;
  apiKeyMasked: string;
  /** private：仅创建者；public：管理后台登记的公有模型，全站可选用 */
  visibility: "private" | "public";
  /** 预设标签，可多选；可为空；历史非法值在输出时过滤 */
  tags: ModelConfigTag[];
  createdAt: string;
  updatedAt: string;
};
