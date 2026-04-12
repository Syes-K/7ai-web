/** 列表/详情返回项（永不包含明文 apiKey） */
export type ModelConfigListItem = {
  id: string;
  provider: string;
  modelName: string;
  apiKeyMasked: string;
  createdAt: string;
  updatedAt: string;
};
