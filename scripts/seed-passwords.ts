import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Atualizando senhas seguras dos usuários dos consultórios...');

  // Hash da senha padrão inicial: "bem123456"
  const defaultHash = hashPassword('bem123456');

  // Atualiza Edu Lara
  const userEdu = await prisma.user.findFirst({
    where: { email: 'terapeuta@edulara.com.br' }
  });

  if (userEdu) {
    await prisma.user.update({
      where: { id: userEdu.id },
      data: { passwordHash: defaultHash }
    });
    console.log('✓ Senha atualizada para terapeuta@edulara.com.br (senha padrão: bem123456)');
  }

  // Atualiza Dra. Camila
  const userCamila = await prisma.user.findFirst({
    where: { email: 'camila@viverbem.com.br' }
  });

  if (userCamila) {
    await prisma.user.update({
      where: { id: userCamila.id },
      data: { passwordHash: defaultHash }
    });
    console.log('✓ Senha atualizada para camila@viverbem.com.br (senha padrão: bem123456)');
  }

  console.log('Senhas atualizadas com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
