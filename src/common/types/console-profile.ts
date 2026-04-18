/** 单条已解析的模型配置摘要（对话或向量偏好共用结构） */
export type ConsoleProfileModelSummary = {
  id: string;
  provider: string;
  modelName: string;
  updatedAt: string;
};

/** GET /api/console/profile 聚合响应 */
export type ConsoleProfilePreference = {
  preferredModelConfigId: string | null;
  preferredModel: ConsoleProfileModelSummary | null;
  /** 曾指向无效记录，已在服务端清空指针；前端可提示用户重新选择 */
  preferenceStale: boolean;
  preferredVectorModelConfigId: string | null;
  preferredVectorModel: ConsoleProfileModelSummary | null;
  /** 向量偏好指针曾悬空，已在服务端清空 */
  vectorPreferenceStale: boolean;
  preferredKnowledgeTopK: number | null;
  preferredKnowledgeThreshold: number | null;
  preferredKnowledgeChunkSize: number | null;
  preferredKnowledgeChunkOverlap: number | null;
  knowledgeTopKEffective: number;
  knowledgeThresholdEffective: number;
  knowledgeChunkSizeEffective: number;
  knowledgeChunkOverlapEffective: number;
};

export type ConsoleProfileResponse = {
  profile: {
    email: string;
    nickName: string;
    telNo: string | null;
  };
  preference: ConsoleProfilePreference;
};
