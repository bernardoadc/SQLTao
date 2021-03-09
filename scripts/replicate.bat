call defs.bat
node generate.js
node_modules\SchemaZen\SchemaZen.exe create --server %PROD_SERVER% --database %PROD_DB% --scriptDir extra/generated
