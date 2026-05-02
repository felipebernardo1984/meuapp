import { db } from "./db";
import { whatsappAutomation, whatsappDispatchLog, students } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";

export type WhatsappAutomationConfig = typeof whatsappAutomation.$inferSelect;

export async function getAutomationConfig(arenaId: string): Promise<WhatsappAutomationConfig | null> {
  const result = await db.select().from(whatsappAutomation).where(eq(whatsappAutomation.arenaId, arenaId)).limit(1);
  return result[0] ?? null;
}

export async function saveAutomationConfig(arenaId: string, data: Partial<WhatsappAutomationConfig>) {
  const existing = await getAutomationConfig(arenaId);
  if (existing) {
    await db.update(whatsappAutomation).set({ ...data, updated_at: new Date() }).where(eq(whatsappAutomation.arenaId, arenaId));
  } else {
    await db.insert(whatsappAutomation).values({ arenaId, ...data });
  }
  return getAutomationConfig(arenaId);
}

export async function getPendingDispatches(arenaId: string) {
  const rows = await db
    .select({
      id: whatsappDispatchLog.id,
      alunoId: whatsappDispatchLog.alunoId,
      tipo: whatsappDispatchLog.tipo,
      mensagem: whatsappDispatchLog.mensagem,
      status: whatsappDispatchLog.status,
      disparo_num: whatsappDispatchLog.disparo_num,
      criado_em: whatsappDispatchLog.criado_em,
      alunoNome: students.nome,
      alunoTelefone: students.telefone,
    })
    .from(whatsappDispatchLog)
    .leftJoin(students, eq(whatsappDispatchLog.alunoId, students.id))
    .where(and(eq(whatsappDispatchLog.arenaId, arenaId), eq(whatsappDispatchLog.status, "pendente")))
    .orderBy(whatsappDispatchLog.criado_em);
  return rows;
}

export async function markDispatchSent(id: string) {
  await db.update(whatsappDispatchLog).set({ status: "enviado", enviado_em: new Date() }).where(eq(whatsappDispatchLog.id, id));
}

export async function markAllDispatchesSent(arenaId: string) {
  await db.update(whatsappDispatchLog)
    .set({ status: "enviado", enviado_em: new Date() })
    .where(and(eq(whatsappDispatchLog.arenaId, arenaId), eq(whatsappDispatchLog.status, "pendente")));
}

