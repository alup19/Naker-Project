# Naker Distribuidor

Plataforma de catálogo premium para distribuidores. Monorepo com Next.js (App Router), NestJS REST, PostgreSQL e Prisma. Interface em português do Brasil, valores monetários armazenados em centavos e exibidos em Real.

## Rodar localmente usando Neon (sem Docker)

1. Crie um projeto no Neon e copie a connection string PostgreSQL. Ela deve conter `sslmode=require`; para começar, pode usar a URL pooled ou direta do Neon.
2. Copie `.env.example` para `.env`, cole a URL em `DATABASE_URL` e defina segredos JWT fortes.
3. Instale dependências na raiz: `npm install`.
4. Rode `npm run db:deploy` para criar/atualizar as tabelas e `npm run db:seed` uma vez para inserir os dados de demonstração.
5. Inicie a aplicação com `npm run dev`. Na inicialização, as migrations são aplicadas e o Prisma Client é atualizado; a API fica em `http://localhost:4000/docs` e o site em `http://localhost:3000`.

O modo local não exige Docker. As fotos que você escolhe para os produtos são otimizadas e guardadas no IndexedDB do navegador, somente no dispositivo atual; elas não são enviadas ao Neon nem aparecem no link público. Na aba **Cardápio**, gere PNGs com nome e preço base ou escolha um cliente para usar os preços personalizados; no celular, compartilhe pelo menu do aparelho, e no computador baixe os arquivos para anexar no WhatsApp Web. Cada imagem inclui até oito produtos e o sistema cria páginas extras automaticamente. Se usar outro navegador/dispositivo, selecione as fotos novamente nele. O PostgreSQL precisa estar acessível pela internet para login, preços e dados; o gerador usa as fotos locais do aparelho.

Para usar novamente o PostgreSQL do Docker, mantenha o Compose como está, troque `DATABASE_URL` no `.env` para `postgresql://naker:naker@127.0.0.1:5432/naker?schema=public` e rode `npm run db:seed`/`npm run dev` conforme necessário.

Para iniciar tudo em containers, execute `docker compose up --build`; o serviço da API aplica migrations automaticamente. Rode `npm run db:seed` para popular os exemplos. Para validar regras e o fluxo HTTP público, use `npm --workspace apps/api test` e `npm --workspace apps/api run test:e2e`.

## Acessar em outro dispositivo da rede local

Com Compose ativo, descubra o IPv4 do computador com `ipconfig` e abra `http://IP-DO-COMPUTADOR:3000` no outro dispositivo. Em desenvolvimento, a interface usa o mesmo hostname para chamar a API na porta 4000, e a API aceita origens HTTP da rede privada na porta 3000. Se o navegador não conectar, permita as portas TCP 3000 e 4000 no Firewall do Windows para a rede privada. Os dispositivos precisam estar na mesma rede Wi-Fi/LAN.

## Decisões

- Preços persistidos como `Int` em centavos para evitar erros de ponto flutuante.
- Refresh JWT é guardado em cookie httpOnly; access JWT é retornado no corpo da sessão.
- Fotos selecionadas pelo painel são otimizadas e guardadas no IndexedDB deste navegador/dispositivo. A página pública não exibe fotos; o cardápio com fotos é gerado localmente para compartilhar como PNG, sem serviço de hospedagem de imagens.
- O telefone de WhatsApp do distribuidor é configurável na aba Configurações e alimenta os pedidos dos catálogos públicos.
- Em Configurações, o distribuidor pode escolher modo claro/escuro e destaque dourado, azul ou verde. A preferência é salva no perfil, aplicada ao painel, ao catálogo público e às imagens geradas do cardápio, e usa tons ajustados para manter contraste legível.
- Notificações usam Sonner e cadastros/edições/exclusões de produtos e clientes usam modais próprios.
- Preços por cliente são editados numa tabela e salvos em lote; a API persiste apenas os produtos alterados numa transação. Busca por nome de cliente/categoria usa campos de sugestão pesquisáveis; categorias podem ser excluídas com confirmação e os produtos permanecem sem categoria.
- Recuperação de senha cria token de uso único e o expõe apenas no log em desenvolvimento; produção deve conectar um provedor de e-mail.
- A interface usa componentes no padrão shadcn/ui sobre Tailwind, com configuração em `apps/web/components.json`.
- Catálogos usam slug único do distribuidor e links individuais com token criptograficamente aleatório, revogáveis por cliente.
- Cardápio em imagem é composto no navegador para permitir download e compartilhamento sem serviço de renderização dedicado.
- O seed cria usuário, produtos e clientes demonstrativos; senha de desenvolvimento `Naker@123`.

## Estrutura

- `apps/api`: módulos NestJS, Swagger, Prisma, autenticação e API pública/privada.
- `apps/web`: Next.js responsivo em tema grafite e dourado.

## Segurança e produção

Configure segredos fortes, SMTP, storage remoto e HTTPS antes da publicação. API aplica Helmet, CORS limitado à origem web, throttling, validação DTO, bcrypt, verificação de dono do recurso e limite/validação de upload.
