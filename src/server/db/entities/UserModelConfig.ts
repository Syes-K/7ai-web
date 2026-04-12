import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { ModelConfigVisibility } from "@/common/enums";

/**
 * LLM 接入配置（Provider + 模型名 + 密钥密文）。
 * 私有：仅 userId 对应用户；公有：管理后台登记，全站可选用（userId 为创建者/管理员）。
 */
@Entity("user_model_configs")
@Index(["userId", "updatedAt"])
@Index(["visibility", "updatedAt"])
export class UserModelConfig {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 16, default: ModelConfigVisibility.Private })
  visibility!: ModelConfigVisibility;

  @Column({ type: "varchar", length: 32 })
  provider!: string;

  @Column({ type: "varchar", length: 255 })
  modelName!: string;

  /** AES-256-GCM 密文（Base64URL），见 `server/model-config/api-key-crypto` */
  @Column({ type: "text" })
  apiKeyCipher!: string;

  /** 自定义标签 JSON 数组；旧数据可能为 null，读取时按空数组处理 */
  @Column({ type: "simple-json", nullable: true })
  tags!: string[] | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
