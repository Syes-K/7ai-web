import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/** Skill Pack 内单文件行；路径已归一化为 POSIX 相对路径。0.1.21 起按 packId 隔离，无 userId。 */
@Entity("skill_pack_files")
@Index(["packId", "path"], { unique: true })
@Index(["packId"])
export class SkillPackFile {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  packId!: string;

  @Column({ type: "varchar", length: 512 })
  path!: string;

  /** UTF-8 文本；MVP 不支持二进制 blob */
  @Column({ type: "text" })
  content!: string;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
