const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const porta = process.env.PORT || 3000;
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/", (req, res) => {
  res.json({
    mensagem: "API de tarefas funcionando...",
    rotas: [
      "GET /teste-banco",
      "GET /criar-tabela-tarefas",
      "GET /tarefas",
      "POST /tarefas",
      "PUT /tarefas/:id",
      "DELETE /tarefas/:id",
    ],
  });
});

app.get("/teste-banco", async (req, res) => {
  try {
    const resultado = await pool.query("select now()");

    res.json({
      mensagem: "Conexão com o banco realizada com sucesso",
      dataHoraBanco: resultado.rows[0].now,
    });
  } catch (erro) {
    console.error("Erro ao conectar com o banco:", erro);

    res.status(500).json({
      erro: "Erro interno do servidor...",
    });
  }
});

app.get("/criar-tabela-tarefas", async (req, res) => {
  try {
    await pool.query(`
      create table if not exists tarefas (
        id serial primary key,
        titulo varchar(200) not null,
        descricao text,
        concluida boolean default false
      )
    `);

    res.json({
      mensagem: "Tabela tarefas criada com sucesso",
    });
  } catch (erro) {
    console.error("Erro ao criar tabela:", erro);

    res.status(500).json({
      erro: "Erro ao criar tabela tarefas",
    });
  }
});

app.get("/tarefas", async (req, res) => {
  try {
    const resultado = await pool.query(
      "select id, titulo, descricao, concluida from tarefas order by id desc",
    );

    res.json(resultado.rows);
  } catch (erro) {
    console.error("Erro ao buscar tarefas:", erro);

    res.status(500).json({
      erro: "Erro interno do servidor...",
    });
  }
});

app.post("/tarefas", async (req, res) => {
  try {
    const { titulo, descricao, concluida } = req.body;

    if (!titulo || titulo.trim() === "") {
      return res.status(400).json({
        erro: "titulo é obrigatório",
      });
    }

    const resultado = await pool.query(
      `insert into tarefas (titulo, descricao, concluida)
       values ($1, $2, $3)
       returning id, titulo, descricao, concluida`,
      [titulo.trim(), descricao ?? "", concluida ?? false],
    );

    res.status(201).json({
      mensagem: "Tarefa cadastrada com sucesso",
      tarefa: resultado.rows[0],
    });
  } catch (erro) {
    console.error("Erro ao cadastrar tarefa:", erro);

    res.status(500).json({
      erro: "Erro interno do servidor...",
    });
  }
});

app.put("/tarefas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, concluida } = req.body;

    if (!titulo || titulo.trim() === "") {
      return res.status(400).json({
        erro: "titulo é obrigatório",
      });
    }

    const resultado = await pool.query(
      `update tarefas
       set titulo = $1, descricao = $2, concluida = $3
       where id = $4
       returning id, titulo, descricao, concluida`,
      [titulo.trim(), descricao ?? "", concluida ?? false, id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: "Tarefa não encontrada",
      });
    }

    res.json({
      mensagem: "Tarefa atualizada com sucesso",
      tarefa: resultado.rows[0],
    });
  } catch (erro) {
    console.error("Erro ao atualizar tarefa:", erro);

    res.status(500).json({
      erro: "Erro interno do servidor...",
    });
  }
});

app.delete("/tarefas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      "delete from tarefas where id = $1 returning id",
      [id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: "Tarefa não encontrada",
      });
    }

    res.json({
      mensagem: "Tarefa excluída com sucesso",
    });
  } catch (erro) {
    console.error("Erro ao excluir tarefa:", erro);

    res.status(500).json({
      erro: "Erro interno do servidor...",
    });
  }
});

app.listen(porta, () => {
  console.log(`Servidor rodando na porta ${porta} ...`);
});