export async function runWhatsappAutomation(arenaId: string) {
  const config = await getAutomationConfig(arenaId);
  if (!config) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Cobrança ──────────────────────────────────────────────────────────────
  if (config.cobranca_ativo) {
    const diasApos = config.cobranca_dias_apos_vencimento ?? 1;
    const maxDisparos = config.cobranca_num_disparos ?? 3;
    const intervalo = config.cobranca_intervalo_dias ?? 3;
    const template = config.cobranca_mensagem ?? "Olá {{nome}}, sua mensalidade está em atraso.";

    // Busca alunos com mensalidade pendente da arena
    const inadimplentes = await db.select().from(students)
      .where(and(eq(students.arenaId, arenaId), eq(students.statusMensalidade, "Pendente"), eq(students.ativo, true)));

    for (const aluno of inadimplentes) {
      // Conta quantos disparos de cobrança já foram ENVIADOS para este aluno
      const [{ value: totalEnviados }] = await db
        .select({ value: count() })
        .from(whatsappDispatchLog)
        .where(and(
          eq(whatsappDispatchLog.arenaId, arenaId),
          eq(whatsappDispatchLog.alunoId, aluno.id),
          eq(whatsappDispatchLog.tipo, "cobranca"),
          eq(whatsappDispatchLog.status, "enviado"),
        ));

      if (Number(totalEnviados) >= maxDisparos) continue;

      // Verifica se já há um pendente para este aluno hoje
      const [{ value: pendentes }] = await db
        .select({ value: count() })
        .from(whatsappDispatchLog)
        .where(and(
          eq(whatsappDispatchLog.arenaId, arenaId),
          eq(whatsappDispatchLog.alunoId, aluno.id),
          eq(whatsappDispatchLog.tipo, "cobranca"),
          eq(whatsappDispatchLog.status, "pendente"),
        ));

      if (Number(pendentes) > 0) continue;

      // Verifica intervalo desde o último disparo enviado
      const ultimosEnviados = await db.select().from(whatsappDispatchLog)
        .where(and(
          eq(whatsappDispatchLog.arenaId, arenaId),
          eq(whatsappDispatchLog.alunoId, aluno.id),
          eq(whatsappDispatchLog.tipo, "cobranca"),
          eq(whatsappDispatchLog.status, "enviado"),
        ))
        .orderBy(whatsappDispatchLog.enviado_em)
        .limit(1);

      if (ultimosEnviados.length > 0 && ultimosEnviados[0].enviado_em) {
        const ultimoEnvio = new Date(ultimosEnviados[0].enviado_em);
        ultimoEnvio.setHours(0, 0, 0, 0);
        const diffDias = Math.floor((today.getTime() - ultimoEnvio.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias < intervalo) continue;
      } else if (ultimosEnviados.length === 0) {
        // Primeiro disparo: só envia depois de X dias do "vencimento" (approx: hoje é dia de disparar)
        // Como não temos vencimento exato, usamos diasApos como dias desde que ficou pendente
        // Simplificado: apenas gera na primeira execução se já não existe nenhum disparo
      }

      const mensagem = template
        .replace(/\{\{nome\}\}/g, aluno.nome)
        .replace(/\{\{status\}\}/g, aluno.statusMensalidade ?? "Pendente")
        .replace(/\{\{checkins\}\}/g, String(aluno.checkinsRealizados ?? 0));
      await db.insert(whatsappDispatchLog).values({
        arenaId,
        alunoId: aluno.id,
        tipo: "cobranca",
        mensagem,
        status: "pendente",
        disparo_num: Number(totalEnviados) + 1,
      });
    }
  }

  // ── Assiduidade ───────────────────────────────────────────────────────────
  if (config.assiduidade_ativo) {
    const diasSemCheckin = config.assiduidade_dias_sem_checkin ?? 7;
    const maxDisparos = config.assiduidade_num_disparos ?? 3;
    const intervalo = config.assiduidade_intervalo_dias ?? 7;
    const template = config.assiduidade_mensagem ?? "Olá {{nome}}, sentimos sua falta!";

    const limiteData = new Date(today);
    limiteData.setDate(limiteData.getDate() - diasSemCheckin);

    const todosAlunos = await db.select().from(students)
      .where(and(eq(students.arenaId, arenaId), eq(students.ativo, true)));

    for (const aluno of todosAlunos) {
      // Verifica último check-in
      if (!aluno.ultimoCheckin) continue;
      const ultimoCheckinDate = new Date(aluno.ultimoCheckin);
      ultimoCheckinDate.setHours(0, 0, 0, 0);
      if (ultimoCheckinDate >= limiteData) continue; // checkin recente, ignora

      const [{ value: totalEnviados }] = await db
        .select({ value: count() })
        .from(whatsappDispatchLog)
        .where(and(
          eq(whatsappDispatchLog.arenaId, arenaId),
          eq(whatsappDispatchLog.alunoId, aluno.id),
          eq(whatsappDispatchLog.tipo, "assiduidade"),
          eq(whatsappDispatchLog.status, "enviado"),
        ));

      if (Number(totalEnviados) >= maxDisparos) continue;

      const [{ value: pendentes }] = await db
        .select({ value: count() })
        .from(whatsappDispatchLog)
        .where(and(
          eq(whatsappDispatchLog.arenaId, arenaId),
          eq(whatsappDispatchLog.alunoId, aluno.id),
          eq(whatsappDispatchLog.tipo, "assiduidade"),
          eq(whatsappDispatchLog.status, "pendente"),
        ));

      if (Number(pendentes) > 0) continue;

      const ultimosEnviados = await db.select().from(whatsappDispatchLog)
        .where(and(
          eq(whatsappDispatchLog.arenaId, arenaId),
          eq(whatsappDispatchLog.alunoId, aluno.id),
          eq(whatsappDispatchLog.tipo, "assiduidade"),
          eq(whatsappDispatchLog.status, "enviado"),
        ))
        .orderBy(whatsappDispatchLog.enviado_em)
        .limit(1);

      if (ultimosEnviados.length > 0 && ultimosEnviados[0].enviado_em) {
        const ultimoEnvio = new Date(ultimosEnviados[0].enviado_em);
        ultimoEnvio.setHours(0, 0, 0, 0);
        const diffDias = Math.floor((today.getTime() - ultimoEnvio.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias < intervalo) continue;
      }

      const mensagem = template
        .replace(/\{\{nome\}\}/g, aluno.nome)
        .replace(/\{\{status\}\}/g, aluno.statusMensalidade ?? "")
        .replace(/\{\{checkins\}\}/g, String(aluno.checkinsRealizados ?? 0));
      await db.insert(whatsappDispatchLog).values({
        arenaId,
        alunoId: aluno.id,
        tipo: "assiduidade",
        mensagem,
        status: "pendente",
        disparo_num: Number(totalEnviados) + 1,
      });
    }
  }
}
