/** 列表/详情 API 返回项 */
export type AssistantListItem = {
  id: string;
  /** 系统助手或当前用户个人助手 */
  scope: "system" | "personal";
  name: string;
  prompt: string;
  icon: string | null;
  openingMessage: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
