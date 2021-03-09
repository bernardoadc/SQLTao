# SQL Exported DB

npm run ...

* **✔generate** = gera codigo final a executar (embutido em outros comandos)

## Prod to Dev

npm run ...

* **✔script** = puxa código do prod para replicar em uma base dev (roda generate automaticamente)
* **✔create** = executa codigos via SchemaZen no dev, criando base limpa

## Desenvolvimento

1) Desenvolve no SQL e roda **✔update** = puxa código do dev (aí versiona, etc)
2) Desenvolve por aqui e roda **❌sync** = atualiza o dev (compara e roda generate automaticamente)

> nao sobrescreve dados de tabelas que não as em `/data` (dados de teste)

## Dev to Prod

npm run ...

* **✔compare** = comparar com prod e gerar dif to run
  * ✔DDL
  * ❌dados
* **❌replicate** = executa codigos via SchemaZen no prod (roda generate primeiro automaticamente)

> não sobrescreve dados de tabelas que não as em `/data` (dados de usuários!)
