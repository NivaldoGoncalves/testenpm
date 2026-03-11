const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// Configurações básicas
app.use(cors()); // Permite que o seu front-end acesse o back-end
// Aumentando o limite do servidor para aceitar imagens de até 50 megabytes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const path = require("path"); // Adicione isso lá no topo, junto com os outros requires

// ... suas outras configurações ...

// 1. Ensina o servidor a entregar os arquivos da pasta "projeto_pi" (CSS, imagens, HTMLs)
app.use(express.static(path.join(__dirname, "projeto_pi")));

// 2. Cria uma rota principal: se alguém acessar o link limpo da Vercel, joga para o Login!
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "projeto_pi", "telaLogin.html"));
});

// Configuração do Banco de Dados
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_O3yfo2mzTxQB@ep-tiny-cake-acntsgf1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false, // Importante para conectar em bancos na nuvem
  },
});

// ==========================================
// ROTA DE CADASTRO DE USUÁRIOS
// ==========================================
app.post("/cadastro", async (req, res) => {
  try {
    // Pega os dados enviados pelo telaCadastro.html
    const { nome, genero, dataNascimento, email, senha } = req.body;

    // Insere na tabela com os nomes de colunas corretos da sua equipe
    const novoUsuario = await pool.query(
      `INSERT INTO tb_cad_usuario 
            (nome_usuario, genero_usuario, dat_nasc_usuario, email_usuario, senha_usuario) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome, genero, dataNascimento, email, senha],
    );

    // Responde ao front-end que deu tudo certo
    res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: novoUsuario.rows[0],
    });
  } catch (erro) {
    console.error("Erro no banco de dados:", erro);
    res.status(500).json({
      erro: "Erro ao cadastrar. Verifique se o e-mail já está em uso.",
    });
  }
});
// ==========================================
// ROTA DE LOGIN
// ==========================================
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // 1. Procura no banco se existe algum usuário com esse e-mail
    const usuarioEncontrado = await pool.query(
      "SELECT * FROM tb_cad_usuario WHERE email_usuario = $1",
      [email],
    );

    // 2. Se não encontrou o e-mail (a lista de resultados é vazia)
    if (usuarioEncontrado.rows.length === 0) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const usuarioBanco = usuarioEncontrado.rows[0];

    // 3. Se encontrou o e-mail, verifica se a senha bate
    if (senha === usuarioBanco.senha_usuario) {
      // Senha correta!
      res.status(200).json({
        mensagem: "Login bem-sucedido!",
        // Envia alguns dados não sensíveis de volta para o front-end usar
        usuario: {
          id: usuarioBanco.id_usuario,
          nome: usuarioBanco.nome_usuario,
        },
      });
    } else {
      // Senha errada!
      res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }
  } catch (erro) {
    console.error("Erro no login:", erro);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// ==========================================
// ROTA PARA VERIFICAR E-MAIL (RECUPERAÇÃO DE SENHA)
// ==========================================
app.post("/verificar-email", async (req, res) => {
  try {
    const { email } = req.body;

    // Procura o usuário no banco
    const usuarioEncontrado = await pool.query(
      "SELECT * FROM tb_cad_usuario WHERE email_usuario = $1",
      [email],
    );

    // Se a lista vier vazia, o e-mail não está cadastrado
    if (usuarioEncontrado.rows.length === 0) {
      return res
        .status(404)
        .json({ erro: "Este e-mail não está cadastrado no sistema." });
    }

    // Se encontrou, dá o sinal verde para o front-end
    res.status(200).json({ mensagem: "E-mail encontrado com sucesso!" });
  } catch (erro) {
    console.error("Erro ao verificar e-mail:", erro);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// ==========================================
// ROTA PARA REDEFINIR SENHA
// ==========================================
app.put("/redefinir-senha", async (req, res) => {
  try {
    const { email, novaSenha } = req.body;

    // Comando SQL para atualizar (UPDATE) a senha onde o e-mail for igual ao fornecido
    const resultado = await pool.query(
      "UPDATE tb_cad_usuario SET senha_usuario = $1 WHERE email_usuario = $2 RETURNING *",
      [novaSenha, email],
    );

    // Se o rowCount for 0, significa que nenhum usuário com esse e-mail foi encontrado
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json({ mensagem: "Senha atualizada com sucesso!" });
  } catch (erro) {
    console.error("Erro ao atualizar senha:", erro);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});
// ==========================================
// ROTA PARA SOLICITAR SERVIÇO (Contratação Direta)
// ==========================================
app.post("/solicitar", async (req, res) => {
  try {
    const {
      idUsuario,
      urgente,
      dataServico,
      tipoServico, // Isso agora é o filtro principal!
      endereco,
      descricao,
      imagem,
    } = req.body;

    // Inserimos o pedido com id_profissional NULL para que fique "Aberto"
    const novaSolicitacao = await pool.query(
      `INSERT INTO tb_solicitacao 
            (id_usuario, id_profissional, urgente, data_servico, tipo_servico, endereco_servico, descricao_servico, imagem_problema, status_pedido) 
            VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'Pendente') RETURNING *`,
      [
        idUsuario,
        urgente,
        dataServico,
        tipoServico,
        endereco,
        descricao,
        imagem,
      ],
    );

    res.status(201).json({
      mensagem: "Pedido enviado para todos os profissionais da área!",
      pedido: novaSolicitacao.rows[0],
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar solicitação." });
  }
});
// ==========================================
// ROTA PARA ATUALIZAR O PERFIL (Com Foto)
// ==========================================
app.put("/atualizar-perfil", async (req, res) => {
  try {
    let { id, nome, apelido, dataNascimento, genero, profissao, cnh, foto } =
      req.body;

    if (dataNascimento === "") {
      dataNascimento = null;
    }

    // COALESCE($7, foto_perfil) faz com que a foto só seja substituída se uma nova for enviada
    const resultado = await pool.query(
      `UPDATE tb_cad_usuario 
             SET nome_usuario = $1, 
                 apelido_usuario = $2, 
                 dat_nasc_usuario = $3, 
                 genero_usuario = $4, 
                 profissoes_usuario = $5, 
                 cnh_usuario = $6,
                 foto_perfil = COALESCE($7, foto_perfil)
             WHERE id_usuario = $8 RETURNING *`,
      [nome, apelido, dataNascimento, genero, profissao, cnh, foto, id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json({ mensagem: "Perfil atualizado com sucesso!" });
  } catch (erro) {
    console.error("Erro ao atualizar perfil:", erro);
    res
      .status(500)
      .json({ erro: "Erro interno no servidor ao salvar perfil." });
  }
});
// ==========================================
// ROTA PARA BUSCAR OS DADOS DO PERFIL (GET) - ATUALIZADA COM LEFT JOIN
// ==========================================
app.get("/perfil/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // O LEFT JOIN junta a tabela de cadastro com a tabela profissional!
    const query = `
        SELECT u.*, p.preco_base, p.nota_media, p.habilidades 
        FROM tb_cad_usuario u
        LEFT JOIN tb_perfil_profissional p ON u.id_usuario = p.id_usuario
        WHERE u.id_usuario = $1
    `;

    const resultado = await pool.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro) {
    console.error("Erro ao buscar perfil:", erro);
    res
      .status(500)
      .json({ erro: "Erro interno no servidor ao buscar perfil." });
  }
});

// ==========================================
// ROTA 1: BUSCAR PEDIDOS PENDENTES (Para o Profissional ver)
// ==========================================
app.get("/pedidos/:idProfissional", async (req, res) => {
  try {
    const { idProfissional } = req.params;

    const profInfo = await pool.query(
      "SELECT profissoes_usuario FROM tb_cad_usuario WHERE id_usuario = $1",
      [idProfissional],
    );

    if (profInfo.rows.length === 0) return res.status(404).json([]);
    const minhaProfissao = profInfo.rows[0].profissoes_usuario;

    // NOVA LÓGICA:
    // Busca pedidos da minha profissão que estão sem dono (NULL)
    // OU pedidos que já são MEUS e estão com status 'Aceito'
    const query = `
        SELECT s.*, c.nome_usuario AS nome_cliente, c.foto_perfil AS foto_cliente
        FROM tb_solicitacao s
        JOIN tb_cad_usuario c ON s.id_usuario = c.id_usuario
        WHERE TRIM(s.tipo_servico) ILIKE TRIM($1) 
        AND (
            (s.id_profissional IS NULL AND s.status_pedido = 'Pendente') 
            OR 
            (s.id_profissional = $2 AND s.status_pedido = 'Aceito')
        )
        ORDER BY s.status_pedido DESC, s.id_solicitacao DESC
    `;

    const resultado = await pool.query(query, [minhaProfissao, idProfissional]);
    res.status(200).json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar tarefas." });
  }
});

// ==========================================
// ROTA 2: ACEITAR O PEDIDO (O Match!)
// ==========================================
app.put("/pedidos/:idPedido/aceitar", async (req, res) => {
  try {
    const { idPedido } = req.params;
    const { idProfissional } = req.body; // Precisamos saber QUEM aceitou

    // Atualiza o pedido colocando o ID do profissional que clicou primeiro
    const query = `
        UPDATE tb_solicitacao 
        SET status_pedido = 'Aceito', id_profissional = $1 
        WHERE id_solicitacao = $2 
        AND id_profissional IS NULL 
        RETURNING *
    `;

    const resultado = await pool.query(query, [idProfissional, idPedido]);

    if (resultado.rows.length === 0) {
      return res
        .status(400)
        .json({ erro: "Este pedido já foi aceito por outro profissional!" });
    }

    res
      .status(200)
      .json({ mensagem: "Match realizado!", pedido: resultado.rows[0] });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao processar aceite." });
  }
});

// Enviar mensagem
app.post("/mensagens", async (req, res) => {
  try {
    const { idSolicitacao, idEnvia, idRecebe, texto } = req.body;
    const novaMsg = await pool.query(
      "INSERT INTO tb_mensagens (id_solicitacao, id_envia, id_recebe, texto_mensagem) VALUES ($1, $2, $3, $4) RETURNING *",
      [idSolicitacao, idEnvia, idRecebe, texto],
    );
    res.status(201).json(novaMsg.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

// Buscar mensagens de um chat específico
app.get("/mensagens/:idSolicitacao", async (req, res) => {
  try {
    const { idSolicitacao } = req.params;
    const msgs = await pool.query(
      "SELECT * FROM tb_mensagens WHERE id_solicitacao = $1 ORDER BY data_envio ASC",
      [idSolicitacao],
    );
    res.status(200).json(msgs.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
});

// ==========================================
// ROTA PARA O CLIENTE VER O STATUS DOS SEUS PEDIDOS
// ==========================================
app.get("/pedidos-cliente/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
            SELECT s.*, u.nome_usuario as nome_profissional 
            FROM tb_solicitacao s
            LEFT JOIN tb_cad_usuario u ON s.id_profissional = u.id_usuario
            WHERE s.id_usuario = $1 
            ORDER BY s.id_solicitacao DESC
        `;
    const resultado = await pool.query(query, [id]);
    res.status(200).json(resultado.rows);
  } catch (err) {
    console.error("Erro ao buscar pedidos do cliente:", err);
    res.status(500).json({ error: "Erro ao buscar pedidos do cliente" });
  }
});
// Rota para pegar detalhes de um pedido específico e seus envolvidos
app.get("/perfil-pedido/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
            SELECT s.*, 
                   c.nome_usuario as nome_cliente, 
                   p.nome_usuario as nome_profissional
            FROM tb_solicitacao s
            JOIN tb_cad_usuario c ON s.id_usuario = c.id_usuario
            LEFT JOIN tb_cad_usuario p ON s.id_profissional = p.id_usuario
            WHERE s.id_solicitacao = $1
        `;
    const resultado = await pool.query(query, [id]);
    res.status(200).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar detalhes do pedido" });
  }
});
app.put("/pedidos/:id/concluir", async (req, res) => {
  try {
    await pool.query(
      "UPDATE tb_solicitacao SET status_pedido = 'Concluído' WHERE id_solicitacao = $1",
      [req.params.id],
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err);
  }
});

// ==========================================
// LIGAR O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
// ==========================================
// ROTA PARA FINALIZAR O SERVIÇO (Profissional)
// ==========================================
app.put("/pedidos/:id/concluir", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE tb_solicitacao SET status_pedido = 'Concluído' WHERE id_solicitacao = $1",
      [id],
    );
    res.status(200).json({ mensagem: "Serviço concluído com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao concluir o serviço." });
  }
});

// ==========================================
// ROTA PARA SALVAR A AVALIAÇÃO E ENCERRAR DE VEZ (Cliente)
// ==========================================
app.post("/avaliar", async (req, res) => {
  try {
    const { idSolicitacao, nota, comentario } = req.body;

    // (Opcional) Aqui você poderia inserir em uma tabela tb_avaliacoes
    // Para simplificar agora, vamos apenas mudar o status final do pedido
    await pool.query(
      "UPDATE tb_solicitacao SET status_pedido = 'Avaliado' WHERE id_solicitacao = $1",
      [idSolicitacao],
    );

    res.status(200).json({ mensagem: "Avaliação salva com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar avaliação." });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Servidor do PI rodando perfeitamente na porta ${PORT}!`);
});
// ==========================================
// CONFIGURAÇÃO DO FRONT-END PARA A VERCEL
// ==========================================
const path = require("path");

// 1. Libera o acesso a todos os arquivos dentro da pasta projeto_pi (CSS, Imagens, outros HTMLs)
app.use(express.static(path.join(process.cwd(), "projeto_pi")));

// 2. Quando o usuário entrar no link limpo (testenpm.vercel.app), joga ele pra tela de Login!
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "projeto_pi", "telaLogin.html"));
});

// A sua última linha DEVE continuar sendo essa aqui:
module.exports = app;
