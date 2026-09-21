// Só para desenvolvimento/testes: expõe o protocolo HTTP do Neon (/sql) sobre um Postgres local.
// Uso: LOCAL_PG_URL=postgres://dev@127.0.0.1:54329/viagem node scripts/dev-neon-proxy.mjs
import http from "node:http";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.LOCAL_PG_URL });
const raw = { getTypeParser: () => (v) => v };

http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    res.setHeader("content-type", "application/json");
    try {
      const { query, params } = JSON.parse(body);
      const r = await pool.query({ text: query, values: params, rowMode: "array", types: raw });
      res.end(JSON.stringify({
        command: r.command, rowCount: r.rowCount, rowAsArray: true, rows: r.rows,
        fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID, tableID: f.tableID, columnID: f.columnID, dataTypeSize: f.dataTypeSize, dataTypeModifier: f.dataTypeModifier, format: f.format })),
      }));
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ message: String(e.message), code: e.code }));
    }
  });
}).listen(Number(process.env.PORT || 54330), "127.0.0.1", () => console.log("neon proxy on", process.env.PORT || 54330));
