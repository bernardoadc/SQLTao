call defs.bat
node generate.js
node_modules\SchemaZen\SchemaZen.exe create --server %DEV_SERVER% --database %DEV_DB% --scriptDir extra/generated --overwrite
