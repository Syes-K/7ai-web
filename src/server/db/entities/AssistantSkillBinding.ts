import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

/** 助手与用户 Skill 配置的多对多挂载。 */
@Entity("assistant_skill_bindings")
@Index(["userId", "skillConfigId"])
@Index(["assistantId"])
@Index(["assistantId", "skillConfigId"], { unique: true })
export class AssistantSkillBinding {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 36 })
  assistantId!: string;

  @Column({ type: "varchar", length: 36 })
  skillConfigId!: string;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;
}
