import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * 控制台用户登记的 LLM 接入配置（Provider + 模型名 + 密钥密文）。
 * 按 `userId` 隔离；删除为物理删除。
 */
@Entity("user_model_configs")
@Index(["userId", "updatedAt"])
export class UserModelConfig {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 32 })
  provider!: string;

  @Column({ type: "varchar", length: 255 })
  modelName!: string;

  /** AES-256-GCM 密文（Base64URL），见 `server/model-config/api-key-crypto` */
  @Column({ type: "text" })
  apiKeyCipher!: string;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
