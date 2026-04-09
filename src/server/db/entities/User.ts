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

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
