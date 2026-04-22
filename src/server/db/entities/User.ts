import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * 注册用户：登录账号为 email；telNo 可选且唯一（SQLite 允许多条 NULL）。
 */
@Entity("users")
export class User {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 20, nullable: true, unique: true })
  telNo!: string | null;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 64 })
  nickName!: string;

  @Column({ type: "varchar", length: 32, default: "active" })
  status!: string;

  /** 只读账号：仅允许 GET 请求，禁止新增/修改/删除等写操作 */
  @Column({ type: "boolean", default: false })
  readOnly!: boolean;

  /** 控制台默认使用的对话（Chat）模型配置（`user_model_configs.id`），可空 */
  @Column({ type: "varchar", length: 36, nullable: true })
  preferredModelConfigId!: string | null;

  /** 控制台默认使用的向量（Embedding）模型配置（`user_model_configs.id`），可空 */
  @Column({ type: "varchar", length: 36, nullable: true })
  preferredVectorModelConfigId!: string | null;

  /** 知识库检索默认 topK（未设置时回退到系统默认值） */
  @Column({ type: "int", nullable: true })
  preferredKnowledgeTopK!: number | null;

  /** 知识库检索默认阈值（未设置时回退到系统默认值） */
  @Column({ type: "float", nullable: true })
  preferredKnowledgeThreshold!: number | null;

  /** 知识库分片默认 chunkSize（未设置时回退到系统默认值） */
  @Column({ type: "int", nullable: true })
  preferredKnowledgeChunkSize!: number | null;

  /** 知识库分片默认 chunkOverlap（未设置时回退到系统默认值） */
  @Column({ type: "int", nullable: true })
  preferredKnowledgeChunkOverlap!: number | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
