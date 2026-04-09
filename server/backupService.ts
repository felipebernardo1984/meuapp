import fs from "fs";
import path from "path";
import { db } from "./db";
import {
  arenas,
  students,
  teachers,
  plans,
  checkinHistory
} from "@shared/schema";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export async function runDatabaseBackup() {
  try {

    // Garante que a pasta existe
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR);
    }

    const date = new Date().toISOString().split("T")[0];

    const backupFile = path.join(
      BACKUP_DIR,
      `backup_${date}.json`
    );

    // Coleta dados do banco
    const data = {
      arenas: await db.select().from(arenas),
      students: await db.select().from(students),
      teachers: await db.select().from(teachers),
      plans: await db.select().from(plans),

      // 🔥 CORREÇÃO AQUI
      checkins: await db.select().from(checkinHistory),

      createdAt: new Date().toISOString(),
    };

    // Salva backup
    fs.writeFileSync(
      backupFile,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    console.log("✅ Backup criado:", backupFile);

  } catch (error) {

    console.error("❌ Erro ao gerar backup:", error);

  }
}