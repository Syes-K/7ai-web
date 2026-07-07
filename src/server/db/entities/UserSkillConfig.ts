import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

/** 系统 Skill Pack 元数据；正文在 skill_pack_files。0.1.21 起为平台全局资产，无 userId。 */
@Entity("user_skill_configs")
@Index(["updatedAt"])
@Index(["name"], { unique: true })
export class UserSkillConfig {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

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

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;

  @UpdateDateColumn(timestampColumn())
  updatedAt!: Date;
}
