import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

/** Skill Pack 脚本沙箱执行审计（保留 90 天）。 */
@Entity("skill_script_runs")
@Index(["userId", "createdAt"])
@Index(["userId", "packId"])
@Index(["createdAt"])
export class SkillScriptRun {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 36 })
  packId!: string;

  @Column({ type: "varchar", length: 512 })
  path!: string;

  /** 超时 kill 等场景可为 null */
  @Column({ type: "int", nullable: true })
  exitCode!: number | null;

  @Column({ type: "int" })
  durationMs!: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  errorSummary!: string | null;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;
}
