import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/** 用户私有 Skill Pack 元数据；正文在 SkillPackFile（path='SKILL.md' 等）。 */
@Entity("user_skill_configs")
@Index(["userId", "updatedAt"])
@Index(["userId", "name"], { unique: true })
export class UserSkillConfig {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  /** @deprecated 0.1.19 起权威正文在 skill_pack_files；迁移后应为 null，新代码禁止读写 */
  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  /** 为 true 时每轮对话无条件合并 SKILL.md（意图路由跳过该 Pack）。 */
  @Column({ type: "boolean", default: false })
  alwaysLoad!: boolean;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
