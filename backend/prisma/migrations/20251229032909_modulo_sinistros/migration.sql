-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "claimId" INTEGER;

-- CreateTable
CREATE TABLE "Claim" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "data_ocorrencia" TIMESTAMP(3) NOT NULL,
    "data_aviso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_sinistro" TEXT NOT NULL,
    "descricao" TEXT,
    "oficina_nome" TEXT,
    "oficina_tel" TEXT,
    "terceiro_nome" TEXT,
    "terceiro_tel" TEXT,
    "placa_terceiro" TEXT,
    "valor_franquia" DOUBLE PRECISION,
    "valor_orcamento" DOUBLE PRECISION,
    "valor_final" DOUBLE PRECISION,
    "clientId" INTEGER NOT NULL,
    "policyId" INTEGER,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
