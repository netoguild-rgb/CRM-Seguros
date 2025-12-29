/*
  Warnings:

  - You are about to drop the column `ano_veiculo` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `cpf` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "capital_vida" TEXT,
ADD COLUMN     "cobertura_roubo" TEXT,
ADD COLUMN     "idade_condutor" TEXT,
ADD COLUMN     "idades_saude" TEXT,
ADD COLUMN     "motivo_vida" TEXT,
ADD COLUMN     "obs_final" TEXT,
ADD COLUMN     "placa" TEXT,
ADD COLUMN     "plano_saude" TEXT,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "preferencia_rede" TEXT,
ADD COLUMN     "profissao" TEXT,
ADD COLUMN     "questionnaires" JSONB,
ADD COLUMN     "uso_veiculo" TEXT;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "ano_veiculo",
DROP COLUMN "cpf",
DROP COLUMN "email",
ADD COLUMN     "ano_do_veiculo" TEXT,
ADD COLUMN     "capital_vida" TEXT,
ADD COLUMN     "carro_reserva" TEXT,
ADD COLUMN     "cobertura_roubo" TEXT,
ADD COLUMN     "cobertura_terceiros" TEXT,
ADD COLUMN     "condutor_principal" TEXT,
ADD COLUMN     "idade_do_condutor" TEXT,
ADD COLUMN     "idades_saude" TEXT,
ADD COLUMN     "km_guincho" TEXT,
ADD COLUMN     "motivo_vida" TEXT,
ADD COLUMN     "obs_final" TEXT,
ADD COLUMN     "plano_saude" TEXT,
ADD COLUMN     "preferencia_rede" TEXT,
ADD COLUMN     "profissao" TEXT,
ADD COLUMN     "renavan" TEXT;

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clientId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
