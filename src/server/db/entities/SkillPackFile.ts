import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/** Skill Pack 内单文件行；路径已归一化为 POSIX 相对路径。 */
@Entity("skill_pack_files")
@Index(["userId", "packId"])
@Index(["packId", "path"], { unique: true })
@Index(["packId"])
export class SkillPackFile {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  packId!: string;

  /** 冗余 userId，所有查询须带用户隔离 */
  @Column({ type: "varchar", length: 36 })
  userId!: string;

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
